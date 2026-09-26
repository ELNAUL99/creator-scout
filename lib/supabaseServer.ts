import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function supabaseAuthConfigured() {
  // Require the PUBLIC vars specifically: gating must only activate when the
  // browser can also authenticate, otherwise users get locked out.
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  return Boolean(url && anon);
}

/**
 * Server-side Supabase client bound to the request cookies (reads the logged-in
 * user's session). Uses the anon/publishable key + RLS — safe for user context.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // called from a Server Component — safe to ignore; middleware refreshes cookies
        }
      },
    },
  });
}
