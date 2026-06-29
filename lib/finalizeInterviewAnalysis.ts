import type { AnalyzeInterviewRequest, AnalyzeInterviewResponse } from "@/lib/analyze-interview-types";
import type { PythonAnalyzeInterviewResponse } from "@/lib/pythonSpeechApi";
import { saveInterviewAnalysis } from "@/lib/saveInterviewAnalysis";
import { isDatabaseConfigured } from "@/lib/db";

export async function finalizeInterviewAnalysis(
  body: AnalyzeInterviewRequest,
  pythonResult: PythonAnalyzeInterviewResponse,
  userId?: string | null
): Promise<AnalyzeInterviewResponse> {
  const {
    audioUrl,
    storagePath,
    prompt,
    questionId,
    responseSeconds,
    durationMs,
  } = body;

  let persisted = false;
  let sessionId: string | undefined;
  let persistError: string | undefined;

  if (userId && isDatabaseConfigured()) {
    try {
      const saved = await saveInterviewAnalysis({
        userId,
        audioUrl,
        storagePath,
        question: prompt,
        questionId,
        transcript: pythonResult.transcript,
        scores: pythonResult.scores,
        scoreSummary: pythonResult.score_summary,
        feedback: pythonResult.feedback,
        metrics: pythonResult.metrics,
        durationSeconds:
          (durationMs ?? 0) > 0
            ? durationMs! / 1000
            : pythonResult.metrics.longest_pause_seconds || 1,
        responseSeconds: responseSeconds ?? 45,
        aiModel: pythonResult.model ?? "python-api",
      });
      persisted = true;
      sessionId = saved.sessionId;
    } catch (err) {
      persistError =
        err instanceof Error ? err.message : "Failed to save interview analysis.";
    }
  }

  return {
    transcript: pythonResult.transcript,
    transcriptReview: (pythonResult.transcript_review ?? []).map((span) => ({
      text: span.text,
      kind: span.kind,
      note: span.note ?? "",
    })),
    scores: pythonResult.scores,
    scoreSummary: pythonResult.score_summary,
    metrics: {
      speakingRateWpm: pythonResult.metrics.speaking_rate_wpm,
      pauseCount: pythonResult.metrics.pause_count,
      fillerWordCount: pythonResult.metrics.filler_word_count,
      longestPauseSeconds: pythonResult.metrics.longest_pause_seconds,
    },
    feedback: pythonResult.feedback,
    storagePath,
    persisted,
    sessionId,
    ...(persistError ? { persistError } : {}),
  };
}
