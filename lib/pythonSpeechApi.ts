import type { ComparisonWord } from "@/components/ComparisonText";
import type { FeedbackSection } from "@/components/FeedbackCard";
import type { InterviewScores } from "@/components/InterviewScoreCard";

/** Payload sent to the Python speech analysis service. */
export interface PythonAnalyzeSpeechRequest {
  audio_url: string;
  reference_text: string;
  prompt_id?: string;
  storage_path?: string;
}

/** Payload for Python Virtual Interview analysis. */
export interface PythonAnalyzeInterviewRequest {
  audio_url: string;
  prompt: string;
  question_id?: string;
  storage_path?: string;
  response_seconds?: number;
  duration_ms?: number;
}

/** Raw response from the Python speech analysis service. */
export interface PythonAnalyzeSpeechResponse {
  transcript: string;
  score?: number;
  score_summary?: string;
  words?: ComparisonWord[];
  feedback?: {
    summary: string;
    sections: FeedbackSection[];
  };
  duration_seconds?: number;
  mime_type?: string;
  file_size_bytes?: number;
  /** Optional ETS-style dimension scores (0–4) from Python */
  delivery_score?: number;
  language_use_score?: number;
  topic_development_score?: number;
  model?: string;
}

export interface PythonBehaviorMetrics {
  speaking_rate_wpm: number;
  pause_count: number;
  filler_word_count: number;
  longest_pause_seconds: number;
}

export interface PythonAnalyzeInterviewResponse {
  transcript: string;
  scores: InterviewScores;
  score_summary: string;
  metrics: PythonBehaviorMetrics;
  feedback: {
    summary: string;
    sections: FeedbackSection[];
  };
  model?: string;
}

export class PythonSpeechApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "PythonSpeechApiError";
  }
}

export type PythonJobStatus = "pending" | "running" | "done" | "failed";

export interface PythonJobStatusResponse {
  job_id: string;
  kind: "listen_repeat" | "interview";
  status: PythonJobStatus;
  error?: string | null;
  result?: PythonAnalyzeSpeechResponse | PythonAnalyzeInterviewResponse | null;
  client_result?: Record<string, unknown> | null;
  request?: Record<string, unknown> | null;
}

export interface PythonJobCreatedResponse {
  job_id: string;
  status: "pending";
}

function getPythonApiConfig(options?: { timeoutMs?: number }) {
  const baseUrl = process.env.PYTHON_SPEECH_API_URL?.trim();
  if (!baseUrl) {
    throw new Error(
      "PYTHON_SPEECH_API_URL is not configured. Add it to .env.local (e.g. http://localhost:8000)."
    );
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    apiKey: process.env.PYTHON_SPEECH_API_KEY?.trim(),
    timeoutMs:
      options?.timeoutMs ??
      Number(process.env.PYTHON_SPEECH_API_TIMEOUT_MS ?? 300_000),
  };
}

async function callPythonApi<T>(
  path: string,
  payload: unknown,
  validate: (data: T) => boolean,
  invalidMessage: string,
  options?: { method?: "GET" | "POST" | "PUT"; timeoutMs?: number }
): Promise<T> {
  const { baseUrl, apiKey, timeoutMs } = getPythonApiConfig(options);
  const method = options?.method ?? "POST";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (method !== "GET") {
      headers["Content-Type"] = "application/json";
    }
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: method === "GET" ? undefined : JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const data = (await response.json().catch(() => ({}))) as
      | T
      | { detail?: string; error?: string; message?: string };

    if (!response.ok) {
      const message =
        (data as { detail?: string }).detail ??
        (data as { error?: string }).error ??
        (data as { message?: string }).message ??
        `Python API error (${response.status})`;
      throw new PythonSpeechApiError(message, response.status);
    }

    if (validate && !validate(data as T)) {
      throw new PythonSpeechApiError(invalidMessage, 502);
    }

    return data as T;
  } catch (err) {
    if (err instanceof PythonSpeechApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new PythonSpeechApiError(
        `Python API request timed out after ${Math.round(timeoutMs / 1000)}s.`,
        504
      );
    }
    const message =
      err instanceof Error ? err.message : "Failed to reach Python API.";
    if (/fetch failed|ECONNREFUSED|Failed to fetch/i.test(message)) {
      throw new PythonSpeechApiError(
        `Cannot reach Python API at ${baseUrl}. Start it: cd python && uvicorn main:app --reload --port 8000`,
        502
      );
    }
    throw new PythonSpeechApiError(message, 502);
  } finally {
    clearTimeout(timeout);
  }
}

const JOB_SUBMIT_TIMEOUT_MS = 30_000;
const JOB_POLL_TIMEOUT_MS = 15_000;

/** POST /jobs/listen-repeat — returns immediately with job_id */
export async function createPythonListenRepeatJob(
  payload: PythonAnalyzeSpeechRequest
): Promise<PythonJobCreatedResponse> {
  return callPythonApi<PythonJobCreatedResponse>(
    "/jobs/listen-repeat",
    payload,
    (data) => Boolean((data as PythonJobCreatedResponse).job_id),
    "Python API returned an invalid job payload.",
    { timeoutMs: JOB_SUBMIT_TIMEOUT_MS }
  );
}

/** POST /jobs/interview — returns immediately with job_id */
export async function createPythonInterviewJob(
  payload: PythonAnalyzeInterviewRequest
): Promise<PythonJobCreatedResponse> {
  return callPythonApi<PythonJobCreatedResponse>(
    "/jobs/interview",
    payload,
    (data) => Boolean((data as PythonJobCreatedResponse).job_id),
    "Python API returned an invalid job payload.",
    { timeoutMs: JOB_SUBMIT_TIMEOUT_MS }
  );
}

/** GET /jobs/{job_id} */
export async function getPythonJobStatus(
  jobId: string
): Promise<PythonJobStatusResponse> {
  return callPythonApi<PythonJobStatusResponse>(
    `/jobs/${encodeURIComponent(jobId)}`,
    {},
    (data) => Boolean((data as PythonJobStatusResponse).job_id),
    "Python API returned an invalid job status payload.",
    { method: "GET", timeoutMs: JOB_POLL_TIMEOUT_MS }
  );
}

/** PUT /jobs/{job_id}/client-result — cache finalized Next.js response */
export async function setPythonJobClientResult(
  jobId: string,
  clientResult: unknown
): Promise<void> {
  await callPythonApi<void>(
    `/jobs/${encodeURIComponent(jobId)}/client-result`,
    { client_result: clientResult },
    () => true,
    "",
    { method: "PUT", timeoutMs: JOB_POLL_TIMEOUT_MS }
  );
}

/**
 * Call the Python Listen & Repeat analysis endpoint.
 * Expected Python route: POST {PYTHON_SPEECH_API_URL}/analyze/listen-repeat
 */
export async function callPythonAnalyzeSpeech(
  payload: PythonAnalyzeSpeechRequest
): Promise<PythonAnalyzeSpeechResponse> {
  return callPythonApi<PythonAnalyzeSpeechResponse>(
    "/analyze/listen-repeat",
    payload,
    (data) => Boolean((data as PythonAnalyzeSpeechResponse).transcript),
    "Python API returned an invalid payload (missing transcript).",
    { timeoutMs: Number(process.env.PYTHON_SPEECH_API_TIMEOUT_MS ?? 300_000) }
  );
}

/**
 * Call the Python Virtual Interview analysis endpoint.
 * Expected Python route: POST {PYTHON_SPEECH_API_URL}/analyze/interview
 */
export async function callPythonAnalyzeInterview(
  payload: PythonAnalyzeInterviewRequest
): Promise<PythonAnalyzeInterviewResponse> {
  return callPythonApi<PythonAnalyzeInterviewResponse>(
    "/analyze/interview",
    payload,
    (data) =>
      Boolean(
        (data as PythonAnalyzeInterviewResponse).transcript &&
          (data as PythonAnalyzeInterviewResponse).scores
      ),
    "Python API returned an invalid interview payload.",
    { timeoutMs: Number(process.env.PYTHON_SPEECH_API_TIMEOUT_MS ?? 300_000) }
  );
}
