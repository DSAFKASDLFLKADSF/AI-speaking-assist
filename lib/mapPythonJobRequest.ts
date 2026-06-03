import type { AnalyzeInterviewRequest } from "@/lib/analyze-interview-types";
import type { AnalyzeSpeechRequest } from "@/lib/analyze-speech-types";

export function mapPythonListenRepeatRequest(
  request: Record<string, unknown> | null | undefined
): AnalyzeSpeechRequest {
  return {
    audioUrl: String(request?.audio_url ?? ""),
    original: String(request?.reference_text ?? ""),
    storagePath: String(request?.storage_path ?? ""),
    promptId: request?.prompt_id ? String(request.prompt_id) : undefined,
  };
}

export function mapPythonInterviewRequest(
  request: Record<string, unknown> | null | undefined
): AnalyzeInterviewRequest {
  return {
    audioUrl: String(request?.audio_url ?? ""),
    storagePath: String(request?.storage_path ?? ""),
    prompt: String(request?.prompt ?? ""),
    questionId: request?.question_id ? String(request.question_id) : undefined,
    responseSeconds: Number(request?.response_seconds ?? 45),
    durationMs: Number(request?.duration_ms ?? 0),
  };
}
