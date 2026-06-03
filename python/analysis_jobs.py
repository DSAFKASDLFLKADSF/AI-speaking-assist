"""In-memory async analysis job store."""

from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Literal

JobKind = Literal["listen_repeat", "interview"]
JobStatus = Literal["pending", "running", "done", "failed"]

JOB_TTL_SECONDS = 3600


@dataclass
class AnalysisJob:
    id: str
    kind: JobKind
    status: JobStatus
    request: dict[str, Any]
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    error: str | None = None
    result: dict[str, Any] | None = None
    client_result: dict[str, Any] | None = None


class AnalysisJobStore:
    def __init__(self) -> None:
        self._jobs: dict[str, AnalysisJob] = {}
        self._lock = asyncio.Lock()

    async def create(self, kind: JobKind, request: dict[str, Any]) -> AnalysisJob:
        async with self._lock:
            self._purge_expired_locked()
            job = AnalysisJob(
                id=str(uuid.uuid4()),
                kind=kind,
                status="pending",
                request=request,
            )
            self._jobs[job.id] = job
            return job

    async def get(self, job_id: str) -> AnalysisJob | None:
        async with self._lock:
            self._purge_expired_locked()
            return self._jobs.get(job_id)

    async def mark_running(self, job_id: str) -> None:
        async with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return
            job.status = "running"
            job.updated_at = time.time()

    async def mark_done(self, job_id: str, result: dict[str, Any]) -> None:
        async with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return
            job.status = "done"
            job.result = result
            job.updated_at = time.time()

    async def mark_failed(self, job_id: str, error: str) -> None:
        async with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return
            job.status = "failed"
            job.error = error
            job.updated_at = time.time()

    async def set_client_result(self, job_id: str, client_result: dict[str, Any]) -> bool:
        async with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return False
            job.client_result = client_result
            job.updated_at = time.time()
            return True

    def _purge_expired_locked(self) -> None:
        cutoff = time.time() - JOB_TTL_SECONDS
        expired = [job_id for job_id, job in self._jobs.items() if job.created_at < cutoff]
        for job_id in expired:
            del self._jobs[job_id]


job_store = AnalysisJobStore()
