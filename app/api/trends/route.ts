import { NextResponse } from "next/server";
import { runRisingTrends } from "@/lib/trends";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { markets?: string[]; nicheIds?: string[]; query?: string };
    const result = await runRisingTrends(body.markets ?? [], body.nicheIds ?? [], body.query ?? "");
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Trends failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
