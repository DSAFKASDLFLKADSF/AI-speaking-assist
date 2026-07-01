import { NextResponse } from "next/server";
import { AuthError, requireAdmin } from "@/lib/auth/getCurrentUser";
import { isDatabaseConfigured } from "@/lib/db";
import { listAllSurveyResponses } from "@/lib/repositories/surveyResponses";
import { buildSurveyAnalytics } from "@/lib/surveys/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        configured: false,
        summary: buildSurveyAnalytics([]),
      });
    }
    const rows = await listAllSurveyResponses();
    return NextResponse.json({
      configured: true,
      summary: buildSurveyAnalytics(rows),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      const status = err.message.includes("Admin") ? 403 : 401;
      return NextResponse.json({ error: err.message }, { status });
    }
    const message = err instanceof Error ? err.message : "Failed to load analytics.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
