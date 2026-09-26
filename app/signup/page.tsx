"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { safePostAuthPath } from "@/lib/paths";

function SignupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safePostAuthPath(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = await createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) throw error;
      // If email confirmation is on, there's no session yet — tell the user to confirm.
      if (!data.session) {
        setCheckEmail(true);
        return;
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign up");
    } finally {
      setBusy(false);
    }
  }

  if (checkEmail) {
    return (
      <div className="min-h-full flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm space-y-3 text-center">
          <h1 className="text-2xl font-semibold">Check your email</h1>
          <p className="text-sm text-muted">
            We sent a confirmation link to <span className="text-foreground">{email}</span>. Confirm it, then{" "}
            <a className="text-accent-text" href="/login">
              sign in
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-accent-text">Creator Scout</p>
          <h1 className="text-2xl font-semibold mt-1">Create your account</h1>
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
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full btn-primary font-medium py-2.5 text-sm"
          >
            {busy ? "Creating…" : "Create account"}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
        <p className="text-sm text-muted text-center">
          Already have an account?{" "}
          <a className="text-accent-text" href={`/login?next=${encodeURIComponent(next)}`}>
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<p className="p-8 text-muted">Loading…</p>}>
      <SignupInner />
    </Suspense>
  );
}
