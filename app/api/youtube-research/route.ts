import { NextResponse } from "next/server";
import { ensureYoutubeResearch } from "@/lib/youtubeResearch";
import type { YoutubeResearch } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { channelId?: string; fallback?: YoutubeResearch | null };
    const channelId = String(body.channelId ?? "").trim();
    if (!channelId) return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    const youtube = await ensureYoutubeResearch(channelId, body.fallback ?? null);
    if (!youtube) {
      return NextResponse.json({ error: "No YouTube channel pull yet. Run discovery with an API key." }, { status: 404 });
    }
    return NextResponse.json({ youtube });
  } catch (e) {
    const message = e instanceof Error ? e.message : "YouTube research failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
