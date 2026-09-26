import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { Platform } from "./types";

export type LensCapture = {
  name: string;
  platform: Platform;
  bio: string;
  captions: string[];
  followers: number;
  likes: number;
  comments: number;
  views: number;
  country: string | null;
  url: string;
  handle: string;
  savedAt: string;
};

const DATA_DIR = process.env.DATA_DIR
  ? process.env.DATA_DIR
  : process.env.VERCEL
    ? path.join("/tmp", "creator-scout")
    : path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "lens-captures.json");
const MAX = 80;

async function readAll(): Promise<LensCapture[]> {
  try {
    const raw = await readFile(FILE, "utf8");
    return JSON.parse(raw) as LensCapture[];
  } catch {
    return [];
  }
}

export async function listLensCaptures(): Promise<LensCapture[]> {
  return readAll();
}

export async function saveLensCapture(row: Omit<LensCapture, "savedAt">): Promise<void> {
  const next: LensCapture = { ...row, savedAt: new Date().toISOString() };
  const rows = await readAll();
  const key = `${next.platform}:${next.handle.replace(/^@/, "").toLowerCase()}`;
  const rest = rows.filter((r) => `${r.platform}:${r.handle.replace(/^@/, "").toLowerCase()}` !== key);
  rest.unshift(next);
  try {
    await mkdir(path.dirname(FILE), { recursive: true });
    await writeFile(FILE, JSON.stringify(rest.slice(0, MAX), null, 2));
  } catch (err) {
    console.error("lensStore: failed to persist", err);
  }
}
