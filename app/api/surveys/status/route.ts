import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { isDatabaseConfigured } from "@/lib/db";
import {
  getSurveyResponse,
  mergeAnonymousSurveysToUser,
} from "@/lib/repositories/surveyResponses";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const clientId = request.headers.get("x-survey-client-id")?.trim() || null;

  let preCompleted = false;
  let postCompleted = false;

  if (isDatabaseConfigured()) {
    try {
      if (user?.id && clientId) {
        await mergeAnonymousSurveysToUser(clientId, user.id);
      }
      const actor = { userId: user?.id ?? null, clientId };
      const pre = await getSurveyResponse("pre", actor);
      const post = await getSurveyResponse("post", actor);
      if (pre) preCompleted = true;
      if (post) postCompleted = true;
    } catch {
      /* client falls back to local state */
    }
  }

  return NextResponse.json({
    preCompleted,
    postCompleted,
  });
}
