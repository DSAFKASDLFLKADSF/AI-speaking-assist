import { NextResponse } from "next/server";
import type { AnalyzeInterviewRequest } from "@/lib/analyze-interview-types";
import {
  PythonSpeechApiError,
  createPythonInterviewJob,
} from "@/lib/pythonSpeechApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeInterviewRequest;
    const { audioUrl, storagePath, prompt } = body;

    if (!audioUrl?.trim() || !prompt?.trim() || !storagePath?.trim()) {
      return NextResponse.json(
        { error: "audioUrl, prompt, and storagePath are required." },
        { status: 400 }
      );
    }

    const job = await createPythonInterviewJob({
      audio_url: audioUrl,
      prompt,
      question_id: body.questionId,
      storage_path: storagePath,
      response_seconds: body.responseSeconds ?? 45,
      duration_ms: body.durationMs ?? 0,
    });

    return NextResponse.json(
      { jobId: job.job_id, status: "pending" as const },
      { status: 202 }
    );
  } catch (err) {
    if (err instanceof PythonSpeechApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 }
      );
    }

    const message =
      err instanceof Error ? err.message : "Failed to start interview analysis.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
