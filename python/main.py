"""
AI Speaking Trainer — Python speech analysis service.

Run locally:
  cd python
  pip install -r requirements.txt
  uvicorn main:app --reload --port 8000

Next.js expects:
  POST /jobs/listen-repeat  → { job_id, status }
  POST /jobs/interview      → { job_id, status }
  GET  /jobs/{job_id}       → poll status / result
  POST /analyze/listen-repeat  (sync, backward compatible)
  POST /analyze/interview      (sync, backward compatible)
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
from typing import Annotated, Literal

import requests
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import AliasChoices, BaseModel, Field, HttpUrl, ValidationError
from pydantic_settings import BaseSettings

from analysis import (
    build_word_comparison,
    compute_listen_repeat_score,
)
from audio_features import AudioFeatures, analyze_audio_features
from audio_utils import download_audio
from glm_client import DEFAULT_BASE_URL, DEFAULT_MODEL, GlmApiError, call_glm
from toefl_rubric import ToeflScorePrompt, get_toefl_score_prompt
from assembly_transcribe import (
    AssemblyTranscriptionError,
    assembly_transcribe,
    assembly_transcribe_url,
)
from whisper_transcribe import (
    WhisperTranscription,
    WhisperTranscriptionError,
    whisper_transcribe,
)
from neural_tts import DEFAULT_RATE, DEFAULT_VOICE, synthesize_cached
from analysis_jobs import AnalysisJob, job_store

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------


class Settings(BaseSettings):
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    openai_base_url: str = Field(
        default="https://api.openai.com/v1",
        alias="OPENAI_BASE_URL",
    )
    whisper_model: str = Field(default="whisper-1", alias="WHISPER_MODEL")
    assemblyai_api_key: str | None = Field(default=None, alias="ASSEMBLYAI_API_KEY")
    assemblyai_base_url: str = Field(
        default="https://api.assemblyai.com",
        alias="ASSEMBLYAI_BASE_URL",
    )
    assemblyai_speech_models: str = Field(
        default="universal-2",
        alias="ASSEMBLYAI_SPEECH_MODELS",
    )
    api_key: str | None = Field(default=None, alias="PYTHON_SPEECH_API_KEY")
    cors_origins: str = Field(
        default="http://localhost:3000",
        alias="CORS_ORIGINS",
    )
    dev_echo_reference: bool = Field(
        default=True,
        alias="DEV_ECHO_REFERENCE",
        description="When true and Whisper is missing, Interview uses a placeholder transcript only (not Listen & Repeat).",
    )
    zhipu_api_key: str | None = Field(default=None, alias="ZHIPU_API_KEY")
    glm_api_key: str | None = Field(default=None, alias="GLM_API_KEY")
    glm_base_url: str = Field(default=DEFAULT_BASE_URL, alias="GLM_BASE_URL")
    glm_model: str = Field(
        default=DEFAULT_MODEL,
        validation_alias=AliasChoices("GLM_MODEL", "MODEL_NAME"),
    )
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

logger = logging.getLogger("ai-speaking-trainer")

WHISPER_PLACEHOLDER_KEYS = frozenset(
    {"你的OpenAIKey", "your-openai-key", "your_openai_key", "sk-..."}
)


def is_whisper_configured() -> bool:
    """True when OPENAI_API_KEY looks like a real ASCII API key (not a placeholder)."""
    key = (settings.openai_api_key or "").strip()
    if not key:
        return False
    if key in WHISPER_PLACEHOLDER_KEYS:
        return False
    if key.startswith("your-") or "你的" in key:
        return False
    try:
        key.encode("latin-1")
    except UnicodeEncodeError:
        return False
    return True


def is_assemblyai_configured() -> bool:
    return bool((settings.assemblyai_api_key or "").strip())


def is_transcription_configured() -> bool:
    return is_assemblyai_configured() or is_whisper_configured()


def configure_logging() -> None:
    level = settings.log_level.upper()
    if level not in logging._nameToLevel:
        level = "INFO"

    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        stream=sys.stdout,
        force=True,
    )
    logger.setLevel(level)


configure_logging()

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class FeedbackSection(BaseModel):
    title: str
    content: str


class FeedbackBlock(BaseModel):
    summary: str
    sections: list[FeedbackSection]


class ComparisonWord(BaseModel):
    status: Literal["correct", "missing", "replacement"]
    original: str | None = None
    user: str | None = None


class ListenRepeatRequest(BaseModel):
    audio_url: HttpUrl
    reference_text: str = Field(min_length=1)
    prompt_id: str | None = None
    storage_path: str | None = None


class ListenRepeatResponse(BaseModel):
    transcript: str
    score: int = Field(ge=1, le=5)
    score_summary: str
    words: list[ComparisonWord]
    feedback: FeedbackBlock
    duration_seconds: float | None = None
    mime_type: str | None = None
    file_size_bytes: int | None = None
    delivery_score: float | None = Field(default=None, ge=0, le=4)
    language_use_score: float | None = Field(default=None, ge=0, le=4)
    topic_development_score: float | None = Field(default=None, ge=0, le=4)
    model: str = "python-api"


class InterviewRequest(BaseModel):
    audio_url: HttpUrl
    prompt: str = Field(min_length=1)
    question_id: str | None = None
    storage_path: str | None = None
    response_seconds: int = Field(default=45, ge=1, le=120)
    duration_ms: int = Field(default=0, ge=0)


class InterviewScores(BaseModel):
    topic: int = Field(ge=1, le=5)
    pace: int = Field(ge=1, le=5)
    pronunciation: int = Field(ge=1, le=5)
    grammar: int = Field(ge=1, le=5)


class BehaviorMetrics(BaseModel):
    speaking_rate_wpm: float = Field(ge=0)
    pause_count: int = Field(ge=0)
    filler_word_count: int = Field(ge=0)
    longest_pause_seconds: float = Field(ge=0)


class InterviewResponse(BaseModel):
    transcript: str
    scores: InterviewScores
    score_summary: str
    metrics: BehaviorMetrics
    feedback: FeedbackBlock
    model: str = "python-api"


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str = "ai-speaking-trainer-python"


class JobCreatedResponse(BaseModel):
    job_id: str
    status: Literal["pending"] = "pending"


class JobStatusResponse(BaseModel):
    job_id: str
    kind: Literal["listen_repeat", "interview"]
    status: Literal["pending", "running", "done", "failed"]
    error: str | None = None
    result: dict | None = None
    client_result: dict | None = None
    request: dict | None = None


class JobClientResultRequest(BaseModel):
    client_result: dict


# ---------------------------------------------------------------------------
# Auth (optional Bearer token)
# ---------------------------------------------------------------------------


async def verify_api_key(
    authorization: Annotated[str | None, Header()] = None,
) -> None:
    if not settings.api_key:
        return
    expected = f"Bearer {settings.api_key}"
    if authorization != expected:
        logger.warning("Unauthorized API request")
        raise HTTPException(status_code=401, detail="Invalid or missing API key.")


# ---------------------------------------------------------------------------
# Error helpers
# ---------------------------------------------------------------------------


def http_exception_from_glm(exc: GlmApiError) -> HTTPException:
    status = exc.status_code or 502
    if status == 401:
        detail = "Zhipu API authentication failed. Check ZHIPU_API_KEY."
    elif status == 429:
        detail = "Zhipu API rate limit exceeded. Please retry later."
    elif status == 504:
        detail = "Zhipu API request timed out."
    else:
        detail = str(exc)

    logger.error(
        "Zhipu GLM error status=%s code=%s detail=%s",
        status,
        exc.error_code,
        detail,
    )
    return HTTPException(status_code=status, detail=detail)


def handle_unexpected_error(endpoint: str, exc: Exception) -> HTTPException:
    logger.exception("%s failed with unexpected error", endpoint)
    return HTTPException(
        status_code=500,
        detail="Internal analysis error. Please try again later.",
    )


# ---------------------------------------------------------------------------
# Speech helpers
# ---------------------------------------------------------------------------


async def fetch_audio(audio_url: str) -> tuple[bytes, str | None, int | None]:
    logger.info("Downloading audio url=%s", audio_url)
    try:
        downloaded = await asyncio.to_thread(download_audio, audio_url)
    except requests.RequestException as exc:
        logger.error("Audio download failed url=%s error=%s", audio_url, exc)
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch audio: {exc}",
        ) from exc
    except ValueError as exc:
        logger.warning("Invalid audio download url=%s error=%s", audio_url, exc)
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    try:
        logger.info(
            "Audio downloaded size=%s bytes content_type=%s",
            downloaded.file_size_bytes,
            downloaded.content_type,
        )
        return (
            downloaded.read_bytes(),
            downloaded.content_type,
            downloaded.file_size_bytes,
        )
    finally:
        downloaded.cleanup()


def _assembly_speech_models() -> list[str]:
    raw = settings.assemblyai_speech_models.strip()
    return [m.strip() for m in raw.split(",") if m.strip()] or ["universal-2"]


async def transcribe_audio(
    audio_bytes: bytes,
    content_type: str | None,
    *,
    audio_url: str | None = None,
) -> WhisperTranscription:
    if not is_transcription_configured():
        if settings.dev_echo_reference:
            logger.warning("Transcription skipped — dev_echo_reference mode active")
            return WhisperTranscription(transcript="", words=[], model="dev-echo-reference")
        logger.error("No transcription API configured")
        raise HTTPException(
            status_code=503,
            detail=(
                "Transcription is not configured. Set ASSEMBLYAI_API_KEY in python/.env "
                "(recommended) or OPENAI_API_KEY for Whisper."
            ),
        )

    ext = _guess_extension(content_type)
    filename = f"recording.{ext}"

    try:
        if is_assemblyai_configured():
            logger.info(
                "AssemblyAI transcribing bytes=%s url=%s",
                len(audio_bytes),
                bool(audio_url),
            )
            if audio_url:
                result = await asyncio.to_thread(
                    assembly_transcribe_url,
                    audio_url,
                    api_key=settings.assemblyai_api_key,
                    base_url=settings.assemblyai_base_url,
                    speech_models=_assembly_speech_models(),
                )
            else:
                result = await asyncio.to_thread(
                    assembly_transcribe,
                    audio_bytes,
                    filename=filename,
                    content_type=content_type,
                    api_key=settings.assemblyai_api_key,
                    base_url=settings.assemblyai_base_url,
                    speech_models=_assembly_speech_models(),
                )
        else:
            logger.info(
                "Whisper transcribing bytes=%s content_type=%s model=%s",
                len(audio_bytes),
                content_type,
                settings.whisper_model,
            )
            result = await asyncio.to_thread(
                whisper_transcribe,
                audio_bytes,
                filename=filename,
                content_type=content_type,
                language="en",
                api_key=settings.openai_api_key,
                base_url=settings.openai_base_url,
                model=settings.whisper_model,
            )
        logger.info(
            "Transcription complete chars=%s words=%s model=%s",
            len(result.transcript),
            len(result.words),
            result.model,
        )
        return result
    except (AssemblyTranscriptionError, WhisperTranscriptionError) as exc:
        logger.error("Transcription failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc


def _guess_extension(content_type: str | None) -> str:
    if not content_type:
        return "webm"
    lowered = content_type.lower()
    if "wav" in lowered:
        return "wav"
    if "mpeg" in lowered or "mp3" in lowered:
        return "mp3"
    if "mp4" in lowered:
        return "m4a"
    if "ogg" in lowered:
        return "ogg"
    return "webm"


async def analyze_audio(
    audio_bytes: bytes,
    transcript: str,
    *,
    whisper_words: list | None = None,
    content_type: str | None = None,
    duration_hint: float | None = None,
) -> AudioFeatures:
    logger.info(
        "Librosa analyzing audio transcript_chars=%s content_type=%s",
        len(transcript),
        content_type,
    )
    features = await asyncio.to_thread(
        analyze_audio_features,
        audio_bytes,
        transcript,
        words=whisper_words,
        content_type=content_type,
        duration_hint=duration_hint,
    )

    logger.info(
        "Audio features wpm=%s pauses=%s fillers=%s duration=%ss",
        features.wpm,
        features.pause_count,
        features.filler_count,
        features.duration_seconds,
    )
    return features


def features_to_metrics(features: AudioFeatures) -> BehaviorMetrics:
    return BehaviorMetrics(
        speaking_rate_wpm=features.wpm,
        pause_count=features.pause_count,
        filler_word_count=features.filler_count,
        longest_pause_seconds=features.longest_pause,
    )


def features_to_dict(features: AudioFeatures) -> dict[str, float | int]:
    return {
        "wpm": features.wpm,
        "pause_count": features.pause_count,
        "longest_pause": features.longest_pause,
        "filler_count": features.filler_count,
        "duration_seconds": features.duration_seconds,
        "word_count": features.word_count,
    }


def word_stats_from_comparison(words_raw: list[dict]) -> dict[str, int]:
    return {
        "correct": sum(1 for w in words_raw if w.get("status") == "correct"),
        "missing": sum(1 for w in words_raw if w.get("status") == "missing"),
        "replacement": sum(1 for w in words_raw if w.get("status") == "replacement"),
        "total": sum(1 for w in words_raw if w.get("original") is not None),
    }


def resolve_glm_api_key() -> str:
    key = (settings.zhipu_api_key or settings.glm_api_key or "").strip()
    if not key:
        logger.error("ZHIPU_API_KEY / GLM_API_KEY not configured")
        raise HTTPException(
            status_code=503,
            detail="ZHIPU_API_KEY (or GLM_API_KEY) is not configured for scoring.",
        )
    return key


async def score_with_glm(prompt: ToeflScorePrompt) -> tuple[dict, dict, str, str]:
    logger.info(
        "Zhipu GLM scoring task=%s model=%s base_url=%s",
        prompt.task,
        settings.glm_model,
        settings.glm_base_url,
    )
    try:
        result = await asyncio.to_thread(
            call_glm,
            prompt,
            api_key=resolve_glm_api_key(),
            base_url=settings.glm_base_url,
            model=settings.glm_model,
        )
    except GlmApiError as exc:
        raise http_exception_from_glm(exc) from exc

    score_summary = result.score_summary or result.feedback.get("summary") or ""
    logger.info("Zhipu GLM scoring done task=%s scores=%s", prompt.task, result.scores)
    return result.scores, result.feedback, score_summary, result.model


def listen_repeat_to_ets(score: int) -> tuple[float, float, float]:
    normalized = round((score / 5) * 4, 1)
    return normalized, normalized, normalized


def finalize_score_output(
    feedback_raw: dict, score_summary: str
) -> tuple[dict, str]:
    summary = (
        score_summary.strip()
        or str(feedback_raw.get("summary") or "").strip()
        or "Analysis complete."
    )
    feedback = {**feedback_raw}
    if not feedback.get("summary"):
        feedback["summary"] = summary
    if not isinstance(feedback.get("sections"), list):
        feedback["sections"] = []
    return feedback, summary


# ---------------------------------------------------------------------------
# App & routes
# ---------------------------------------------------------------------------

app = FastAPI(
    title="AI Speaking Trainer — Speech Analysis API",
    version="0.1.0",
)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    logger.info("Starting AI Speaking Trainer Python API")
    logger.info(
        "Transcription: assemblyai=%s whisper=%s",
        is_assemblyai_configured(),
        is_whisper_configured(),
    )
    logger.info(
        "Zhipu GLM: model=%s base_url=%s key_set=%s",
        settings.glm_model,
        settings.glm_base_url,
        bool(settings.zhipu_api_key or settings.glm_api_key),
    )
    if settings.dev_echo_reference:
        logger.warning(
            "DEV_ECHO_REFERENCE=true — Interview may use placeholder transcript when Whisper is missing; "
            "Listen & Repeat always requires real Whisper transcription."
        )
    logger.info("Service auth configured: %s", bool(settings.api_key))

router = APIRouter(prefix="/analyze", tags=["analyze"])
jobs_router = APIRouter(prefix="/jobs", tags=["jobs"])


async def run_listen_repeat_analysis(body: ListenRepeatRequest) -> ListenRepeatResponse:
    audio_bytes, content_type, file_size = await fetch_audio(str(body.audio_url))

    transcription = await transcribe_audio(
        audio_bytes, content_type, audio_url=str(body.audio_url)
    )
    transcript = transcription.transcript.strip()

    if not transcript:
        if not is_transcription_configured():
            raise HTTPException(
                status_code=503,
                detail=(
                    "Listen & Repeat requires real speech transcription. "
                    "Set ASSEMBLYAI_API_KEY in python/.env, then restart the Python service."
                ),
            )
        raise HTTPException(status_code=422, detail="Empty transcript.")

    features = await analyze_audio(
        audio_bytes,
        transcript,
        whisper_words=transcription.words,
        content_type=content_type,
    )
    words_raw = build_word_comparison(body.reference_text, transcript)
    word_stats = word_stats_from_comparison(words_raw)

    try:
        score_prompt = get_toefl_score_prompt(
            task="listen_repeat",
            transcript=transcript,
            reference_text=body.reference_text,
            prompt_id=body.prompt_id,
            metrics=features_to_dict(features),
            word_stats=word_stats,
        )
    except ValueError as exc:
        logger.warning("Invalid listen-repeat scoring prompt: %s", exc)
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    scores, feedback_raw, score_summary, glm_model = await score_with_glm(score_prompt)
    feedback_raw, score_summary = finalize_score_output(feedback_raw, score_summary)
    glm_score = scores.get("score", 1)
    rule_score = compute_listen_repeat_score(words_raw)
    score = min(glm_score, rule_score)
    if rule_score < glm_score:
        logger.info(
            "Listen-repeat score capped by word alignment: glm=%s rule=%s final=%s",
            glm_score,
            rule_score,
            score,
        )
    delivery, language, topic = listen_repeat_to_ets(score)

    return ListenRepeatResponse(
        transcript=transcript,
        score=score,
        score_summary=score_summary,
        words=[ComparisonWord(**w) for w in words_raw],
        feedback=FeedbackBlock(**feedback_raw),
        duration_seconds=features.duration_seconds,
        mime_type=content_type,
        file_size_bytes=file_size,
        delivery_score=delivery,
        language_use_score=language,
        topic_development_score=topic,
        model=f"{transcription.model}+{glm_model}",
    )


async def run_interview_analysis(body: InterviewRequest) -> InterviewResponse:
    audio_bytes, content_type, _file_size = await fetch_audio(str(body.audio_url))
    transcription = await transcribe_audio(
        audio_bytes, content_type, audio_url=str(body.audio_url)
    )
    transcript = transcription.transcript.strip()

    if not transcript:
        if not is_transcription_configured():
            if settings.dev_echo_reference:
                transcript = f"[dev] Response to: {body.prompt[:120]}"
                transcription = WhisperTranscription(
                    transcript=transcript,
                    words=[],
                    model="dev-echo-reference",
                )
                logger.warning(
                    "Using dev_echo_reference transcript for interview (no AssemblyAI/Whisper)"
                )
            else:
                raise HTTPException(
                    status_code=503,
                    detail=(
                        "Virtual Interview requires speech transcription. "
                        "Set ASSEMBLYAI_API_KEY in python/.env, then restart the Python service."
                    ),
                )
        else:
            raise HTTPException(
                status_code=422,
                detail="Empty transcript. Speak clearly and try recording again.",
            )

    features = await analyze_audio(
        audio_bytes,
        transcript,
        whisper_words=transcription.words,
        content_type=content_type,
        duration_hint=body.duration_ms / 1000 if body.duration_ms > 0 else None,
    )
    if body.duration_ms > 0:
        duration_seconds = round(body.duration_ms / 1000, 2)
        duration_min = max(duration_seconds / 60, 1 / 60)
        wpm = (
            round(features.word_count / duration_min, 1)
            if features.word_count
            else 0.0
        )
        features = AudioFeatures(
            wpm=wpm,
            pause_count=features.pause_count,
            longest_pause=features.longest_pause,
            filler_count=features.filler_count,
            duration_seconds=duration_seconds,
            word_count=features.word_count,
        )

    try:
        score_prompt = get_toefl_score_prompt(
            task="interview",
            transcript=transcript,
            question=body.prompt,
            prompt_id=body.question_id,
            response_seconds=body.response_seconds,
            metrics=features_to_dict(features),
        )
    except ValueError as exc:
        logger.warning("Invalid interview scoring prompt: %s", exc)
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    scores_raw, feedback_raw, score_summary, glm_model = await score_with_glm(
        score_prompt
    )
    feedback_raw, score_summary = finalize_score_output(feedback_raw, score_summary)

    return InterviewResponse(
        transcript=transcript,
        scores=InterviewScores(
            topic=scores_raw.get("topic", 1),
            pace=scores_raw.get("pace", 1),
            pronunciation=scores_raw.get("pronunciation", 1),
            grammar=scores_raw.get("grammar", 1),
        ),
        score_summary=score_summary,
        metrics=features_to_metrics(features),
        feedback=FeedbackBlock(**feedback_raw),
        model=f"{transcription.model}+{glm_model}",
    )


def job_to_status_response(job: AnalysisJob) -> JobStatusResponse:
    return JobStatusResponse(
        job_id=job.id,
        kind=job.kind,
        status=job.status,
        error=job.error,
        result=job.result,
        client_result=job.client_result,
        request=job.request,
    )


async def _run_listen_repeat_job(job_id: str, body: ListenRepeatRequest) -> None:
    await job_store.mark_running(job_id)
    try:
        response = await run_listen_repeat_analysis(body)
        await job_store.mark_done(job_id, response.model_dump())
        logger.info("Job %s listen-repeat done score=%s", job_id, response.score)
    except HTTPException as exc:
        detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
        await job_store.mark_failed(job_id, detail)
        logger.error("Job %s listen-repeat failed: %s", job_id, detail)
    except ValidationError as exc:
        await job_store.mark_failed(job_id, "Invalid analysis result.")
        logger.warning("Job %s listen-repeat validation failed: %s", job_id, exc)
    except Exception as exc:
        await job_store.mark_failed(job_id, "Internal analysis error. Please try again later.")
        logger.exception("Job %s listen-repeat unexpected error", job_id, exc_info=exc)


async def _run_interview_job(job_id: str, body: InterviewRequest) -> None:
    await job_store.mark_running(job_id)
    try:
        response = await run_interview_analysis(body)
        await job_store.mark_done(job_id, response.model_dump())
        logger.info("Job %s interview done scores=%s", job_id, response.scores.model_dump())
    except HTTPException as exc:
        detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
        await job_store.mark_failed(job_id, detail)
        logger.error("Job %s interview failed: %s", job_id, detail)
    except ValidationError as exc:
        await job_store.mark_failed(job_id, "Invalid analysis result.")
        logger.warning("Job %s interview validation failed: %s", job_id, exc)
    except Exception as exc:
        await job_store.mark_failed(job_id, "Internal analysis error. Please try again later.")
        logger.exception("Job %s interview unexpected error", job_id, exc_info=exc)


@jobs_router.post("/listen-repeat", response_model=JobCreatedResponse, status_code=202)
async def create_listen_repeat_job(
    body: ListenRepeatRequest,
    _: Annotated[None, Depends(verify_api_key)] = None,
) -> JobCreatedResponse:
    logger.info(
        "POST /jobs/listen-repeat prompt_id=%s reference_len=%s",
        body.prompt_id,
        len(body.reference_text),
    )
    job = await job_store.create("listen_repeat", body.model_dump(mode="json"))
    asyncio.create_task(_run_listen_repeat_job(job.id, body))
    return JobCreatedResponse(job_id=job.id)


@jobs_router.post("/interview", response_model=JobCreatedResponse, status_code=202)
async def create_interview_job(
    body: InterviewRequest,
    _: Annotated[None, Depends(verify_api_key)] = None,
) -> JobCreatedResponse:
    logger.info(
        "POST /jobs/interview question_id=%s prompt_len=%s duration_ms=%s",
        body.question_id,
        len(body.prompt),
        body.duration_ms,
    )
    job = await job_store.create("interview", body.model_dump(mode="json"))
    asyncio.create_task(_run_interview_job(job.id, body))
    return JobCreatedResponse(job_id=job.id)


@jobs_router.get("/{job_id}", response_model=JobStatusResponse)
async def get_job_status(
    job_id: str,
    _: Annotated[None, Depends(verify_api_key)] = None,
) -> JobStatusResponse:
    job = await job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job_to_status_response(job)


@jobs_router.put("/{job_id}/client-result", status_code=204)
async def set_job_client_result(
    job_id: str,
    body: JobClientResultRequest,
    _: Annotated[None, Depends(verify_api_key)] = None,
) -> None:
    updated = await job_store.set_client_result(job_id, body.client_result)
    if not updated:
        raise HTTPException(status_code=404, detail="Job not found.")


@router.post("/listen-repeat", response_model=ListenRepeatResponse)
async def analyze_listen_repeat(
    body: ListenRepeatRequest,
    _: Annotated[None, Depends(verify_api_key)] = None,
) -> ListenRepeatResponse:
    logger.info(
        "POST /analyze/listen-repeat prompt_id=%s reference_len=%s",
        body.prompt_id,
        len(body.reference_text),
    )
    try:
        response = await run_listen_repeat_analysis(body)
        logger.info(
            "POST /analyze/listen-repeat done score=%s model=%s",
            response.score,
            response.model,
        )
        return response
    except HTTPException:
        raise
    except ValidationError as exc:
        logger.warning("listen-repeat response validation failed: %s", exc)
        raise HTTPException(status_code=500, detail="Invalid analysis result.") from exc
    except Exception as exc:
        raise handle_unexpected_error("/analyze/listen-repeat", exc) from exc


@router.post("/interview", response_model=InterviewResponse)
async def analyze_interview(
    body: InterviewRequest,
    _: Annotated[None, Depends(verify_api_key)] = None,
) -> InterviewResponse:
    logger.info(
        "POST /analyze/interview question_id=%s prompt_len=%s duration_ms=%s",
        body.question_id,
        len(body.prompt),
        body.duration_ms,
    )
    try:
        response = await run_interview_analysis(body)
        logger.info(
            "POST /analyze/interview done scores=%s model=%s",
            response.scores.model_dump(),
            response.model,
        )
        return response
    except HTTPException:
        raise
    except ValidationError as exc:
        logger.warning("interview response validation failed: %s", exc)
        raise HTTPException(status_code=500, detail="Invalid analysis result.") from exc
    except Exception as exc:
        raise handle_unexpected_error("/analyze/interview", exc) from exc


app.include_router(router)
app.include_router(jobs_router)

tts_router = APIRouter(prefix="/synthesize", tags=["synthesize"])


@tts_router.get("/speech")
async def synthesize_speech(
    text: str = Query(..., min_length=1, max_length=5000),
    voice: str = Query(default=DEFAULT_VOICE),
    rate: str = Query(default=DEFAULT_RATE),
    _: Annotated[None, Depends(verify_api_key)] = None,
) -> FileResponse:
    """Neural English TTS (Microsoft Edge voices) — TOEFL-style prompt audio."""
    try:
        path = await synthesize_cached(text.strip(), voice=voice, rate=rate)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("TTS synthesis failed")
        raise HTTPException(status_code=500, detail="Speech synthesis failed.") from exc

    return FileResponse(
        path,
        media_type="audio/mpeg",
        filename="speech.mp3",
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


app.include_router(tts_router)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/")
def root() -> dict:
    return {
        "service": "ai-speaking-trainer-python",
        "docs": "/docs",
        "endpoints": [
            "/jobs/listen-repeat",
            "/jobs/interview",
            "/jobs/{job_id}",
            "/analyze/listen-repeat",
            "/analyze/interview",
            "/synthesize/speech",
            "/health",
        ],
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
