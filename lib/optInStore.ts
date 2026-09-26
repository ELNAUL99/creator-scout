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

const FILE = path.join(process.cwd(), "data", "opt-ins.json");

async function readAll(): Promise<OptInRecord[]> {
  try {
    const raw = await readFile(FILE, "utf8");
    return JSON.parse(raw) as OptInRecord[];
  } catch {
    return [];
  }
}

async function writeAll(rows: OptInRecord[]) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(rows, null, 2), "utf8");
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
