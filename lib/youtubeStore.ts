import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { YoutubeResearch } from "./types";

const DATA_DIR = process.env.DATA_DIR
  ? process.env.DATA_DIR
  : process.env.VERCEL
    ? path.join("/tmp", "creator-scout")
    : path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "youtube-channels.json");
const MAX = 250;

type StoreFile = Record<string, YoutubeResearch>;

async function readAll(): Promise<StoreFile> {
  try {
    const raw = await readFile(FILE, "utf8");
    return JSON.parse(raw) as StoreFile;
  } catch {
    return {};
  }
}

export async function getYoutubeResearch(channelId: string): Promise<YoutubeResearch | null> {
  const all = await readAll();
  return all[channelId] ?? null;
}

export async function saveYoutubeResearch(rows: YoutubeResearch[]): Promise<void> {
  if (!rows.length) return;
  const all = await readAll();
  for (const row of rows) all[row.channelId] = row;
  const ids = Object.keys(all).sort((a, b) => (all[b].pulledAt ?? "").localeCompare(all[a].pulledAt ?? ""));
  const trimmed: StoreFile = {};
  for (const id of ids.slice(0, MAX)) trimmed[id] = all[id];
  try {
    await mkdir(path.dirname(FILE), { recursive: true });
    await writeFile(FILE, JSON.stringify(trimmed, null, 2));
  } catch (err) {
    console.error("youtubeStore: failed to persist", err);
  }
}
