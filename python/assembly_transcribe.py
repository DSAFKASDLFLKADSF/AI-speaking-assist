"""AssemblyAI pre-recorded transcription (replaces Whisper when configured)."""

from __future__ import annotations

import logging
import os
import time
from pathlib import Path
from typing import Any, BinaryIO

import requests

from whisper_transcribe import (
    WhisperTranscription,
    WhisperTranscriptionError,
    WhisperWord,
)

logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = "https://api.assemblyai.com"
DEFAULT_SPEECH_MODELS = ["universal-2"]
DEFAULT_POLL_INTERVAL = 2.0
DEFAULT_TIMEOUT = 180.0
DEFAULT_LANGUAGE = "en"


class AssemblyTranscriptionError(WhisperTranscriptionError):
    """Raised when AssemblyAI transcription fails."""


def _get_config(
    api_key: str | None = None,
    base_url: str | None = None,
) -> tuple[str, str]:
    key = (api_key or os.getenv("ASSEMBLYAI_API_KEY") or "").strip()
    if not key:
        raise AssemblyTranscriptionError(
            "ASSEMBLYAI_API_KEY is not configured."
        )
    base = (base_url or os.getenv("ASSEMBLYAI_BASE_URL", DEFAULT_BASE_URL)).rstrip(
        "/"
    )
    return key, base


def _speech_models(models: list[str] | None = None) -> list[str]:
    if models:
        return models
    raw = os.getenv("ASSEMBLYAI_SPEECH_MODELS", "").strip()
    if not raw:
        return DEFAULT_SPEECH_MODELS
    return [m.strip() for m in raw.split(",") if m.strip()]


def _headers(api_key: str) -> dict[str, str]:
    return {"authorization": api_key}


def _upload_bytes(
    api_key: str,
    base_url: str,
    audio: bytes,
    *,
    timeout: float,
) -> str:
    response = requests.post(
        f"{base_url}/v2/upload",
        headers=_headers(api_key),
        data=audio,
        timeout=timeout,
    )
    if response.status_code >= 400:
        detail = response.text.strip() or response.reason
        raise AssemblyTranscriptionError(
            f"AssemblyAI upload failed ({response.status_code}): {detail}"
        )
    payload = response.json()
    upload_url = payload.get("upload_url")
    if not upload_url:
        raise AssemblyTranscriptionError("AssemblyAI upload returned no upload_url.")
    return str(upload_url)


def _submit_transcript(
    api_key: str,
    base_url: str,
    audio_url: str,
    *,
    language_code: str,
    timeout: float,
    speech_models: list[str] | None = None,
) -> str:
    body: dict[str, Any] = {
        "audio_url": audio_url,
        "speech_models": _speech_models(speech_models),
        "language_code": language_code,
    }
    response = requests.post(
        f"{base_url}/v2/transcript",
        headers={**_headers(api_key), "Content-Type": "application/json"},
        json=body,
        timeout=timeout,
    )
    if response.status_code >= 400:
        detail = response.text.strip() or response.reason
        raise AssemblyTranscriptionError(
            f"AssemblyAI transcript submit failed ({response.status_code}): {detail}"
        )
    payload = response.json()
    transcript_id = payload.get("id")
    if not transcript_id:
        raise AssemblyTranscriptionError("AssemblyAI returned no transcript id.")
    return str(transcript_id)


def _poll_transcript(
    api_key: str,
    base_url: str,
    transcript_id: str,
    *,
    poll_interval: float,
    timeout: float,
) -> dict[str, Any]:
    deadline = time.monotonic() + timeout
    url = f"{base_url}/v2/transcript/{transcript_id}"

    while time.monotonic() < deadline:
        response = requests.get(url, headers=_headers(api_key), timeout=30)
        if response.status_code >= 400:
            detail = response.text.strip() or response.reason
            raise AssemblyTranscriptionError(
                f"AssemblyAI poll failed ({response.status_code}): {detail}"
            )
        payload = response.json()
        status = payload.get("status")
        if status == "completed":
            return payload
        if status == "error":
            raise AssemblyTranscriptionError(
                f"AssemblyAI transcription error: {payload.get('error', 'unknown')}"
            )
        time.sleep(poll_interval)

    raise AssemblyTranscriptionError("AssemblyAI transcription timed out.")


def _parse_words(payload: dict[str, Any], transcript: str) -> list[WhisperWord]:
    words: list[WhisperWord] = []
    raw = payload.get("words")
    if isinstance(raw, list):
        for item in raw:
            if not isinstance(item, dict):
                continue
            text = str(item.get("text") or item.get("word") or "").strip()
            if not text:
                continue
            start_ms = item.get("start")
            end_ms = item.get("end")
            start = float(start_ms) / 1000.0 if start_ms is not None else None
            end = float(end_ms) / 1000.0 if end_ms is not None else None
            words.append(WhisperWord(word=text, start=start, end=end))
    if words:
        return words
    return [WhisperWord(word=t) for t in transcript.split() if t]


def _duration_seconds(payload: dict[str, Any]) -> float | None:
    audio_duration = payload.get("audio_duration")
    if audio_duration is not None:
        try:
            return float(audio_duration) / 1000.0
        except (TypeError, ValueError):
            pass
    return None


def assembly_transcribe_url(
    audio_url: str,
    *,
    language_code: str = DEFAULT_LANGUAGE,
    api_key: str | None = None,
    base_url: str | None = None,
    speech_models: list[str] | None = None,
    poll_interval: float = DEFAULT_POLL_INTERVAL,
    timeout: float = DEFAULT_TIMEOUT,
) -> WhisperTranscription:
    """Transcribe audio from a publicly accessible URL (e.g. Supabase signed URL)."""
    key, base = _get_config(api_key, base_url)
    logger.info("AssemblyAI transcribing url=%s", audio_url[:80])
    transcript_id = _submit_transcript(
        key,
        base,
        audio_url,
        language_code=language_code,
        timeout=timeout,
        speech_models=speech_models,
    )
    payload = _poll_transcript(
        key, base, transcript_id, poll_interval=poll_interval, timeout=timeout
    )
    transcript = str(payload.get("text") or "").strip()
    if not transcript:
        raise AssemblyTranscriptionError("AssemblyAI returned an empty transcript.")
    model_name = "+".join(_speech_models(speech_models))
    return WhisperTranscription(
        transcript=transcript,
        words=_parse_words(payload, transcript),
        language=payload.get("language_code") or language_code,
        duration=_duration_seconds(payload),
        model=f"assemblyai:{model_name}",
    )


def assembly_transcribe(
    audio: str | Path | bytes | BinaryIO,
    *,
    filename: str | None = None,
    content_type: str | None = None,
    language_code: str = DEFAULT_LANGUAGE,
    api_key: str | None = None,
    base_url: str | None = None,
    speech_models: list[str] | None = None,
    poll_interval: float = DEFAULT_POLL_INTERVAL,
    timeout: float = DEFAULT_TIMEOUT,
) -> WhisperTranscription:
    """
    Transcribe audio via AssemblyAI (upload bytes or use URL string/path).

    Environment:
      ASSEMBLYAI_API_KEY
      ASSEMBLYAI_BASE_URL (optional)
      ASSEMBLYAI_SPEECH_MODELS (optional, comma-separated, default universal-2)
    """
    key, base = _get_config(api_key, base_url)

    if isinstance(audio, str) and audio.startswith(("http://", "https://")):
        return assembly_transcribe_url(
            audio,
            language_code=language_code,
            api_key=key,
            base_url=base,
            speech_models=speech_models,
            poll_interval=poll_interval,
            timeout=timeout,
        )

    if isinstance(audio, bytes):
        audio_bytes = audio
    elif isinstance(audio, (str, Path)):
        audio_bytes = Path(audio).read_bytes()
    else:
        audio_bytes = audio.read()

    logger.info("AssemblyAI uploading audio bytes=%s", len(audio_bytes))
    upload_url = _upload_bytes(key, base, audio_bytes, timeout=timeout)
    return assembly_transcribe_url(
        upload_url,
        language_code=language_code,
        api_key=key,
        base_url=base,
        speech_models=speech_models,
        poll_interval=poll_interval,
        timeout=timeout,
    )
