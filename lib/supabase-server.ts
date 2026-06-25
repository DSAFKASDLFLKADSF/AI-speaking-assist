import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { TypedSupabaseClient } from "@/lib/supabase";
import { normalizeSupabaseUrl } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

export async function createSupabaseServerClient(): Promise<TypedSupabaseClient> {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component without mutable cookies — safe to ignore.
        }
      },
    },
  }) as TypedSupabaseClient;
}

/** Returns null when Supabase env is missing — analysis can still complete. */
export async function createSupabaseServerClientSafe(): Promise<TypedSupabaseClient | null> {
  try {
    return await createSupabaseServerClient();
  } catch {
    return null;
  }
}

/** Service-role client for trusted server writes (optional). */
export function createSupabaseServiceClient(): TypedSupabaseClient | null {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) return null;

  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as TypedSupabaseClient;
}
