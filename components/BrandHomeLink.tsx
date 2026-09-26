import Link from "next/link";

/** Top-left product name — always the public onboarding page. */
export function BrandHomeLink({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Link href="/" className="text-sm text-accent-text hover:underline">
        ← Creator Scout
      </Link>
    );
  }
  return (
    <Link href="/" className="block hover:opacity-80">
      <p className="text-[11px] uppercase tracking-[0.2em] text-accent-text">Prenew hackathon</p>
      <span className="text-xl font-semibold tracking-tight">Creator Scout</span>
    </Link>
  );
}
