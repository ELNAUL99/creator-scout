"use client";

import { useEffect, useMemo, useState } from "react";
import { buildCreatorDossier, snapshotLine } from "@/lib/creatorDossier";
import type { ScoredCreator, YoutubeResearch } from "@/lib/types";

const PROMPTS = [
  "How well known are they?",
  "How recent is the last upload?",
  "What's their average time between uploads?",
  "What have they posted lately?",
];

type Turn = { role: "user" | "assistant"; content: string };

export default function CreatorFollowUp({ creator }: { creator: ScoredCreator }) {
  const [youtube, setYoutube] = useState<YoutubeResearch | undefined>(creator.youtube);
  const hydrated: ScoredCreator = useMemo(
    () =>
      youtube
        ? {
            ...creator,
            youtube,
            recentContent: youtube.latestUploads,
            totalVideos: youtube.videoCount || creator.totalVideos,
            startedAt: youtube.startedAt ?? creator.startedAt,
            followers: youtube.hiddenSubscribers ? creator.followers : youtube.subscriberCount || creator.followers,
          }
        : creator,
    [creator, youtube],
  );
  const dossier = useMemo(() => buildCreatorDossier(hydrated), [hydrated]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/youtube-research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelId: creator.id, fallback: creator.youtube ?? null }),
        });
        const data = (await res.json()) as { youtube?: YoutubeResearch };
        if (!cancelled && data.youtube) setYoutube(data.youtube);
      } catch {
        /* keep card payload until ask() hydrates on the server */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [creator.id]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    setError(null);
    setInput("");
    const nextHistory = [...turns, { role: "user" as const, content: q }];
    setTurns(nextHistory);
    setLoading(true);
    try {
      const res = await fetch("/api/creator-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creator: hydrated, history: turns, question: q }),
      });
      const data = (await res.json()) as { answer?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Follow-up failed");
      setTurns([...nextHistory, { role: "assistant", content: data.answer || "No answer." }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Follow-up failed");
      setTurns(turns);
      setInput(q);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <p className="text-xs text-foreground font-medium">Ask about this creator</p>
      <p className="text-xs">{snapshotLine(dossier)}</p>
      <div className="flex flex-wrap gap-1">
        {PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            className="text-[11px] border border-border rounded-full px-2 py-0.5 hover:border-accent"
            disabled={loading}
            onClick={() => ask(p)}
          >
            {p}
          </button>
        ))}
      </div>
      {turns.length > 0 && (
        <div className="space-y-2 max-h-56 overflow-y-auto text-xs">
          {turns.map((t, i) => (
            <p key={i} className={t.role === "user" ? "text-foreground" : "text-muted"}>
              <span className="font-medium">{t.role === "user" ? "You" : "Scout"}: </span>
              {t.content}
            </p>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-red-300">{error}</p>}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <input
          className="flex-1 text-xs bg-surface-2 border border-border rounded px-2 py-1.5"
          placeholder="Ask last upload, average gap, video length…"
          value={input}
          disabled={loading}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="text-xs bg-accent text-accent-foreground rounded px-3 py-1.5 disabled:opacity-40"
          disabled={loading || !input.trim()}
        >
          {loading ? "…" : "Ask"}
        </button>
      </form>
    </div>
  );
}
