"""Zhipu GLM client (OpenAI-compatible API) for TOEFL scoring."""

from __future__ import annotations

import json
import logging
import os
import re
import time
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
DEFAULT_MODEL = "glm-4.7-flashx"
DEFAULT_TIMEOUT = float(os.getenv("GLM_TIMEOUT_SECONDS", "120"))
DEFAULT_MAX_OUTPUT_TOKENS = int(os.getenv("GLM_MAX_OUTPUT_TOKENS", "8192"))
GLM_REQUEST_RETRIES = 4
GLM_RATE_LIMIT_BASE_DELAY = 2.0
GLM_TIMEOUT_RETRY_DELAY = 3.0

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
    transcript_segments: list[dict[str, Any]] | None = None
    pace_feedback: dict[str, str] | None = None
    pronunciation_feedback: dict[str, str] | None = None

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


def _normalize_issue_block(
    raw: Any, *, with_knowledge_point: bool = False
) -> dict[str, str] | None:
    if not isinstance(raw, dict):
        return None
    improvement = str(
        raw.get("whatNeedsImprovement") or raw.get("improvement") or ""
    ).strip()
    why = str(raw.get("whyItMatters") or "").strip()
    if not improvement and not why:
        return None
    block: dict[str, str] = {
        "whatNeedsImprovement": improvement,
        "whyItMatters": why,
    }
    if with_knowledge_point:
        kp = str(raw.get("knowledgePoint") or "").strip()
        if kp:
            block["knowledgePoint"] = kp
    return block


def _normalize_delivery_block(raw: Any) -> dict[str, str] | None:
    if not isinstance(raw, dict):
        return None
    summary = str(raw.get("summary") or raw.get("content") or "").strip()
    suggestion = str(raw.get("suggestion") or "").strip()
    if not summary and not suggestion:
        return None
    return {"summary": summary, "suggestion": suggestion}


def _normalize_transcript_segments(raw: Any) -> list[dict[str, Any]]:
    segments_raw: list[Any] = []
    if isinstance(raw, dict):
        inner = raw.get("segments")
        if isinstance(inner, list):
            segments_raw = inner
    elif isinstance(raw, list):
        segments_raw = raw

    segments: list[dict[str, Any]] = []
    for item in segments_raw:
        if not isinstance(item, dict):
            continue
        text = str(item.get("text") or "").strip()
        if not text:
            continue
        has_issue = bool(item.get("hasIssue"))
        topic = _normalize_issue_block(item.get("topicDevelopment"))
        grammar = _normalize_issue_block(
            item.get("grammarVocabulary"), with_knowledge_point=True
        )
        concise = _normalize_issue_block(item.get("conciseness"))
        improved = str(item.get("improvedVersion") or "").strip()

        if topic or grammar or concise:
            has_issue = True

        seg: dict[str, Any] = {"text": text, "hasIssue": has_issue}
        if topic:
            seg["topicDevelopment"] = topic
        if grammar:
            seg["grammarVocabulary"] = grammar
        if concise:
            seg["conciseness"] = concise
        if has_issue and improved:
            seg["improvedVersion"] = improved
        segments.append(seg)
    return segments


def _legacy_spans_to_segments(spans: list[dict[str, str]]) -> list[dict[str, Any]]:
    """Convert old transcriptReview.spans into minimal segment format."""
    segments: list[dict[str, Any]] = []
    for span in spans:
        text = str(span.get("text") or "").strip()
        if not text:
            continue
        kind = str(span.get("kind") or "improvement")
        note = str(span.get("note") or "").strip()
        if kind == "strong":
            segments.append({"text": text, "hasIssue": False})
            continue
        seg: dict[str, Any] = {"text": text, "hasIssue": True, "improvedVersion": ""}
        if kind == "grammar":
            seg["grammarVocabulary"] = {
                "whatNeedsImprovement": note or "Review this phrase for grammar.",
                "whyItMatters": "Grammar errors can make your meaning harder to follow.",
                "knowledgePoint": "",
            }
        else:
            seg["topicDevelopment"] = {
                "whatNeedsImprovement": note or "This part could be clearer.",
                "whyItMatters": "Clearer development helps the listener follow your answer.",
            }
        segments.append(seg)
    return segments


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


def _thinking_disabled() -> bool:
    raw = os.getenv("GLM_THINKING", "disabled").strip().lower()
    return raw not in ("enabled", "true", "1", "on")


def _build_completion_kwargs(model: str) -> dict[str, Any]:
    """Fast-path options: disable thinking, cap output length."""
    kwargs: dict[str, Any] = {
        "model": model,
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
    }
    if DEFAULT_MAX_OUTPUT_TOKENS > 0:
        kwargs["max_tokens"] = DEFAULT_MAX_OUTPUT_TOKENS
    if _thinking_disabled():
        kwargs["extra_body"] = {"thinking": {"type": "disabled"}}
    return kwargs


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

    create_kwargs = _build_completion_kwargs(model)
    create_kwargs["messages"] = messages

    try:
        completion = None
        last_retryable: GlmApiError | None = None
        for attempt in range(GLM_REQUEST_RETRIES):
            try:
                completion = client.chat.completions.create(**create_kwargs)
                break
            except RateLimitError as exc:
                last_retryable = _map_openai_error(exc)
                if attempt >= GLM_REQUEST_RETRIES - 1:
                    raise last_retryable from exc
                delay = GLM_RATE_LIMIT_BASE_DELAY * (2**attempt)
                logger.warning(
                    "Zhipu rate limit — retry %s/%s in %.1fs",
                    attempt + 1,
                    GLM_REQUEST_RETRIES,
                    delay,
                )
                time.sleep(delay)
            except APITimeoutError as exc:
                last_retryable = _map_openai_error(exc)
                if attempt >= GLM_REQUEST_RETRIES - 1:
                    raise last_retryable from exc
                delay = GLM_TIMEOUT_RETRY_DELAY * (attempt + 1)
                logger.warning(
                    "Zhipu timeout (limit=%ss) — retry %s/%s in %.1fs",
                    timeout,
                    attempt + 1,
                    GLM_REQUEST_RETRIES,
                    delay,
                )
                time.sleep(delay)
        if completion is None:
            raise last_retryable or GlmApiError("Zhipu API request failed.")
    except GlmApiError:
        raise
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

    transcript_segments: list[dict[str, Any]] | None = None
    pace_feedback: dict[str, str] | None = None
    pronunciation_feedback: dict[str, str] | None = None

    if task == "interview":
        transcript_segments = _normalize_transcript_segments(
            parsed.get("transcriptFeedback")
        )
        if not transcript_segments and isinstance(parsed.get("transcriptReview"), dict):
            legacy_spans_raw = parsed["transcriptReview"].get("spans")
            if isinstance(legacy_spans_raw, list):
                legacy_spans = [
                    {
                        "text": str(s.get("text") or ""),
                        "kind": str(s.get("kind") or "improvement"),
                        "note": str(s.get("note") or ""),
                    }
                    for s in legacy_spans_raw
                    if isinstance(s, dict)
                ]
                transcript_segments = _legacy_spans_to_segments(legacy_spans)
        pace_feedback = _normalize_delivery_block(parsed.get("paceFeedback"))
        pronunciation_feedback = _normalize_delivery_block(
            parsed.get("pronunciationFeedback")
        )

    if not feedback.get("summary") and score_summary:
        feedback = {**feedback, "summary": score_summary}

    logger.info("Zhipu GLM scoring complete task=%s scores=%s", task, scores)

    return GlmScoreResult(
        scores=scores,
        feedback=feedback,
        score_summary=score_summary or None,
        model=model,
        transcript_segments=transcript_segments or None,
        pace_feedback=pace_feedback,
        pronunciation_feedback=pronunciation_feedback,
    )
