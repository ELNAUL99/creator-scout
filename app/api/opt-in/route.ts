import { NextResponse } from "next/server";
import { listOptIns, upsertOptIn } from "@/lib/optInStore";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { supabaseAuthConfigured } from "@/lib/supabaseServer";
import type { Platform } from "@/lib/types";

export async function GET() {
  const workspaceId = await getCurrentWorkspaceId();
  if (supabaseAuthConfigured() && !workspaceId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({ creators: await listOptIns(workspaceId) });
}

export async function POST(req: Request) {
  const workspaceId = await getCurrentWorkspaceId();
  if (supabaseAuthConfigured() && !workspaceId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const body = (await req.json()) as {
    platform?: Platform;
    handle?: string;
    displayName?: string;
    consent?: boolean;
  };
  if (!body.consent) {
    return NextResponse.json({ error: "Consent is required to store your profile." }, { status: 400 });
  }
  const platform = body.platform === "instagram" ? "instagram" : body.platform === "tiktok" ? "tiktok" : null;
  const handle = (body.handle ?? "").trim().replace(/^@/, "");
  if (!platform || !handle || !/^[A-Za-z0-9._]{2,30}$/.test(handle)) {
    return NextResponse.json({ error: "Enter a public TikTok or Instagram username." }, { status: 400 });
  }
  const saved = await upsertOptIn(
    {
      platform,
      handle,
      displayName: (body.displayName ?? "").trim() || handle,
      followers: null,
      bio: "",
      via: "public_handle",
    },
    workspaceId,
  );
  return NextResponse.json({ creator: saved });
}
