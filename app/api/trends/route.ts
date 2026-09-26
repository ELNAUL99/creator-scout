import { NextResponse } from "next/server";
import { isNicheId } from "@/lib/niches";
import { runRisingTrends } from "@/lib/trends";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { markets?: string[]; nicheIds?: string[]; query?: string };
    const markets = (body.markets ?? []).map((m) => m.toUpperCase()).filter(Boolean);
    if (!markets.length) {
      return NextResponse.json({ error: "Pick at least one country" }, { status: 400 });
    }
    const nicheIds = (body.nicheIds ?? []).filter(isNicheId);
    const result = await runRisingTrends(markets, nicheIds, body.query ?? "");
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Trends failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
