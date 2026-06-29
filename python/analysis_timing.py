"""Wall-clock timing helpers for benchmark / profiling."""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any


@dataclass
class StageTimer:
    stages: list[dict[str, Any]] = field(default_factory=list)
    _started_at: float = field(default_factory=time.perf_counter)

    def mark(self, stage_id: str, label: str) -> None:
        now = time.perf_counter()
        elapsed = round(now - self._started_at, 2)
        self.stages.append(
            {
                "id": stage_id,
                "label": label,
                "seconds": elapsed,
            }
        )
        self._started_at = now

    def total_seconds(self) -> float:
        return round(sum(s["seconds"] for s in self.stages), 2)

    def to_list(self) -> list[dict[str, Any]]:
        return list(self.stages)
