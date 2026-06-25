import { NextResponse } from "next/server";
import { isAuthConfigured } from "@/lib/auth/session";
import { isDatabaseConfigured, query } from "@/lib/db";
import { isDevDatabaseEnabled } from "@/lib/devDb";

export const runtime = "nodejs";

export async function GET() {
  const db = isDatabaseConfigured();
  const auth = isAuthConfigured();

  let dbReachable: boolean | null = null;
  let dbError: string | null = null;

  if (db) {
    try {
      await query("SELECT 1");
      dbReachable = true;
    } catch (err) {
      dbReachable = false;
      dbError = err instanceof Error ? err.message : "Database unreachable";
    }
  }

  return NextResponse.json({
    authConfigured: auth,
    databaseConfigured: db,
    databaseReachable: dbReachable,
    databaseError: dbError,
    devDatabase: isDevDatabaseEnabled(),
    hint: !auth
      ? "Set AUTH_SECRET in .env.local (local dev) or DATABASE_URL + AUTH_SECRET (production), then restart npm run dev."
      : null,
  });
}
