export function parseTikTokHandle(url: string) {
  const m = url.match(/tiktok\.com\/@([A-Za-z0-9._]+)/i);
  return m ? m[1] : null;
}

export function parseInstagramHandle(url: string) {
  if (/instagram\.com\/(p|reel|reels|stories|explore|accounts)\//i.test(url)) return null;
  const m = url.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  const handle = m?.[1];
  if (!handle || ["p", "reel", "reels", "stories", "explore", "accounts", "about"].includes(handle.toLowerCase())) {
    return null;
  }
  return handle;
}

export type WebHit = { platform: "tiktok" | "instagram"; handle: string; url: string; snippet: string };

export function hitsFromSearchItems(items: { link?: string; snippet?: string; title?: string }[]): WebHit[] {
  const out: WebHit[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const link = it.link ?? "";
    const snippet = `${it.title ?? ""} ${it.snippet ?? ""}`;
    const tt = parseTikTokHandle(link);
    if (tt) {
      const key = `tiktok:${tt.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ platform: "tiktok", handle: tt, url: `https://www.tiktok.com/@${tt}`, snippet });
      }
    }
    const ig = parseInstagramHandle(link);
    if (ig) {
      const key = `ig:${ig.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({
          platform: "instagram",
          handle: ig,
          url: `https://www.instagram.com/${ig}/`,
          snippet,
        });
      }
    }
  }
  return out;
}

export async function searchIndexedWeb(q: string): Promise<{ items: { link?: string; snippet?: string; title?: string }[]; provider: string | null }> {
  const googleKey = (process.env.GOOGLE_CSE_KEY ?? "").trim();
  const cx = (process.env.GOOGLE_CSE_CX ?? "").trim();
  if (googleKey && cx) {
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", googleKey);
    url.searchParams.set("cx", cx);
    url.searchParams.set("q", q);
    url.searchParams.set("num", "8");
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { items: [], provider: "google-cse" };
    const data = (await res.json()) as { items?: { link?: string; snippet?: string; title?: string }[] };
    return { items: data.items ?? [], provider: "google-cse" };
  }
  const brave = (process.env.BRAVE_SEARCH_API_KEY ?? "").trim();
  if (brave) {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", q);
    url.searchParams.set("count", "8");
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json", "X-Subscription-Token": brave },
    });
    if (!res.ok) return { items: [], provider: "brave" };
    const data = (await res.json()) as { web?: { results?: { url?: string; description?: string; title?: string }[] } };
    return {
      items: (data.web?.results ?? []).map((r) => ({ link: r.url, snippet: r.description, title: r.title })),
      provider: "brave",
    };
  }
  return { items: [], provider: null };
}

export function searchApiConfigured() {
  return Boolean(
    ((process.env.GOOGLE_CSE_KEY ?? "").trim() && (process.env.GOOGLE_CSE_CX ?? "").trim()) ||
      (process.env.BRAVE_SEARCH_API_KEY ?? "").trim(),
  );
}
