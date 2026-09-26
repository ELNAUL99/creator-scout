import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { Platform } from "./types";

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

// Vercel's serverless filesystem is read-only except for /tmp. Use a writable
// directory there in production; fall back to the repo's data/ dir locally.
// Note: /tmp is ephemeral (per-instance, not shared or durable) — swap this for
// a real datastore (KV/Postgres) when opt-ins must persist across invocations.
const DATA_DIR = process.env.DATA_DIR
  ? process.env.DATA_DIR
  : process.env.VERCEL
    ? path.join("/tmp", "creator-scout")
    : path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "opt-ins.json");

async function readAll(): Promise<OptInRecord[]> {
  try {
    const raw = await readFile(FILE, "utf8");
    return JSON.parse(raw) as OptInRecord[];
  } catch {
    return [];
  }
}

async function writeAll(rows: OptInRecord[]) {
  try {
    await mkdir(path.dirname(FILE), { recursive: true });
    await writeFile(FILE, JSON.stringify(rows, null, 2), "utf8");
  } catch (err) {
    // Never let a persistence failure crash the OAuth callback. Log and continue.
    console.error("optInStore: failed to persist opt-ins", err);
  }
}

export async function listOptIns() {
  return readAll();
}

export async function upsertOptIn(row: Omit<OptInRecord, "id" | "consentedAt"> & { id?: string }) {
  const rows = await readAll();
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
  const rest = rows.filter((r) => r.id !== id);
  rest.unshift(next);
  await writeAll(rest);
  return next;
}
