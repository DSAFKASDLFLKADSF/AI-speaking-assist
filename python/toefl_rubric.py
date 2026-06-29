"""
2026 TOEFL Speaking rubric prompts for LLM scoring.

Tasks:
  - Virtual Interview (Take an Interview) — topic, pace, pronunciation, grammar (1–5)
  - Listen and Repeat — overall accuracy score (1–5) + dimension notes
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Literal

ToeflTask = Literal["interview", "listen_repeat"]
InterviewQuestionType = Literal[
    "personal_recall",
    "preference",
    "opinion",
    "policy_prediction",
]

INTERVIEW_JSON_SCHEMA = {
    "topic": "integer 1-5",
    "pace": "integer 1-5",
    "pronunciation": "integer 1-5",
    "grammar": "integer 1-5",
    "scoreSummary": "string, one sentence",
    "transcriptReview": {
        "spans": [
            {
                "text": "exact phrase copied from the transcript",
                "kind": "grammar | improvement | strong",
                "note": "brief note — for grammar/improvement include a corrected or better phrase",
            }
        ],
    },
    "feedback": {
        "summary": "string, one sentence",
        "sections": [
            {"title": "Topic Development | Delivery | Language Use", "content": "string"}
        ],
    },
}

LISTEN_REPEAT_JSON_SCHEMA = {
    "score": "integer 1-5",
    "scoreSummary": "string, one sentence",
    "feedback": {
        "summary": "string, one sentence",
        "sections": [
            {"title": "Pronunciation | Fluency | Suggestions", "content": "string"}
        ],
    },
}


@dataclass(frozen=True)
class ToeflScorePrompt:
    system: str
    user: str
    task: ToeflTask
    response_schema: dict[str, Any]


def _interview_system_prompt() -> str:
    return """You are a certified 2026 TOEFL iBT Speaking rater for the **Take an Interview** (Virtual Interview) task.

## Official task format (2026)
- The test-taker hears one interview question and responds immediately.
- **No preparation time.**
- **45 seconds** to respond (score what fits this window; do not penalize for not filling all 45s if the answer is complete).
- Spoken English only; score from the transcript (a proxy for the audio response).

## Scoring scale (strict — integers only)
Score each dimension **1–5** (not 0–4 ETS internal scale):

### topic — Topic Development & relevance
- **5**: Fully answers the question with a clear point, logical support, and at least one specific example; stays on topic.
- **4**: Answers the question with relevant ideas; minor gaps in support or specificity.
- **3**: Partially answers the question; ideas are relevant but underdeveloped or loosely organized.
- **2**: Limited relevance; vague or incomplete answer; hard to identify a main point.
- **1**: Does not answer the question, off-topic, or too little content to evaluate.

### pace — Delivery & fluency
- **5**: Natural conversational pace (~110–170 WPM); smooth flow; pauses feel intentional; easy to follow.
- **4**: Generally fluent; minor hesitations or uneven pacing; still clear.
- **3**: Understandable but choppy; frequent pauses/fillers OR noticeably slow/fast pace.
- **2**: Frequent breakdowns in flow; long silences; difficult to follow.
- **1**: Mostly fragmented or unintelligible delivery.

Use provided metrics (WPM, pause_count, longest_pause, filler_count) as evidence — do not invent audio details.

### pronunciation — Intelligibility
- **5**: Consistently clear; minor accent influence does not block meaning.
- **4**: Mostly clear; occasional unclear words or stress issues.
- **3**: Noticeable pronunciation issues but overall meaning comes through.
- **2**: Frequent unclear words; listener must strain to understand.
- **1**: Largely unintelligible.

### grammar — Language Use
- **5**: Effective grammar and word choice; errors are rare and do not obscure meaning.
- **4**: Good control; some errors but meaning remains clear.
- **3**: Limited range; errors sometimes obscure meaning or distract.
- **2**: Frequent errors; meaning often unclear.
- **1**: Severe limitations; cannot evaluate language use reliably.

## Question-type expectations
- **personal_recall**: Specific past/present experience; concrete details; clear sequence.
- **preference**: Clear preference early; reasons + example; compare briefly if helpful.
- **opinion**: Explicit stance; justified with reasons and example; acknowledge complexity when fair.
- **policy_prediction**: Forward-looking recommendation or prediction; practical and coherent.

## Rater rules
1. Score only from the transcript and supplied metrics — no assumptions about gender, background, or accent stereotypes.
2. Empty or near-empty transcript → all dimensions **1**.
3. Do not reward memorized templates without addressing the question.
4. Be consistent and strict; average responses cluster around **3**, strong around **4–5**, weak **1–2**.
5. Return **valid JSON only**, matching the required schema exactly. No markdown, no extra keys.
6. In `transcriptReview.spans`, quote **exact substrings** from the transcript (3–8 spans). Mark grammar errors, places to improve wording/development, and 1–2 strong phrases."""


def _listen_repeat_system_prompt() -> str:
    return """You are a certified 2026 TOEFL iBT Speaking rater for the **Listen and Repeat** task.

## Official task format (2026)
- The test-taker hears a short academic sentence/paragraph and repeats it aloud.
- **No preparation time**; one attempt per prompt.
- Score how accurately the response matches the **reference text** in content, pronunciation (as reflected in transcript alignment), and fluency.

## Scoring scale (strict — integer 1–5 overall)
- **5**: Nearly complete and accurate repetition; only trivial differences (articles, minor function words); smooth delivery.
- **4**: Strong match; a few content-word substitutions or omissions but meaning preserved; generally fluent.
- **3**: Partial match; several missing or wrong content words; listener can still infer the original.
- **2**: Poor match; many errors/omissions; original meaning largely lost.
- **1**: Minimal overlap with reference or unintelligible.

## Rater rules
1. Compare `transcript` to `reference_text` carefully (word choice, key nouns/verbs, word order).
2. Use `word_stats` if provided (correct, missing, replacement counts).
3. Do not penalize minor punctuation or capitalization in transcript.
4. Return **valid JSON only** with keys: score, scoreSummary, feedback { summary, sections }.
5. feedback.sections must include exactly: Pronunciation, Fluency, Suggestions."""


def _build_interview_user_payload(
    *,
    question: str,
    transcript: str,
    question_type: InterviewQuestionType | None,
    response_seconds: int,
    theme: str | None,
    metrics: dict[str, Any] | None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "task": "Virtual Interview",
        "exam": "TOEFL iBT Speaking 2026",
        "question": question,
        "transcript": transcript.strip() or "(empty or inaudible)",
        "response_seconds_limit": response_seconds,
        "required_output": INTERVIEW_JSON_SCHEMA,
    }
    if question_type:
        payload["question_type"] = question_type
    if theme:
        payload["theme"] = theme
    if metrics:
        payload["behavior_metrics"] = metrics
    return payload


def _build_listen_repeat_user_payload(
    *,
    reference_text: str,
    transcript: str,
    prompt_id: str | None,
    word_stats: dict[str, Any] | None,
    metrics: dict[str, Any] | None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "task": "Listen and Repeat",
        "exam": "TOEFL iBT Speaking 2026",
        "reference_text": reference_text.strip(),
        "transcript": transcript.strip() or "(empty or inaudible)",
        "required_output": LISTEN_REPEAT_JSON_SCHEMA,
    }
    if prompt_id:
        payload["prompt_id"] = prompt_id
    if word_stats:
        payload["word_stats"] = word_stats
    if metrics:
        payload["behavior_metrics"] = metrics
    return payload


def get_toefl_score_prompt(
    *,
    task: ToeflTask,
    transcript: str,
    question: str | None = None,
    reference_text: str | None = None,
    question_type: InterviewQuestionType | None = None,
    theme: str | None = None,
    prompt_id: str | None = None,
    response_seconds: int = 45,
    metrics: dict[str, Any] | None = None,
    word_stats: dict[str, Any] | None = None,
) -> ToeflScorePrompt:
    """
    Build strict 2026 TOEFL rubric prompts for LLM scoring.

    Parameters
    ----------
    task:
        ``interview`` (Virtual Interview) or ``listen_repeat``.
    transcript:
        Speech-to-text output of the test-taker response.
    question:
        Required for ``interview`` — the interview question text.
    reference_text:
        Required for ``listen_repeat`` — the model prompt to repeat.
    question_type:
        Optional interview question type for tighter rubric alignment.
    metrics:
        Optional dict with wpm, pause_count, longest_pause, filler_count, etc.
    word_stats:
        Optional listen-repeat alignment stats (correct, missing, replacement).
    """
    if task == "interview":
        if not question or not question.strip():
            raise ValueError("question is required for interview scoring.")
        system = _interview_system_prompt()
        user_payload = _build_interview_user_payload(
            question=question,
            transcript=transcript,
            question_type=question_type,
            response_seconds=response_seconds,
            theme=theme,
            metrics=metrics,
        )
        schema = INTERVIEW_JSON_SCHEMA
    else:
        if not reference_text or not reference_text.strip():
            raise ValueError("reference_text is required for listen_repeat scoring.")
        system = _listen_repeat_system_prompt()
        user_payload = _build_listen_repeat_user_payload(
            reference_text=reference_text,
            transcript=transcript,
            prompt_id=prompt_id,
            word_stats=word_stats,
            metrics=metrics,
        )
        schema = LISTEN_REPEAT_JSON_SCHEMA

    return ToeflScorePrompt(
        system=system,
        user=json.dumps(user_payload, ensure_ascii=False, indent=2),
        task=task,
        response_schema=schema,
    )


def get_toefl_score_messages(**kwargs: Any) -> list[dict[str, str]]:
    """OpenAI-compatible message list for chat completions."""
    prompt = get_toefl_score_prompt(**kwargs)
    return [
        {"role": "system", "content": prompt.system},
        {"role": "user", "content": prompt.user},
    ]
