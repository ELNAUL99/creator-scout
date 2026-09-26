import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { BrandProfile } from "./types";

const DATA_DIR = process.env.DATA_DIR
  ? process.env.DATA_DIR
  : process.env.VERCEL
    ? path.join("/tmp", "creator-scout")
    : path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "active-brand.json");

export async function saveActiveBrand(brand: BrandProfile): Promise<void> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(FILE, JSON.stringify(brand, null, 2));
  } catch (err) {
    console.error("brandStore: failed to persist", err);
  }
}

export async function loadActiveBrand(): Promise<BrandProfile | null> {
  try {
    const raw = await readFile(FILE, "utf8");
    return JSON.parse(raw) as BrandProfile;
  } catch {
    return null;
  }
}
