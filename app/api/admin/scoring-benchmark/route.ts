import { NextResponse } from "next/server";
import { AuthError, requireAdmin } from "@/lib/auth/getCurrentUser";
import {
  PythonSpeechApiError,
  callPythonBenchmarkRunOne,
} from "@/lib/pythonSpeechApi";
import type { BenchmarkRunOnePayload } from "@/lib/scoringBenchmark";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const started = Date.now();

  try {
    await requireAdmin();
    const body = (await request.json()) as BenchmarkRunOnePayload;

    if (body.kind === "interview" && !body.interview?.audio_url) {
      return NextResponse.json(
        { error: "interview payload required." },
        { status: 400 }
      );
    }
    if (body.kind === "listen_repeat" && !body.listen_repeat?.audio_url) {
      return NextResponse.json(
        { error: "listen_repeat payload required." },
        { status: 400 }
      );
    }

    const result = await callPythonBenchmarkRunOne(body);
    const apiRoundTripSeconds = Math.round((Date.now() - started) / 100) / 10;

    return NextResponse.json({
      ...result,
      api_round_trip_seconds: apiRoundTripSeconds,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      const status = err.message.includes("Admin") ? 403 : 401;
      return NextResponse.json({ error: err.message }, { status });
    }
    if (err instanceof PythonSpeechApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 }
      );
    }

    const message =
      err instanceof Error ? err.message : "Benchmark request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
