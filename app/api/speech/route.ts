import { NextRequest, NextResponse } from "next/server";
import {
  resolveSpeechText,
  type NeuralSpeechKind,
} from "@/lib/neuralSpeech";

export const runtime = "nodejs";

function getPythonBaseUrl(): string {
  const base = process.env.PYTHON_SPEECH_API_URL?.trim();
  if (!base) {
    throw new Error("PYTHON_SPEECH_API_URL is not configured.");
  }
  return base.replace(/\/$/, "");
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const kind = (searchParams.get("kind") ?? "custom") as NeuralSpeechKind;
  const id = searchParams.get("id") ?? undefined;
  const textParam = searchParams.get("text") ?? undefined;

  const text = resolveSpeechText({ kind, id, text: textParam });
  if (!text) {
    return NextResponse.json(
      { error: "Prompt text not found for speech synthesis." },
      { status: 404 }
    );
  }

  try {
    const baseUrl = getPythonBaseUrl();
    const qs = new URLSearchParams({ text });
    const headers: Record<string, string> = { Accept: "audio/mpeg" };
    const apiKey = process.env.PYTHON_SPEECH_API_KEY?.trim();
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const upstream = await fetch(`${baseUrl}/synthesize/speech?${qs}`, {
      headers,
      cache: "no-store",
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      return NextResponse.json(
        {
          error:
            detail ||
            "Neural speech service unavailable. Start Python on port 8000.",
        },
        { status: upstream.status === 503 ? 503 : 502 }
      );
    }

    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Speech synthesis failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
