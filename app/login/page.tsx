"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-[#0b0f0c] text-zinc-100 px-6 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400">Creator Scout</p>
          <h1 className="text-2xl font-semibold mt-1">Sign in</h1>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-emerald-500 text-black font-medium py-2.5 text-sm disabled:opacity-40"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
        <p className="text-sm text-zinc-400 text-center">
          No account?{" "}
          <a className="text-emerald-400" href={`/signup${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}>
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="p-8 text-zinc-400">Loading…</p>}>
      <LoginInner />
    </Suspense>
  );
}
