import { NextResponse } from "next/server";
import { getSupabaseConfigSummary, normalizeSupabaseUrl } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Quick Supabase env check for production debugging.
 * GET /api/health/supabase — no secrets returned.
 */
export async function GET() {
  const summary = getSupabaseConfigSummary();
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());

  let authReachable: boolean | null = null;
  let authError: string | null = null;

  if (url && hasAnonKey) {
    try {
      const response = await fetch(`${url}/auth/v1/health`, {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim() },
        cache: "no-store",
      });
      authReachable = response.ok;
      if (!response.ok) {
        authError = `Auth health returned HTTP ${response.status}`;
      }
    } catch (err) {
      authReachable = false;
      authError = err instanceof Error ? err.message : "Auth health check failed";
    }
  }

  return NextResponse.json({
    ...summary,
    hasAnonKey,
    authReachable,
    authError,
    rebuildHint:
      "After changing NEXT_PUBLIC_* in .env.local run: pm2 stop ai-speaking-web && npm run build && pm2 restart ai-speaking-web",
  });
}
