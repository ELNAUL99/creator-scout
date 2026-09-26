import type { ReactNode } from "react";
import { BrandHomeLink } from "@/components/BrandHomeLink";

export const LEGAL_UPDATED = "26 September 2026";

export function LegalShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-border px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <BrandHomeLink compact />
        <LegalNav />
      </header>
      <article className="flex-1 mx-auto max-w-2xl px-6 py-10 space-y-5 text-sm text-muted leading-relaxed">
        <p className="text-[11px] uppercase tracking-[0.2em] text-accent-text">Prenew</p>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="text-xs text-muted">Last updated {LEGAL_UPDATED}. Written for Creator Scout — not a third-party template.</p>
        {children}
      </article>
      <SiteFooter />
    </div>
  );
}

export function LegalNav() {
  return (
    <nav className="flex flex-wrap gap-4 text-sm text-muted">
      <a className="hover:text-white" href="/lens">
        Scout Lens
      </a>
      <a className="hover:text-white" href="/opt-in">
        Connect TikTok / Instagram
      </a>
      <a className="hover:text-white" href="/terms">
        Terms
      </a>
      <a className="hover:text-white" href="/privacy">
        Privacy
      </a>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border px-6 py-4 text-xs text-muted flex flex-wrap gap-4">
      <span>© {new Date().getFullYear()} Prenew · Creator Scout</span>
      <a className="hover:text-foreground" href="/terms">
        Terms of Service
      </a>
      <a className="hover:text-foreground" href="/privacy">
        Privacy Policy
      </a>
    </footer>
  );
}
