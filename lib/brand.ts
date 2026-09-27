import type { BrandProfile } from "./types";

/** Shared risk flags — not tied to one advertiser. */
export const COMMON_RISK_WORDS = [
  "gambling",
  "betting",
  "casino",
  "odds",
  "crypto giveaway",
  "nft giveaway",
  "stake.com",
  "lootbox gambling",
  "uhkapeli",
  "vedonlyönti",
  "glücksspiel",
  "wetten",
];

export const COMMON_DISCLOSURE_TAGS: Record<string, string> = {
  fi: "#kaupallinenyhteistyö",
  sv: "#reklam",
  de: "#Werbung",
  ja: "#PR",
  ko: "#광고",
  en: "#ad",
  es: "#publi",
  pt: "#publi",
  fr: "#publicité",
  it: "#adv",
  nl: "#ad",
  no: "#reklame",
  da: "#reklame",
  et: "#reklaam",
  pl: "#współpraca",
  tr: "#reklam",
  vi: "#quảngcáo",
};

/** Used when search has no advertiser name — niche/brief only. */
export const GENERIC_BRAND: BrandProfile = {
  name: "",
  pitch: "",
  goodFitWords: [],
  competitors: [],
  riskWords: COMMON_RISK_WORDS,
  disclosureTags: COMMON_DISCLOSURE_TAGS,
};

export const PRENEW_BRAND: BrandProfile = {
  name: "Prenew",
  pitch:
    "Europe's trusted marketplace for tested, graded refurbished gaming PCs — great performance without the new-PC price, plus trade-in for used machines.",
  goodFitWords: [
    "budget",
    "used",
    "refurbished",
    "refurb",
    "repair",
    "pc build",
    "pc building",
    "second-hand",
    "second hand",
    "pre-owned",
    "upgrade",
    "value",
    "pelikone",
    "kunnostettu",
    "gebraucht",
    "gaming-pc",
    "grafikkarte",
    "usato",
    "recondicionado",
    "giá rẻ",
    "tân trang",
    "lắp pc",
  ],
  competitors: [
    "back market",
    "backmarket",
    "refurbed",
    "cex",
    "swappie",
    "gazelle",
    "musicmagpie",
  ],
  riskWords: COMMON_RISK_WORDS,
  disclosureTags: COMMON_DISCLOSURE_TAGS,
};

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "your",
  "you",
  "our",
  "are",
  "was",
  "without",
  "plus",
  "into",
  "about",
  "their",
  "them",
  "have",
  "has",
  "been",
  "will",
  "just",
  "more",
  "than",
  "then",
  "also",
  "very",
  "make",
  "made",
  "using",
  "used",
]);

export function parseBrandList(raw: string | string[] | undefined) {
  const parts = Array.isArray(raw) ? raw : (raw ?? "").split(/[,;\n]+/);
  return [...new Set(parts.map((s) => s.trim()).filter((s) => s.length > 1))];
}

export function tokensFromText(text: string) {
  return [...new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9äöåàâçéèêëîïôùûüáíóúñ]+/i)
      .map((w) => w.trim())
      .filter((w) => w.length > 3 && !STOP.has(w)),
  )];
}

export function isPrenewBrand(brand: BrandProfile) {
  return brand.name.trim().toLowerCase() === "prenew";
}

/**
 * Empty name → generic advertiser (niche/brief only).
 * Name “Prenew” → hackathon demo brand. Any other name → that advertiser.
 */
export function mergeBrand(partial?: Partial<BrandProfile>): BrandProfile {
  const name = (partial?.name ?? "").trim();
  const pitch = (partial?.pitch ?? "").trim();
  const fromWish = tokensFromText(pitch);
  const refs = parseBrandList(partial?.goodFitWords);
  const rivals = parseBrandList(partial?.competitors);
  const riskWords = partial?.riskWords?.length ? partial.riskWords : COMMON_RISK_WORDS;
  const disclosureTags = { ...COMMON_DISCLOSURE_TAGS, ...partial?.disclosureTags };

  if (name.toLowerCase() === "prenew") {
    return {
      ...PRENEW_BRAND,
      pitch: pitch || PRENEW_BRAND.pitch,
      goodFitWords: [...new Set([...PRENEW_BRAND.goodFitWords, ...fromWish, ...refs])],
      competitors: rivals.length ? rivals : PRENEW_BRAND.competitors,
      riskWords,
      disclosureTags,
    };
  }

  if (!name) {
    return {
      ...GENERIC_BRAND,
      pitch,
      goodFitWords: [...new Set([...fromWish, ...refs])],
      competitors: rivals,
      riskWords,
      disclosureTags,
    };
  }

  const fromCopy = tokensFromText(`${name} ${pitch} ${refs.join(" ")}`);
  return {
    name,
    pitch: pitch || `${name} creator collaborations`,
    goodFitWords: [...new Set([...refs, ...fromCopy])],
    competitors: rivals,
    riskWords,
    disclosureTags,
  };
}
