"""OpenAI Whisper transcription via optional relay (中转) base URL."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, BinaryIO

import requests

DEFAULT_MODEL = "whisper-1"
DEFAULT_TIMEOUT = 120.0


@dataclass(frozen=True)
class WhisperWord:
    word: str
    start: float | None = None
    end: float | None = None


@dataclass(frozen=True)
class WhisperTranscription:
    transcript: str
    words: list[WhisperWord]
    language: str | None = None
    duration: float | None = None
    model: str = DEFAULT_MODEL


class WhisperTranscriptionError(Exception):
    """Raised when the Whisper relay/API call fails."""


def _get_config(
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
) -> tuple[str, str, str]:
    resolved_key = (api_key or os.getenv("OPENAI_API_KEY", "")).strip()
    if not resolved_key:
        raise WhisperTranscriptionError(
            "OPENAI_API_KEY is not configured."
        )

    resolved_base = (
        base_url or os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    ).strip().rstrip("/")
    resolved_model = (
        model or os.getenv("WHISPER_MODEL", DEFAULT_MODEL)
    ).strip() or DEFAULT_MODEL
    return resolved_key, resolved_base, resolved_model


def _guess_filename(path: Path | None, content_type: str | None) -> str:
    if path and path.suffix:
        return path.name
    if content_type:
        lowered = content_type.split(";")[0].strip().lower()
        ext_map = {
            "audio/webm": "webm",
            "audio/wav": "wav",
            "audio/x-wav": "wav",
            "audio/mpeg": "mp3",
            "audio/mp4": "m4a",
            "audio/ogg": "ogg",
        }
        ext = ext_map.get(lowered, "webm")
        return f"recording.{ext}"
    return "recording.webm"


def _parse_words(payload: dict[str, Any], transcript: str) -> list[WhisperWord]:
    words: list[WhisperWord] = []

    raw_words = payload.get("words")
    if isinstance(raw_words, list) and raw_words:
        for item in raw_words:
            if not isinstance(item, dict):
                continue
            text = str(item.get("word") or item.get("text") or "").strip()
            if not text:
                continue
            words.append(
                WhisperWord(
                    word=text,
                    start=_as_float(item.get("start")),
                    end=_as_float(item.get("end")),
                )
            )
        if words:
            return words

    for segment in payload.get("segments") or []:
        if not isinstance(segment, dict):
            continue
        segment_words = segment.get("words")
        if not isinstance(segment_words, list):
            continue
        for item in segment_words:
            if not isinstance(item, dict):
                continue
            text = str(item.get("word") or item.get("text") or "").strip()
            if not text:
                continue
            words.append(
                WhisperWord(
                    word=text,
                    start=_as_float(item.get("start")),
                    end=_as_float(item.get("end")),
                )
            )

    if words:
        return words

    return [WhisperWord(word=token) for token in transcript.split() if token]


def _as_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _build_form_fields(model: str, language: str) -> dict[str, str]:
    fields: dict[str, str] = {
        "model": model,
        "language": language,
        "response_format": "verbose_json",
    }

    # Word timestamps — supported by newer transcribe models; ignored by whisper-1 relays.
    if model != "whisper-1":
        fields["timestamp_granularities[]"] = "word"

    return fields


def whisper_transcribe(
    audio: str | Path | bytes | BinaryIO,
    *,
    filename: str | None = None,
    content_type: str | None = None,
    language: str = "en",
    model: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    timeout: float = DEFAULT_TIMEOUT,
) -> WhisperTranscription:
    """
    Transcribe audio through an OpenAI-compatible Whisper endpoint (supports relay base URL).

    Environment:
      OPENAI_API_KEY   — API key
      OPENAI_BASE_URL  — relay base URL (default https://api.openai.com/v1)
      WHISPER_MODEL    — default whisper-1

    Returns transcript text and word list (with timestamps when the API provides them).
    """
    api_key, base_url, chosen_model = _get_config(api_key, base_url, model)

    path: Path | None = None
    file_handle: BinaryIO | None = None
    should_close = False

    try:
        if isinstance(audio, (str, Path)):
            path = Path(audio)
            file_handle = path.open("rb")
            should_close = True
            upload_name = filename or _guess_filename(path, content_type)
        elif isinstance(audio, bytes):
            from io import BytesIO

            file_handle = BytesIO(audio)
            upload_name = filename or _guess_filename(None, content_type)
        else:
            file_handle = audio
            upload_name = filename or _guess_filename(None, content_type)

        headers = {"Authorization": f"Bearer {api_key}"}
        files = {
            "file": (
                upload_name,
                file_handle,
                content_type or "application/octet-stream",
            )
        }
        data = _build_form_fields(chosen_model, language)

        response = requests.post(
            f"{base_url}/audio/transcriptions",
            headers=headers,
            files=files,
            data=data,
            timeout=timeout,
        )

        if response.status_code >= 400:
            detail = response.text.strip() or response.reason
            raise WhisperTranscriptionError(
                f"Whisper API error ({response.status_code}): {detail}"
            )

        payload = response.json()
        if not isinstance(payload, dict):
            raise WhisperTranscriptionError("Whisper API returned invalid JSON.")

        transcript = str(payload.get("text") or "").strip()
        if not transcript:
            raise WhisperTranscriptionError("Whisper API returned an empty transcript.")

        words = _parse_words(payload, transcript)

        return WhisperTranscription(
            transcript=transcript,
            words=words,
            language=payload.get("language"),
            duration=_as_float(payload.get("duration")),
            model=chosen_model,
        )
    except requests.RequestException as exc:
        raise WhisperTranscriptionError(f"Whisper request failed: {exc}") from exc
    finally:
        if should_close and file_handle is not None:
            file_handle.close()


def whisper_transcribe_to_dict(
    audio: str | Path | bytes | BinaryIO,
    **kwargs: Any,
) -> dict[str, Any]:
    """Same as whisper_transcribe but returns a plain dict for JSON APIs."""
    result = whisper_transcribe(audio, **kwargs)
    return {
        "transcript": result.transcript,
        "words": [
            {
                "word": w.word,
                "start": w.start,
                "end": w.end,
            }
            for w in result.words
        ],
        "language": result.language,
        "duration": result.duration,
        "model": result.model,
    }
