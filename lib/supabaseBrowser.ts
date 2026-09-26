import { createBrowserClient } from "@supabase/ssr";

type BrowserClient = ReturnType<typeof createBrowserClient>;

let cached: BrowserClient | null = null;
let inflight: Promise<BrowserClient> | null = null;

function fromBuildEnv() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if (!url || !anon) return null;
  return createBrowserClient(url, anon);
}

/** Browser auth client. Uses build-time NEXT_PUBLIC_* when present; otherwise loads runtime server env. */
export async function createSupabaseBrowserClient() {
  if (cached) return cached;
  const built = fromBuildEnv();
  if (built) {
    cached = built;
    return cached;
  }
  if (!inflight) {
    inflight = fetch("/api/public/supabase")
      .then(async (res) => {
        const data = (await res.json()) as { url?: string; anonKey?: string; error?: string };
        if (!res.ok || !data.url || !data.anonKey) {
          throw new Error(data.error || "Supabase is not configured on this deployment.");
        }
        cached = createBrowserClient(data.url, data.anonKey);
        return cached;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
