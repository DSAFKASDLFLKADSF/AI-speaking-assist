"""Extract speaking behavior metrics from audio and transcript."""

from __future__ import annotations

import logging
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Sequence

import librosa
import numpy as np

if TYPE_CHECKING:
    from whisper_transcribe import WhisperWord

logger = logging.getLogger(__name__)

FILLER_PATTERN = re.compile(
    r"\b(um+|uh+|er+|ah+|em+|hmm+|like|you know|i mean|sort of|kind of)\b",
    re.IGNORECASE,
)

DEFAULT_MIN_PAUSE_SECONDS = 0.3
DEFAULT_SILENCE_THRESHOLD_DB = -40.0
DEFAULT_FRAME_LENGTH = 2048
DEFAULT_HOP_LENGTH = 512


@dataclass(frozen=True)
class AudioFeatures:
    wpm: float
    pause_count: int
    longest_pause: float
    filler_count: int
    duration_seconds: float
    word_count: int


def _count_fillers(transcript: str) -> int:
    return len(FILLER_PATTERN.findall(transcript.strip()))


def _suffix_from_content_type(content_type: str | None) -> str:
    if not content_type:
        return ".webm"
    lowered = content_type.split(";")[0].strip().lower()
    mapping = {
        "audio/webm": ".webm",
        "audio/wav": ".wav",
        "audio/x-wav": ".wav",
        "audio/mpeg": ".mp3",
        "audio/mp3": ".mp3",
        "audio/mp4": ".m4a",
        "audio/ogg": ".ogg",
    }
    return mapping.get(lowered, ".webm")


def _estimate_duration_seconds(
    audio_bytes: bytes | None,
    word_count: int,
    duration_hint: float | None = None,
) -> float:
    if duration_hint and duration_hint > 0:
        return round(duration_hint, 2)
    if audio_bytes and len(audio_bytes) > 0:
        # Rough estimate for compressed browser speech (webm/opus).
        return max(1.0, round(len(audio_bytes) / 12_000, 2))
    return max(1.0, round(word_count * 0.35, 2))


def _fallback_features(
    transcript: str,
    *,
    audio_bytes: bytes | None = None,
    duration_hint: float | None = None,
) -> AudioFeatures:
    text = transcript.strip()
    tokens = [t for t in text.split() if t]
    word_count = len(tokens)
    filler_count = _count_fillers(text)
    duration_seconds = _estimate_duration_seconds(
        audio_bytes, word_count, duration_hint
    )
    duration_min = duration_seconds / 60.0
    wpm = round(word_count / duration_min, 1) if word_count else 0.0

    punctuation_pauses = len(re.findall(r"[,;:.!?…]", text))
    pause_count = max(0, punctuation_pauses + filler_count)
    longest_pause = round(min(duration_seconds * 0.4, max(0.3, filler_count * 0.5)), 2)

    logger.warning(
        "Using transcript-based audio metrics fallback "
        "(webm decode unavailable — install ffmpeg for full Librosa analysis)."
    )

    return AudioFeatures(
        wpm=wpm,
        pause_count=pause_count,
        longest_pause=longest_pause,
        filler_count=filler_count,
        duration_seconds=duration_seconds,
        word_count=word_count,
    )


def _try_ffmpeg_to_wav(src: Path) -> Path | None:
    if not shutil.which("ffmpeg"):
        return None

    fd, out_name = tempfile.mkstemp(suffix=".wav")
    import os

    os.close(fd)
    out_path = Path(out_name)

    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(src),
                "-ac",
                "1",
                "-ar",
                "16000",
                str(out_path),
            ],
            check=True,
            capture_output=True,
            timeout=60,
        )
        return out_path
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, OSError) as exc:
        logger.debug("ffmpeg conversion failed: %s", exc)
        out_path.unlink(missing_ok=True)
        return None


def _load_audio_bytes(
    audio: bytes,
    *,
    suffix: str,
    sample_rate: int | None,
) -> tuple[np.ndarray, int, list[Path]]:
    """Load raw bytes; returns waveform and temp paths to clean up."""
    temp_paths: list[Path] = []

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio)
        src_path = Path(tmp.name)
    temp_paths.append(src_path)

    decode_error: Exception | None = None
    try:
        y, sr = librosa.load(src_path, sr=sample_rate, mono=True)
        return y, sr, temp_paths
    except Exception as exc:
        decode_error = exc
        logger.debug("librosa load failed for %s: %s", suffix, exc)

    wav_path = _try_ffmpeg_to_wav(src_path)
    if wav_path is not None:
        temp_paths.append(wav_path)
        try:
            y, sr = librosa.load(wav_path, sr=sample_rate, mono=True)
            return y, sr, temp_paths
        except Exception as exc:
            decode_error = exc
            logger.debug(
                "librosa load failed after ffmpeg for %s: %s", suffix, exc
            )

    if decode_error is not None:
        raise decode_error
    raise RuntimeError("Failed to decode audio bytes")


def _load_audio(
    audio: str | Path | bytes | np.ndarray,
    *,
    sample_rate: int | None = None,
    suffix: str = ".webm",
) -> tuple[np.ndarray, int, list[Path]]:
    """
    Load mono audio for analysis.

    Returns (waveform, sr, temp_paths). Caller must unlink temp_paths when set.
    """
    if isinstance(audio, np.ndarray):
        sr = sample_rate or 16_000
        return audio, sr, []

    if isinstance(audio, bytes):
        return _load_audio_bytes(audio, suffix=suffix, sample_rate=sample_rate)

    path = Path(audio)
    y, sr = librosa.load(path, sr=sample_rate, mono=True)
    return y, sr, []


def _detect_pauses_from_audio(
    y: np.ndarray,
    sr: int,
    *,
    min_pause_duration: float = DEFAULT_MIN_PAUSE_SECONDS,
    silence_threshold_db: float = DEFAULT_SILENCE_THRESHOLD_DB,
    frame_length: int = DEFAULT_FRAME_LENGTH,
    hop_length: int = DEFAULT_HOP_LENGTH,
) -> list[float]:
    """Return pause durations (seconds) detected from low-energy regions."""
    if y.size == 0:
        return []

    rms = librosa.feature.rms(
        y=y, frame_length=frame_length, hop_length=hop_length
    )[0]
    if rms.size == 0:
        return []

    max_rms = float(np.max(rms))
    if max_rms <= 0:
        return []

    db = librosa.amplitude_to_db(rms, ref=max_rms)
    silent = db < silence_threshold_db
    times = librosa.frames_to_time(
        np.arange(len(silent)), sr=sr, hop_length=hop_length
    )

    pauses: list[float] = []
    in_pause = False
    pause_start = 0.0

    for idx, is_silent in enumerate(silent):
        current_time = float(times[idx])
        if is_silent and not in_pause:
            pause_start = current_time
            in_pause = True
        elif not is_silent and in_pause:
            duration = current_time - pause_start
            if duration >= min_pause_duration:
                pauses.append(duration)
            in_pause = False

    if in_pause and len(times) > 0:
        duration = float(times[-1]) - pause_start
        if duration >= min_pause_duration:
            pauses.append(duration)

    return pauses


def _detect_pauses_from_word_gaps(
    words: Sequence["WhisperWord"],
    *,
    min_pause_duration: float = DEFAULT_MIN_PAUSE_SECONDS,
) -> list[float]:
    """Infer pauses from Whisper word timestamps when available."""
    pauses: list[float] = []
    timed = [w for w in words if w.start is not None and w.end is not None]
    if len(timed) < 2:
        return pauses

    for prev, curr in zip(timed, timed[1:]):
        gap = float(curr.start) - float(prev.end)  # type: ignore[arg-type]
        if gap >= min_pause_duration:
            pauses.append(gap)

    return pauses


def analyze_audio_features(
    audio: str | Path | bytes | np.ndarray,
    transcript: str,
    *,
    words: Sequence["WhisperWord"] | None = None,
    sample_rate: int | None = None,
    content_type: str | None = None,
    duration_hint: float | None = None,
    min_pause_duration: float = DEFAULT_MIN_PAUSE_SECONDS,
    silence_threshold_db: float = DEFAULT_SILENCE_THRESHOLD_DB,
) -> AudioFeatures:
    """
    Analyze speaking features: WPM, pauses, longest pause, and filler words.

    Falls back to transcript-based estimates when webm/opus cannot be decoded
    (common on Windows without ffmpeg in PATH).
    """
    text = transcript.strip()
    audio_bytes = audio if isinstance(audio, bytes) else None
    suffix = _suffix_from_content_type(content_type)

    temp_paths: list[Path] = []
    try:
        y, sr, temp_paths = _load_audio(
            audio,
            sample_rate=sample_rate,
            suffix=suffix,
        )
    except Exception as exc:
        logger.warning("Audio decode failed (%s), using fallback metrics.", exc)
        return _fallback_features(
            transcript,
            audio_bytes=audio_bytes,
            duration_hint=duration_hint,
        )

    try:
        tokens = [t for t in text.split() if t]
        word_count = len(tokens)
        filler_count = _count_fillers(text)

        duration_seconds = float(librosa.get_duration(y=y, sr=sr))
        duration_seconds = max(duration_seconds, 0.1)

        audio_pauses = _detect_pauses_from_audio(
            y,
            sr,
            min_pause_duration=min_pause_duration,
            silence_threshold_db=silence_threshold_db,
        )
        if audio_pauses:
            pauses = audio_pauses
        elif words:
            pauses = _detect_pauses_from_word_gaps(
                words, min_pause_duration=min_pause_duration
            )
        else:
            pauses = []

        pause_count = len(pauses)
        longest_pause = round(max(pauses), 2) if pauses else 0.0

        duration_min = duration_seconds / 60.0
        wpm = round(word_count / duration_min, 1) if word_count else 0.0

        return AudioFeatures(
            wpm=wpm,
            pause_count=pause_count,
            longest_pause=longest_pause,
            filler_count=filler_count,
            duration_seconds=round(duration_seconds, 2),
            word_count=word_count,
        )
    finally:
        for path in temp_paths:
            path.unlink(missing_ok=True)
