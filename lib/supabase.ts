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

/** True when real Supabase URL + anon key are present (not empty / placeholder). */
export function isSupabaseConfigured(): boolean {
  const url = normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!url || !anonKey) return false;
  if (url.includes("your-project.supabase.co")) return false;
  if (anonKey === "your-anon-key") return false;

  return true;
}

function getSupabaseConfig() {
  const url = normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
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
