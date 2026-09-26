import { createBrowserClient } from "@supabase/ssr";

/** Browser-side Supabase client for auth (login/signup/signout) in client components. */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim(),
  );
}
