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

// File-based opt-in store. Vercel's serverless filesystem is read-only except
// for /tmp, and /tmp is ephemeral and per-instance, so this is not durable in
// production — good enough for the demo / opt-in showcase.
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

// workspaceId is accepted for signature compatibility but ignored (no multi-tenancy).
export async function listOptIns(_workspaceId?: string | null): Promise<OptInRecord[]> {
  return fileReadAll();
}

export async function upsertOptIn(
  row: Omit<OptInRecord, "id" | "consentedAt"> & { id?: string },
  _workspaceId?: string | null,
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
  const rows = await fileReadAll();
  const rest = rows.filter((r) => r.id !== id);
  rest.unshift(next);
  await fileWriteAll(rest);
  return next;
}
