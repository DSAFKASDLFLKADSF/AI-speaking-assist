"""Download remote audio files to local temporary storage."""

from __future__ import annotations

import os
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO
from urllib.parse import urlparse

import requests

DEFAULT_TIMEOUT = 60.0
CHUNK_SIZE = 1024 * 64


@dataclass(frozen=True)
class DownloadedAudio:
    """Metadata for an audio file saved on disk."""

    path: Path
    content_type: str | None
    file_size_bytes: int
    suffix: str

    def cleanup(self) -> None:
        """Remove the temporary file."""
        self.path.unlink(missing_ok=True)

    def read_bytes(self) -> bytes:
        return self.path.read_bytes()

    def open(self, mode: str = "rb") -> BinaryIO:
        return self.path.open(mode)


def _suffix_from_content_type(content_type: str | None) -> str:
    if not content_type:
        return ".bin"

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
    return mapping.get(lowered, ".bin")


def _suffix_from_url(url: str) -> str | None:
    path = urlparse(url).path
    if not path:
        return None
    suffix = Path(path).suffix.lower()
    if suffix in {".webm", ".wav", ".mp3", ".m4a", ".ogg", ".mp4"}:
        return suffix
    return None


def download_audio(
    url: str,
    *,
    timeout: float = DEFAULT_TIMEOUT,
    chunk_size: int = CHUNK_SIZE,
) -> DownloadedAudio:
    """
    Download audio from `url` into a temporary file.

    The caller is responsible for deleting the file via `DownloadedAudio.cleanup()`.
    """
    response = requests.get(
        url,
        stream=True,
        timeout=timeout,
        allow_redirects=True,
    )
    response.raise_for_status()

    content_type = response.headers.get("content-type")
    suffix = _suffix_from_content_type(content_type)
    if suffix == ".bin":
        url_suffix = _suffix_from_url(url)
        if url_suffix:
            suffix = url_suffix

    fd, temp_path = tempfile.mkstemp(suffix=suffix, prefix="audio_")
    file_size = 0

    try:
        with os.fdopen(fd, "wb") as temp_file:
            for chunk in response.iter_content(chunk_size=chunk_size):
                if not chunk:
                    continue
                temp_file.write(chunk)
                file_size += len(chunk)
    except Exception:
        os.unlink(temp_path)
        raise

    if file_size == 0:
        os.unlink(temp_path)
        raise ValueError("Downloaded audio file is empty.")

    return DownloadedAudio(
        path=Path(temp_path),
        content_type=content_type,
        file_size_bytes=file_size,
        suffix=suffix,
    )
