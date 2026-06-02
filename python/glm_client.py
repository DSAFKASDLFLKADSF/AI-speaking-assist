"""Zhipu GLM client (OpenAI-compatible API) for TOEFL scoring."""

from __future__ import annotations

import json
import logging
import os
import re
from dataclasses import dataclass
from typing import Any

from openai import (
    APIConnectionError,
    APITimeoutError,
    AuthenticationError,
    BadRequestError,
    OpenAI,
    RateLimitError,
)

from toefl_rubric import ToeflScorePrompt

logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = "https://open.bigmodel.cn/api/paas/v4"
DEFAULT_MODEL = "glm-4.7-flash"
DEFAULT_TIMEOUT = 60.0

INTERVIEW_SCORE_KEYS = ("topic", "pace", "pronunciation", "grammar")
LISTEN_REPEAT_SCORE_KEY = "score"


class GlmApiError(Exception):
    """Raised when the GLM API call or response parsing fails."""

    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        error_code: str | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.error_code = error_code


@dataclass(frozen=True)
class GlmScoreResult:
    scores: dict[str, int]
    feedback: dict[str, Any]
    score_summary: str | None = None
    model: str = DEFAULT_MODEL

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "scores": self.scores,
            "feedback": self.feedback,
        }
        if self.score_summary:
            payload["scoreSummary"] = self.score_summary
        return payload


def _resolve_api_key(api_key: str | None) -> str:
    key = (api_key or os.getenv("ZHIPU_API_KEY") or os.getenv("GLM_API_KEY") or "").strip()
    if not key:
        raise GlmApiError(
            "ZHIPU_API_KEY (or GLM_API_KEY) is not configured."
        )
    return key


def _map_openai_error(exc: Exception) -> GlmApiError:
    """Map OpenAI SDK errors (used by Zhipu compatible API) to GlmApiError."""
    if isinstance(exc, AuthenticationError):
        logger.error("Zhipu API authentication failed — check ZHIPU_API_KEY.")
        return GlmApiError(
            "Zhipu API authentication failed. Check ZHIPU_API_KEY.",
            status_code=401,
            error_code="auth_error",
        )

    if isinstance(exc, RateLimitError):
        logger.warning("Zhipu API rate limit exceeded.")
        return GlmApiError(
            "Zhipu API rate limit exceeded. Please retry later.",
            status_code=429,
            error_code="rate_limit",
        )

    if isinstance(exc, APITimeoutError):
        logger.warning("Zhipu API request timed out.")
        return GlmApiError(
            "Zhipu API request timed out.",
            status_code=504,
            error_code="timeout",
        )

    if isinstance(exc, APIConnectionError):
        logger.error("Zhipu API connection error: %s", exc)
        return GlmApiError(
            "Unable to reach Zhipu API. Check network and GLM_BASE_URL.",
            status_code=502,
            error_code="connection_error",
        )

    if isinstance(exc, BadRequestError):
        detail = str(exc).strip() or "Invalid request to Zhipu API."
        logger.error("Zhipu API bad request: %s", detail)
        return GlmApiError(
            f"Zhipu API rejected the request: {detail}",
            status_code=400,
            error_code="bad_request",
        )

    status_code = getattr(exc, "status_code", None)
    message = str(exc).strip() or "Zhipu API request failed."
    logger.error("Zhipu API error (status=%s): %s", status_code, message)
    return GlmApiError(message, status_code=status_code or 502, error_code="api_error")


def _extract_messages(prompt: ToeflScorePrompt | dict[str, str]) -> list[dict[str, str]]:
    if isinstance(prompt, ToeflScorePrompt):
        return [
            {"role": "system", "content": prompt.system},
            {"role": "user", "content": prompt.user},
        ]

    system = prompt.get("system", "").strip()
    user = prompt.get("user", "").strip()
    if not user and "content" in prompt:
        user = str(prompt["content"]).strip()
    if not user:
        raise GlmApiError("prompt must include user content.")

    messages: list[dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": user})
    return messages


def _resolve_task(prompt: ToeflScorePrompt | dict[str, str]) -> str | None:
    if isinstance(prompt, ToeflScorePrompt):
        return prompt.task
    return prompt.get("task")  # type: ignore[return-value]


def _parse_json_content(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if not text:
        raise GlmApiError("GLM returned empty content.")

    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL | re.IGNORECASE)
    if fence:
        text = fence.group(1).strip()

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        raise GlmApiError(f"GLM returned invalid JSON: {exc}") from exc

    if not isinstance(parsed, dict):
        raise GlmApiError("GLM JSON root must be an object.")
    return parsed


def _clamp_score(value: Any) -> int:
    try:
        num = int(round(float(value)))
    except (TypeError, ValueError):
        return 1
    return max(1, min(5, num))


def _normalize_feedback(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        return {"summary": "", "sections": []}

    summary = str(raw.get("summary") or "").strip()
    sections_raw = raw.get("sections")
    sections: list[dict[str, str]] = []

    if isinstance(sections_raw, list):
        for item in sections_raw:
            if not isinstance(item, dict):
                continue
            title = str(item.get("title") or "").strip()
            content = str(item.get("content") or "").strip()
            if title or content:
                sections.append({"title": title, "content": content})

    return {"summary": summary, "sections": sections}


def _normalize_scores(parsed: dict[str, Any], task: str | None) -> dict[str, int]:
    if task == "listen_repeat":
        score = _clamp_score(parsed.get(LISTEN_REPEAT_SCORE_KEY))
        return {LISTEN_REPEAT_SCORE_KEY: score}

    scores = {
        key: _clamp_score(parsed.get(key))
        for key in INTERVIEW_SCORE_KEYS
    }
    if any(key in parsed for key in INTERVIEW_SCORE_KEYS):
        return scores

    # Fallback: single overall score → apply to all interview dimensions
    if LISTEN_REPEAT_SCORE_KEY in parsed:
        overall = _clamp_score(parsed[LISTEN_REPEAT_SCORE_KEY])
        return {key: overall for key in INTERVIEW_SCORE_KEYS}

    return scores


def call_glm(
    prompt: ToeflScorePrompt | dict[str, str],
    *,
    api_key: str | None = None,
    base_url: str = DEFAULT_BASE_URL,
    model: str = DEFAULT_MODEL,
    timeout: float = DEFAULT_TIMEOUT,
) -> GlmScoreResult:
    """
    Call Zhipu GLM (OpenAI-compatible) and return structured scores + feedback.

    Parameters
    ----------
    prompt:
        ``ToeflScorePrompt`` from ``get_toefl_score_prompt()``, or a dict with
        ``system`` / ``user`` keys.

    Returns
    -------
    GlmScoreResult
        ``scores`` — interview: topic/pace/pronunciation/grammar (1–5);
        listen_repeat: score (1–5).
        ``feedback`` — { summary, sections }.
    """
    messages = _extract_messages(prompt)
    task = _resolve_task(prompt)

    logger.info(
        "Calling Zhipu GLM model=%s task=%s base_url=%s",
        model,
        task,
        base_url.rstrip("/"),
    )

    client = OpenAI(
        api_key=_resolve_api_key(api_key),
        base_url=base_url.rstrip("/"),
        timeout=timeout,
    )

    try:
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.2,
        )
    except Exception as exc:
        raise _map_openai_error(exc) from exc

    raw_content = completion.choices[0].message.content if completion.choices else None
    if not raw_content:
        raise GlmApiError(
            "Zhipu API returned no message content.",
            status_code=502,
            error_code="empty_response",
        )

    logger.debug("Zhipu GLM raw response length=%d", len(raw_content))

    try:
        parsed = _parse_json_content(raw_content)
    except GlmApiError:
        logger.error("Failed to parse Zhipu GLM JSON response.")
        raise

    scores = _normalize_scores(parsed, task)
    feedback = _normalize_feedback(parsed.get("feedback"))
    score_summary = str(parsed.get("scoreSummary") or feedback.get("summary") or "").strip()

    if not feedback.get("summary") and score_summary:
        feedback = {**feedback, "summary": score_summary}

    logger.info("Zhipu GLM scoring complete task=%s scores=%s", task, scores)

    return GlmScoreResult(
        scores=scores,
        feedback=feedback,
        score_summary=score_summary or None,
        model=model,
    )
