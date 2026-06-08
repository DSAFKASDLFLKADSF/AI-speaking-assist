import { NextResponse } from "next/server";
import type { AnalysisJobPollResponse } from "@/lib/analysisJobTypes";
import { finalizeInterviewAnalysis } from "@/lib/finalizeInterviewAnalysis";
import { mapPythonInterviewRequest } from "@/lib/mapPythonJobRequest";
import {
  PythonSpeechApiError,
  getPythonJobStatus,
  setPythonJobClientResult,
  type PythonAnalyzeInterviewResponse,
} from "@/lib/pythonSpeechApi";
import { createSupabaseServerClientSafe } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await context.params;

  if (!jobId?.trim()) {
    return NextResponse.json({ error: "jobId is required." }, { status: 400 });
  }

  try {
    const job = await getPythonJobStatus(jobId);

    if (job.client_result) {
      return NextResponse.json({
        jobId: job.job_id,
        status: "done",
        result: job.client_result,
      } satisfies AnalysisJobPollResponse);
    }

    if (job.status === "failed") {
      return NextResponse.json({
        jobId: job.job_id,
        status: "failed",
        error: job.error ?? "Analysis failed.",
      } satisfies AnalysisJobPollResponse);
    }

    if (job.status !== "done" || !job.result) {
      return NextResponse.json({
        jobId: job.job_id,
        status: job.status,
      } satisfies AnalysisJobPollResponse);
    }

    const supabase = await createSupabaseServerClientSafe();
    const requestBody = mapPythonInterviewRequest(job.request ?? undefined);

    const finalized = await finalizeInterviewAnalysis(
      requestBody,
      job.result as PythonAnalyzeInterviewResponse,
      supabase
    );

    await setPythonJobClientResult(jobId, finalized).catch(() => undefined);

    return NextResponse.json({
      jobId: job.job_id,
      status: "done",
      result: finalized,
    } satisfies AnalysisJobPollResponse);
  } catch (err) {
    if (err instanceof PythonSpeechApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 }
      );
    }

    const message =
      err instanceof Error ? err.message : "Failed to fetch analysis job.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
