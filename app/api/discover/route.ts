import { NextResponse } from "next/server";
import { NICHE_TERMS, isNicheId } from "@/lib/niches";
import { runDiscover } from "@/lib/pipeline";
import type { DiscoverRequest } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as DiscoverRequest;
    const nicheIds = (body.nicheIds ?? []).filter(isNicheId);
    if (!body.markets?.length || !nicheIds.length) {
      return NextResponse.json({ error: "niche and markets are required" }, { status: 400 });
    }
    const brief = nicheIds.map((id) => NICHE_TERMS[id].label).join(", ");
    const result = await runDiscover({
      brief,
      markets: body.markets.slice(0, 8),
      nicheIds,
      nicheId: body.nicheId,
      sizeMin: body.sizeMin ?? 10_000,
      sizeMax: body.sizeMax ?? 250_000,
      includeNano: body.includeNano ?? true,
      includeMacro: body.includeMacro ?? true,
      timeWindowDays: body.timeWindowDays ?? 90,
      platforms: body.platforms?.length ? body.platforms : ["youtube", "tiktok", "instagram"],
      brand: body.brand,
      mode: body.mode ?? "auto",
      youtubeApiKey: body.youtubeApiKey,
      webDiscover: body.webDiscover !== false,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Discover failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
