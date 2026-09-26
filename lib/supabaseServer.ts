import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server runtime: prefer the non-public vars (guaranteed present at runtime on
// Vercel), fall back to the NEXT_PUBLIC ones. The browser uses NEXT_PUBLIC only.
function serverAuthEnv() {
  const url = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anon = (process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  return { url, anon };
}

export function supabaseAuthConfigured() {
  const { url, anon } = serverAuthEnv();
  return Boolean(url && anon);
}

/**
 * Server-side Supabase client bound to the request cookies (reads the logged-in
 * user's session). Uses the anon/publishable key + RLS — safe for user context.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, anon } = serverAuthEnv();
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
