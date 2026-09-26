import { NextResponse } from "next/server";
import { answerCreatorFollowUp } from "@/lib/creatorChat";
import type { ScoredCreator } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      creator?: ScoredCreator;
      history?: { role?: string; content?: string }[];
      question?: string;
    };
    if (!body.creator?.id || !body.creator.displayName) {
      return NextResponse.json({ error: "creator is required" }, { status: 400 });
    }
    const history = (body.history ?? [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-8)
      .map((m) => ({ role: m.role as "user" | "assistant", content: String(m.content).slice(0, 2000) }));
    const result = await answerCreatorFollowUp({
      creator: body.creator,
      history,
      question: String(body.question ?? ""),
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Follow-up failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
