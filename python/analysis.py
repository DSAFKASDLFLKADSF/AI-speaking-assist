"""Word-level comparison for Listen & Repeat scoring."""

from __future__ import annotations

import re
from typing import Literal

ComparisonStatus = Literal["correct", "missing", "replacement"]


def normalize_token(token: str) -> str:
    lowered = token.lower()
    lowered = re.sub(r"'s\b", "", lowered)
    return re.sub(r"[^\w]", "", lowered)


def tokenize(text: str) -> list[str]:
    return [t for t in text.strip().split() if t]


def build_word_comparison(original: str, user: str) -> list[dict]:
    original_tokens = tokenize(original)
    user_tokens = tokenize(user)
    m, n = len(original_tokens), len(user_tokens)

    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if normalize_token(original_tokens[i - 1]) == normalize_token(
                user_tokens[j - 1]
            ):
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])

    aligned: list[dict] = []
    i, j = m, n
    while i > 0 or j > 0:
        if (
            i > 0
            and j > 0
            and normalize_token(original_tokens[i - 1])
            == normalize_token(user_tokens[j - 1])
        ):
            aligned.append(
                {
                    "status": "correct",
                    "original": original_tokens[i - 1],
                    "user": user_tokens[j - 1],
                }
            )
            i -= 1
            j -= 1
        elif j > 0 and (i == 0 or dp[i][j - 1] >= dp[i - 1][j]):
            if i > 0 and dp[i - 1][j] == dp[i][j - 1]:
                aligned.append(
                    {
                        "status": "replacement",
                        "original": original_tokens[i - 1],
                        "user": user_tokens[j - 1],
                    }
                )
                i -= 1
                j -= 1
            else:
                aligned.append(
                    {
                        "status": "replacement",
                        "original": None,
                        "user": user_tokens[j - 1],
                    }
                )
                j -= 1
        elif i > 0:
            aligned.append(
                {
                    "status": "missing",
                    "original": original_tokens[i - 1],
                    "user": None,
                }
            )
            i -= 1

    aligned.reverse()
    return aligned


def compute_listen_repeat_score(words: list[dict]) -> int:
    original_count = sum(1 for w in words if w.get("original") is not None)
    if original_count == 0:
        return 1
    correct_count = sum(1 for w in words if w.get("status") == "correct")
    raw = round((correct_count / original_count) * 5)
    return max(1, min(5, raw))


def build_score_summary(words: list[dict]) -> str:
    correct = sum(1 for w in words if w.get("status") == "correct")
    missing = sum(1 for w in words if w.get("status") == "missing")
    replacement = sum(1 for w in words if w.get("status") == "replacement")

    if missing == 0 and replacement == 0:
        return "Excellent match with the model response."
    if missing > replacement:
        suffix = "" if missing == 1 else "s"
        return f"Good start. {missing} word{suffix} missing from the original."
    suffix = "" if replacement == 1 else "s"
    return f"{correct} words matched. Review {replacement} substitution{suffix}."


def build_feedback(words: list[dict], score: int) -> dict:
    missing_words = [
        w["original"]
        for w in words
        if w.get("status") == "missing" and w.get("original")
    ][:8]

    return {
        "summary": build_score_summary(words),
        "sections": [
            {
                "title": "Pronunciation",
                "content": (
                    "Your pronunciation aligned well with the model on key content words."
                    if not missing_words
                    else "Focus on clear articulation of content words."
                ),
            },
            {
                "title": "Fluency",
                "content": "Keep a steady pace similar to the model response.",
            },
            {
                "title": "Suggestions",
                "content": (
                    f"Practice these missed words/phrases: {', '.join(missing_words)}."
                    if missing_words
                    else f"Strong performance at {score}/5 — repeat once more for rhythm."
                ),
            },
        ],
    }
