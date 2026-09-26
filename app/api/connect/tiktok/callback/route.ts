import { NextResponse } from "next/server";
import { appBaseUrl, readOauthCookie } from "@/lib/oauth";
import { upsertOptIn } from "@/lib/optInStore";
import { getCurrentWorkspaceId } from "@/lib/auth";

type TikTokUser = {
  open_id?: string;
  display_name?: string;
  username?: string;
  bio_description?: string;
  follower_count?: number;
};

async function tiktokUserInfo(accessToken: string, fields: string) {
  const me = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${encodeURIComponent(fields)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return (await me.json()) as {
    data?: { user?: TikTokUser };
    error?: { code?: string; message?: string };
  };
}

export async function GET(req: Request) {
  const base = appBaseUrl(req);
  const incoming = new URL(req.url);
  const err = incoming.searchParams.get("error");
  if (err) return NextResponse.redirect(`${base}/opt-in?intent=tiktok&reason=${encodeURIComponent(err)}`);
  const code = incoming.searchParams.get("code");
  const state = incoming.searchParams.get("state") ?? "";
  const expected = await readOauthCookie("tt_oauth_state");
  const verifier = await readOauthCookie("tt_code_verifier");
  if (!code || !state || state !== expected) {
    return NextResponse.redirect(`${base}/opt-in?intent=tiktok&reason=oauth_state`);
  }
  const redirectUri = process.env.TIKTOK_REDIRECT_URI?.trim() || `${base}/api/connect/tiktok/callback`;
  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: (process.env.TIKTOK_CLIENT_KEY ?? "").trim(),
      client_secret: (process.env.TIKTOK_CLIENT_SECRET ?? "").trim(),
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  });
  const token = (await tokenRes.json()) as { access_token?: string; scope?: string; error?: string };
  if (!token.access_token) {
    return NextResponse.redirect(`${base}/opt-in?intent=tiktok&reason=token`);
  }

  const granted = token.scope ?? "";
  const fields = ["open_id", "display_name"];
  if (granted.includes("user.info.profile") || !granted) {
    fields.push("username", "bio_description", "profile_deep_link");
  }
  if (granted.includes("user.info.stats") || !granted) {
    fields.push("follower_count", "likes_count", "video_count");
  }

  let user: TikTokUser | undefined;
  for (const set of [fields.join(","), "open_id,display_name,username,bio_description", "open_id,display_name,bio_description", "open_id,display_name"]) {
    const body = await tiktokUserInfo(token.access_token, set);
    const ok = !body.error || body.error.code === "ok";
    if (ok && body.data?.user) {
      user = body.data.user;
      break;
    }
  }

  const handle = user?.username || user?.open_id || "tiktok";
  const workspaceId = await getCurrentWorkspaceId();
  await upsertOptIn(
    {
      platform: "tiktok",
      handle,
      displayName: user?.display_name || handle,
      followers: user?.follower_count ?? null,
      bio: user?.bio_description ?? "",
      via: "oauth",
    },
    workspaceId,
  );
  return NextResponse.redirect(`${base}/opt-in?connected=tiktok`);
}
