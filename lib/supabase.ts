import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function supabaseConfigured() {
  return Boolean(
    (process.env.SUPABASE_URL ?? "").trim() && (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim(),
  );
}

/**
 * Server-side Supabase client using the service-role key. Never import this into
 * client components — the service-role key bypasses RLS and must stay server-only.
 * Returns null when Supabase env is not configured so callers can fall back.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseConfigured()) return null;
  if (cached) return cached;
  cached = createClient(process.env.SUPABASE_URL!.trim(), process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
