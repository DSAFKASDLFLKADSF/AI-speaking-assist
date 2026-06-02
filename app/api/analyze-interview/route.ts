import { NextResponse } from "next/server";
import type { AnalyzeInterviewRequest } from "@/lib/analyze-interview-types";
import {
  PythonSpeechApiError,
  callPythonAnalyzeInterview,
} from "@/lib/pythonSpeechApi";
import { saveInterviewAnalysis } from "@/lib/saveInterviewAnalysis";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeInterviewRequest;
    const { audioUrl, storagePath, prompt, questionId, responseSeconds, durationMs } =
      body;

    if (!audioUrl?.trim() || !prompt?.trim() || !storagePath?.trim()) {
      return NextResponse.json(
        { error: "audioUrl, prompt, and storagePath are required." },
        { status: 400 }
      );
    }

    const pythonResult = await callPythonAnalyzeInterview({
      audio_url: audioUrl,
      prompt,
      question_id: questionId,
      storage_path: storagePath,
      response_seconds: responseSeconds ?? 45,
      duration_ms: durationMs ?? 0,
    });

    let persisted = false;
    let sessionId: string | undefined;
    let persistError: string | undefined;

    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const saved = await saveInterviewAnalysis(supabase, {
          userId: user.id,
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
      }
    } catch (err) {
      persistError =
        err instanceof Error ? err.message : "Failed to save interview analysis.";
    }

    return NextResponse.json({
      transcript: pythonResult.transcript,
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
    });
  } catch (err) {
    if (err instanceof PythonSpeechApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 }
      );
    }

    const message =
      err instanceof Error ? err.message : "Interview analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
