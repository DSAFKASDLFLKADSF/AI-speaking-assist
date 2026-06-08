import { NextResponse } from "next/server";
import type { AnalyzeSpeechRequest } from "@/lib/analyze-speech-types";
import {
  PythonSpeechApiError,
  createPythonListenRepeatJob,
} from "@/lib/pythonSpeechApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeSpeechRequest;
    const { audioUrl, original, storagePath } = body;

    if (!audioUrl?.trim()) {
      return NextResponse.json(
        { error: "audioUrl is required." },
        { status: 400 }
      );
    }
    if (!original?.trim()) {
      return NextResponse.json(
        { error: "original (reference transcript) is required." },
        { status: 400 }
      );
    }
    if (!storagePath?.trim()) {
      return NextResponse.json(
        { error: "storagePath is required." },
        { status: 400 }
      );
    }

    const job = await createPythonListenRepeatJob({
      audio_url: audioUrl,
      reference_text: original,
      prompt_id: body.promptId,
      storage_path: storagePath,
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
      err instanceof Error ? err.message : "Failed to start speech analysis.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
