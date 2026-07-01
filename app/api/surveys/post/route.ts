import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { isDatabaseConfigured } from "@/lib/db";
import { upsertSurveyResponse } from "@/lib/repositories/surveyResponses";
import type { PostSurveyAnswers } from "@/lib/surveys/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const clientId = request.headers.get("x-survey-client-id")?.trim() || null;
  const body = (await request.json()) as { answers?: PostSurveyAnswers };

  if (!body.answers || typeof body.answers !== "object") {
    return NextResponse.json({ error: "answers required." }, { status: 400 });
  }

  if (!user?.id && !clientId) {
    return NextResponse.json(
      { error: "client id required for anonymous survey." },
      { status: 400 }
    );
  }

  if (isDatabaseConfigured()) {
    try {
      await upsertSurveyResponse("post", body.answers, {
        userId: user?.id ?? null,
        clientId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
