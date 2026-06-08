import type {
  AnalyzeInterviewRequest,
  AnalyzeInterviewResponse,
} from "@/lib/analyze-interview-types";
import type {
  AnalyzeSpeechRequest,
  AnalyzeSpeechResponse,
} from "@/lib/analyze-speech-types";
import type { AnalysisJobCreatedResponse } from "@/lib/analysisJobTypes";
import type {
  PracticeHistoryQuery,
  PracticeHistoryResponse,
} from "@/lib/history-types";
import {
  pollAnalysisJob,
  PollAnalysisJobError,
  type PollAnalysisJobOptions,
} from "@/lib/pollAnalysisJob";
import type {
  CreatePracticeSessionRequest,
  CreatePracticeSessionResponse,
} from "@/lib/session-types";

export type {
  AnalyzeInterviewRequest,
  AnalyzeInterviewResponse,
} from "@/lib/analyze-interview-types";
export type {
  AnalyzeSpeechRequest,
  AnalyzeSpeechResponse,
} from "@/lib/analyze-speech-types";
export type {
  PracticeHistoryQuery,
  PracticeHistoryResponse,
  PracticeHistoryItem,
} from "@/lib/history-types";
export type {
  CreatePracticeSessionRequest,
  CreatePracticeSessionResponse,
  PracticeSessionRecord,
} from "@/lib/session-types";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ApiRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  searchParams?: Record<string, string | number | undefined | null>;
  fallbackError?: string;
  timeoutMs?: number;
}

async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { method = "GET", body, searchParams, fallbackError, timeoutMs } =
    options;

  let url = path;
  if (searchParams) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    if (qs) url = `${path}?${qs}`;
  }

  const init: RequestInit = { method, credentials: "same-origin" };

  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }

  const controller = new AbortController();
  const timeout =
    timeoutMs !== undefined
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;
  init.signal = controller.signal;

  try {
    const res = await fetch(url, init);
    const data: unknown = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message =
        (data as { error?: string }).error ??
        fallbackError ??
        `Request failed (${res.status})`;
      throw new ApiError(message, res.status, data);
    }

    return data as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError(
        fallbackError ?? "Request timed out. Check that the Python API is running.",
        504
      );
    }
    throw err;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

type AnalyzeOptions = Pick<PollAnalysisJobOptions, "onStatus">;

/** POST /api/analyze-speech — submit job, poll until Listen & Repeat analysis completes */
export async function analyzeSpeech(
  payload: AnalyzeSpeechRequest,
  options: AnalyzeOptions = {}
): Promise<AnalyzeSpeechResponse> {
  try {
    const created = await apiRequest<AnalysisJobCreatedResponse>(
      "/api/analyze-speech",
      {
        method: "POST",
        body: payload,
        fallbackError: "Speech analysis failed.",
        timeoutMs: 60_000,
      }
    );

    return await pollAnalysisJob<AnalyzeSpeechResponse>(
      `/api/analyze-speech/jobs/${encodeURIComponent(created.jobId)}`,
      { onStatus: options.onStatus }
    );
  } catch (err) {
    if (err instanceof PollAnalysisJobError) {
      throw new ApiError(err.message, err.status, err.body);
    }
    throw err;
  }
}

/** POST /api/analyze-interview — submit job, poll until Virtual Interview analysis completes */
export async function analyzeInterview(
  payload: AnalyzeInterviewRequest,
  options: AnalyzeOptions = {}
): Promise<AnalyzeInterviewResponse> {
  try {
    const created = await apiRequest<AnalysisJobCreatedResponse>(
      "/api/analyze-interview",
      {
        method: "POST",
        body: payload,
        fallbackError: "Interview analysis failed.",
        timeoutMs: 60_000,
      }
    );

    return await pollAnalysisJob<AnalyzeInterviewResponse>(
      `/api/analyze-interview/jobs/${encodeURIComponent(created.jobId)}`,
      { onStatus: options.onStatus }
    );
  } catch (err) {
    if (err instanceof PollAnalysisJobError) {
      throw new ApiError(err.message, err.status, err.body);
    }
    throw err;
  }
}

/** POST /api/session — create a practice session */
export function createPracticeSession(
  payload: CreatePracticeSessionRequest
): Promise<CreatePracticeSessionResponse> {
  return apiRequest<CreatePracticeSessionResponse>("/api/session", {
    method: "POST",
    body: payload,
    fallbackError: "Failed to create practice session.",
  });
}

/** GET /api/history — user practice history */
export function getPracticeHistory(
  query: PracticeHistoryQuery = {}
): Promise<PracticeHistoryResponse> {
  return apiRequest<PracticeHistoryResponse>("/api/history", {
    searchParams: {
      limit: query.limit,
      offset: query.offset,
      status: query.status,
      taskNumber: query.taskNumber,
    },
    fallbackError: "Failed to load practice history.",
  });
}

/** @deprecated Use `createPracticeSession` */
export const createPracticeSessionRequest = createPracticeSession;

/** @deprecated Use `getPracticeHistory` */
export const fetchPracticeHistory = getPracticeHistory;

export const api = {
  analyzeSpeech,
  analyzeInterview,
  createPracticeSession,
  getPracticeHistory,
};
