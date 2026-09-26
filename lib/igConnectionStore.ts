import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type IgConnection = {
  workspaceId: string;
  igUserId: string;
  accessToken: string;
  username: string;
  savedAt: string;
};

const DATA_DIR = process.env.DATA_DIR
  ? process.env.DATA_DIR
  : process.env.VERCEL
    ? path.join("/tmp", "creator-scout")
    : path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "ig-connections.json");

async function readAll(): Promise<IgConnection[]> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as IgConnection[];
  } catch {
    return [];
  }
}

export async function saveIgConnection(row: Omit<IgConnection, "savedAt">): Promise<void> {
  const next: IgConnection = { ...row, savedAt: new Date().toISOString() };
  const rows = await readAll();
  const rest = rows.filter((r) => r.workspaceId !== next.workspaceId);
  rest.unshift(next);
  try {
    await mkdir(path.dirname(FILE), { recursive: true });
    await writeFile(FILE, JSON.stringify(rest.slice(0, 40), null, 2));
  } catch (err) {
    console.error("igConnectionStore: persist failed", err);
  }
}

export async function getIgConnection(workspaceId: string | null): Promise<IgConnection | null> {
  const rows = await readAll();
  if (workspaceId) {
    return rows.find((r) => r.workspaceId === workspaceId) ?? rows[0] ?? null;
  }
  return rows[0] ?? null;
}
