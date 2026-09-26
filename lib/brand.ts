import type { BrandProfile } from "./types";

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
  riskWords: [
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
  ],
  disclosureTags: {
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
  },
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

/** Other advertiser names skip Prenew copy. Empty / Prenew → hackathon demo brand. */
export function mergeBrand(partial?: Partial<BrandProfile>): BrandProfile {
  const name = (partial?.name ?? "").trim();
  const custom = Boolean(name && name.toLowerCase() !== "prenew");
  if (!custom) {
    const pitch = (partial?.pitch ?? "").trim();
    const fromWish = tokensFromText(pitch);
    const refs = parseBrandList(partial?.goodFitWords);
    const rivals = parseBrandList(partial?.competitors);
    return {
      ...PRENEW_BRAND,
      name: "Prenew",
      pitch: pitch || PRENEW_BRAND.pitch,
      goodFitWords: [...new Set([...PRENEW_BRAND.goodFitWords, ...fromWish, ...refs])],
      competitors: rivals.length ? rivals : PRENEW_BRAND.competitors,
      riskWords: partial?.riskWords?.length ? partial.riskWords : PRENEW_BRAND.riskWords,
      disclosureTags: { ...PRENEW_BRAND.disclosureTags, ...partial?.disclosureTags },
    };
  }

  const pitch = (partial?.pitch ?? "").trim();
  const references = parseBrandList(partial?.goodFitWords);
  const rivals = parseBrandList(partial?.competitors);
  const fromCopy = tokensFromText(`${name} ${pitch} ${references.join(" ")}`);
  return {
    name,
    pitch: pitch || `${name} creator collaborations`,
    goodFitWords: [...new Set([...references, ...fromCopy])],
    competitors: rivals,
    riskWords: partial?.riskWords?.length ? partial.riskWords : PRENEW_BRAND.riskWords,
    disclosureTags: { ...PRENEW_BRAND.disclosureTags, ...partial?.disclosureTags },
  };
}
