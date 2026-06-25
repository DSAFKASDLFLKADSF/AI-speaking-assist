import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type TypedSupabaseClient = SupabaseClient<Database>;

let browserClient: TypedSupabaseClient | undefined;

const SUPABASE_SETUP_HINT =
  "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the dev server.";

function normalizeEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

/** Normalize Project URL from Supabase dashboard (Settings → API). */
export function normalizeSupabaseUrl(raw: string | undefined): string | undefined {
  let url = normalizeEnv(raw);
  if (!url) return undefined;

  // Common copy-paste mistakes (Dashboard API tab, curl examples, etc.)
  url = url.replace(/\/rest\/v1\/?$/i, "");
  url = url.replace(/\/auth\/v1\/?$/i, "");
  url = url.replace(/\/+$/, "");

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith(".supabase.co")) {
      return undefined;
    }
    // Auth client appends /auth/v1/* — any extra path (e.g. /rest/v1) causes
    // PGRST125 "Invalid path specified in request URL".
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return undefined;
  }
}

/** Safe summary for debugging misconfigured builds (no secrets). */
export function getSupabaseConfigSummary(): {
  configured: boolean;
  rawUrl: string | undefined;
  normalizedUrl: string | undefined;
  issue: string | null;
} {
  const rawUrl = normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const normalizedUrl = normalizeSupabaseUrl(rawUrl);
  const anonKey = normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  let issue: string | null = null;
  if (!rawUrl || !anonKey) {
    issue = "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.";
  } else if (rawUrl.includes("/rest/v1") || rawUrl.includes("/auth/v1")) {
    issue =
      "URL must be the Project URL only (https://xxxx.supabase.co), not /rest/v1 or /auth/v1.";
  } else if (!normalizedUrl) {
    issue =
      "URL must be your Supabase Project URL (https://xxxx.supabase.co), not your app IP or Dashboard link.";
  } else if (!isSupabaseConfigured()) {
    issue = "Placeholder values detected — paste real Project URL and anon key.";
  }

  return {
    configured: isSupabaseConfigured(),
    rawUrl,
    normalizedUrl,
    issue,
  };
}

/** True when real Supabase URL + anon key are present (not empty / placeholder). */
export function isSupabaseConfigured(): boolean {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!url || !anonKey) return false;
  if (url.includes("your-project.supabase.co")) return false;
  if (anonKey === "your-anon-key") return false;

  return true;
}

function getSupabaseConfig() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!isSupabaseConfigured() || !url || !anonKey) {
    throw new Error(SUPABASE_SETUP_HINT);
  }

  return { url, anonKey };
}

/**
 * Create a new Supabase browser client (for Client Components).
 */
export function createSupabaseClient(): TypedSupabaseClient {
  const { url, anonKey } = getSupabaseConfig();
  return createBrowserClient<Database>(url, anonKey);
}

/**
 * Get a singleton Supabase browser client.
 * Reuses the same instance across Client Components.
 */
export function getSupabase(): TypedSupabaseClient {
  if (!browserClient) {
    browserClient = createSupabaseClient();
  }
  return browserClient;
}
