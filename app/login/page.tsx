"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { safePostAuthPath } from "@/lib/paths";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safePostAuthPath(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = await createSupabaseBrowserClient();
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
    <div className="min-h-full flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-accent-text">Creator Scout</p>
          <h1 className="text-2xl font-semibold mt-1">Sign in</h1>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            className="w-full field p-2.5 text-sm"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full field p-2.5 text-sm"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full btn-primary font-medium py-2.5 text-sm"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
        <p className="text-sm text-muted text-center">
          No account?{" "}
          <a className="text-accent-text" href={`/signup?next=${encodeURIComponent(next)}`}>
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="p-8 text-muted">Loading…</p>}>
      <LoginInner />
    </Suspense>
  );
}
