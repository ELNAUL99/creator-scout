import type { ScoredCreator } from "./types";

/** Client sends 100_000_000 when max is “any”. */
const UNBOUNDED_MAX = 100_000_000;

export function sizeMaxBound(sizeMax: number): number {
  if (sizeMax <= 0 || sizeMax >= UNBOUNDED_MAX) return Infinity;
  return sizeMax;
}

export function sizeRangeActive(sizeMin: number, sizeMax: number): boolean {
  return sizeMin > 0 || sizeMaxBound(sizeMax) !== Infinity;
}

/** Unknown / hidden subscriber counts do not satisfy a numeric range. */
export function followersMatchSize(
  followers: number | null | undefined,
  sizeMin: number,
  sizeMax: number,
): boolean {
  if (!sizeRangeActive(sizeMin, sizeMax)) return true;
  const n = followers ?? 0;
  if (n <= 0) return false;
  if (n < Math.max(0, sizeMin)) return false;
  const max = sizeMaxBound(sizeMax);
  if (n > max) return false;
  return true;
}

export function filterCreatorsBySize(
  creators: ScoredCreator[],
  sizeMin: number,
  sizeMax: number,
): ScoredCreator[] {
  return creators.filter((c) => {
    if (c.accounts.some((a) => a.platform === "twitch")) return true;
    return followersMatchSize(c.followers, sizeMin, sizeMax);
  });
}

