import { NextResponse } from "next/server";
import { appBaseUrl, readOauthCookie } from "@/lib/oauth";
import { upsertOptIn } from "@/lib/optInStore";
import { saveIgConnection } from "@/lib/igConnectionStore";

type IgUser = {
  id?: string;
  username?: string;
  name?: string;
  biography?: string;
  followers_count?: number;
};

async function igMe(accessToken: string, fields: string) {
  const me = await fetch(
    `https://graph.instagram.com/v21.0/me?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(accessToken)}`,
  );
  return (await me.json()) as IgUser & { error?: { message?: string } };
}

export async function GET(req: Request) {
  const base = appBaseUrl(req);
  const incoming = new URL(req.url);
  const err = incoming.searchParams.get("error");
  if (err) return NextResponse.redirect(`${base}/opt-in?intent=instagram&reason=${encodeURIComponent(err)}`);
  const code = incoming.searchParams.get("code");
  const state = incoming.searchParams.get("state") ?? "";
  const expected = await readOauthCookie("ig_oauth_state");
  if (!code) {
    return NextResponse.redirect(`${base}/opt-in?intent=instagram&reason=oauth_state`);
  }
  if (expected && state && state !== expected) {
    return NextResponse.redirect(`${base}/opt-in?intent=instagram&reason=oauth_state`);
  }
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI?.trim() || `${base}/api/connect/instagram/callback`;
  const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: (process.env.INSTAGRAM_APP_ID ?? "").trim(),
      client_secret: (process.env.INSTAGRAM_APP_SECRET ?? "").trim(),
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    }),
  });
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    user_id?: number | string;
    data?: { access_token?: string; user_id?: number | string }[];
    error_type?: string;
  };
  const accessToken = tokenJson.access_token ?? tokenJson.data?.[0]?.access_token;
  const userId = tokenJson.user_id ?? tokenJson.data?.[0]?.user_id;
  if (!accessToken) {
    return NextResponse.redirect(`${base}/opt-in?intent=instagram&reason=token`);
  }

  let user: IgUser = {};
  for (const fields of [
    "id,username,name,biography,followers_count,media_count,account_type",
    "id,username,name,biography,followers_count",
    "id,username,name",
  ]) {
    const body = await igMe(accessToken, fields);
    if (!body.error && (body.username || body.id)) {
      user = body;
      break;
    }
  }

  const handle = user.username || String(userId || user.id || "instagram");
  await saveIgConnection({
    workspaceId: "local",
    igUserId: String(user.id || userId || ""),
    accessToken,
    username: handle,
  });
  await upsertOptIn({
    platform: "instagram",
    handle,
    displayName: user.name || handle,
    followers: user.followers_count ?? null,
    bio: user.biography ?? "",
    via: "oauth",
  });
  return NextResponse.redirect(`${base}/opt-in?connected=instagram`);
}
