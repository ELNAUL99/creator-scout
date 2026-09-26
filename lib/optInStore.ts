import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { Platform } from "./types";
import { getSupabaseAdmin } from "./supabase";

export type OptInRecord = {
  id: string;
  platform: Extract<Platform, "tiktok" | "instagram">;
  handle: string;
  displayName: string;
  followers: number | null;
  bio: string;
  consentedAt: string;
  via: "oauth" | "public_handle";
};

// Row shape in the Supabase `opt_ins` table (snake_case columns).
type OptInRow = {
  id: string;
  platform: OptInRecord["platform"];
  handle: string;
  display_name: string;
  followers: number | null;
  bio: string;
  consented_at: string;
  via: OptInRecord["via"];
};

function rowToRecord(r: OptInRow): OptInRecord {
  return {
    id: r.id,
    platform: r.platform,
    handle: r.handle,
    displayName: r.display_name,
    followers: r.followers,
    bio: r.bio,
    consentedAt: r.consented_at,
    via: r.via,
  };
}

// ---- File fallback (local dev / when Supabase is not configured) ----
// Vercel's serverless filesystem is read-only except for /tmp, and /tmp is
// ephemeral and per-instance, so this fallback is not durable in production.
const DATA_DIR = process.env.DATA_DIR
  ? process.env.DATA_DIR
  : process.env.VERCEL
    ? path.join("/tmp", "creator-scout")
    : path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "opt-ins.json");

async function fileReadAll(): Promise<OptInRecord[]> {
  try {
    const raw = await readFile(FILE, "utf8");
    return JSON.parse(raw) as OptInRecord[];
  } catch {
    return [];
  }
}

async function fileWriteAll(rows: OptInRecord[]) {
  try {
    await mkdir(path.dirname(FILE), { recursive: true });
    await writeFile(FILE, JSON.stringify(rows, null, 2), "utf8");
  } catch (err) {
    console.error("optInStore: failed to persist opt-ins to file", err);
  }
}

export async function listOptIns(): Promise<OptInRecord[]> {
  const db = getSupabaseAdmin();
  if (db) {
    const { data, error } = await db
      .from("opt_ins")
      .select("*")
      .order("consented_at", { ascending: false });
    if (error) {
      console.error("optInStore: Supabase list failed", error);
      return [];
    }
    return (data as OptInRow[]).map(rowToRecord);
  }
  return fileReadAll();
}

export async function upsertOptIn(
  row: Omit<OptInRecord, "id" | "consentedAt"> & { id?: string },
): Promise<OptInRecord> {
  const handle = row.handle.replace(/^@/, "").toLowerCase();
  const id = row.id ?? `${row.platform}:${handle}`;
  const next: OptInRecord = {
    id,
    platform: row.platform,
    handle: row.platform === "tiktok" ? `@${handle}` : handle,
    displayName: row.displayName || handle,
    followers: row.followers,
    bio: row.bio,
    consentedAt: new Date().toISOString(),
    via: row.via,
  };

  const db = getSupabaseAdmin();
  if (db) {
    const { error } = await db.from("opt_ins").upsert(
      {
        id: next.id,
        platform: next.platform,
        handle: next.handle,
        display_name: next.displayName,
        followers: next.followers,
        bio: next.bio,
        consented_at: next.consentedAt,
        via: next.via,
      } satisfies OptInRow,
      { onConflict: "id" },
    );
    if (error) console.error("optInStore: Supabase upsert failed", error);
    return next;
  }

  // File fallback
  const rows = await fileReadAll();
  const rest = rows.filter((r) => r.id !== id);
  rest.unshift(next);
  await fileWriteAll(rest);
  return next;
}
