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


def is_publicly_fetchable_url(url: str) -> bool:
    """True when a cloud API (e.g. AssemblyAI) can download this URL over the internet."""
    try:
        parsed = urlparse(url)
        host = (parsed.hostname or "").lower()
        if not host or parsed.scheme not in ("http", "https"):
            return False
        if host in ("localhost", "127.0.0.1", "[::1]", "0.0.0.0"):
            return False
        if host.endswith(".local"):
            return False
        if host.startswith("192.168.") or host.startswith("10."):
            return False
        if host.startswith("172."):
            parts = host.split(".")
            if len(parts) >= 2:
                try:
                    if 16 <= int(parts[1]) <= 31:
                        return False
                except ValueError:
                    pass
        return True
    except Exception:
        return False


def is_local_fetch_url(url: str) -> bool:
    """True for same-machine URLs that must not go through HTTP_PROXY."""
    try:
        host = (urlparse(url).hostname or "").lower()
        return host in ("localhost", "127.0.0.1", "[::1]", "0.0.0.0")
    except Exception:
        return False


def try_read_local_public_audio(url: str) -> tuple[bytes, str | None] | None:
    """
  Read /audio/* files from the repo public/ folder when Python runs beside Next.js.
  Avoids HTTP round-trips and proxy issues for benchmark sample audio.
  """
    try:
        parsed = urlparse(url)
        if not is_local_fetch_url(url):
            return None
        rel = parsed.path
        if not rel.startswith("/audio/"):
            return None
        repo_root = Path(__file__).resolve().parent.parent
        file_path = repo_root / "public" / rel.lstrip("/")
        if not file_path.is_file():
            return None
        suffix = file_path.suffix.lower()
        content_type = {
            ".mp3": "audio/mpeg",
            ".webm": "audio/webm",
            ".wav": "audio/wav",
            ".m4a": "audio/mp4",
            ".ogg": "audio/ogg",
        }.get(suffix)
        return file_path.read_bytes(), content_type
    except Exception:
        return None


def normalize_local_fetch_url(url: str) -> str:
    """Use 127.0.0.1 instead of localhost for same-machine HTTP fetches."""
    try:
        parsed = urlparse(url)
        host = (parsed.hostname or "").lower()
        if host not in ("localhost", "[::1]"):
            return url
        port = parsed.port
        if port:
            netloc = f"127.0.0.1:{port}"
        else:
            netloc = "127.0.0.1"
        return parsed._replace(netloc=netloc).geturl()
    except Exception:
        return url


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
    url = normalize_local_fetch_url(url)

    local = try_read_local_public_audio(url)
    if local is not None:
        audio_bytes, content_type = local
        suffix = _suffix_from_content_type(content_type)
        if suffix == ".bin":
            url_suffix = _suffix_from_url(url)
            if url_suffix:
                suffix = url_suffix
        fd, temp_path = tempfile.mkstemp(suffix=suffix, prefix="audio_")
        try:
            with os.fdopen(fd, "wb") as temp_file:
                temp_file.write(audio_bytes)
        except Exception:
            os.unlink(temp_path)
            raise
        return DownloadedAudio(
            path=Path(temp_path),
            content_type=content_type,
            file_size_bytes=len(audio_bytes),
            suffix=suffix,
        )

    request_kwargs: dict = {
        "stream": True,
        "timeout": timeout,
        "allow_redirects": True,
    }
    if is_local_fetch_url(url):
        # Bypass system HTTP_PROXY (e.g. Clash on 127.0.0.1:3213) for localhost.
        request_kwargs["proxies"] = {"http": None, "https": None}

    response = requests.get(url, **request_kwargs)
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
