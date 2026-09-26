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
    "refurbished",
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

export function mergeBrand(partial?: Partial<BrandProfile>): BrandProfile {
  const pitch = (partial?.pitch ?? "").trim();
  const fromWish = pitch
    ? pitch
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .filter((w) => w.length > 3)
    : [];
  const baseWords = pitch ? fromWish : PRENEW_BRAND.goodFitWords;
  return {
    ...PRENEW_BRAND,
    ...partial,
    pitch: pitch || PRENEW_BRAND.pitch,
    goodFitWords: [...new Set([...(partial?.goodFitWords ?? baseWords), ...fromWish])],
    competitors: partial?.competitors ?? PRENEW_BRAND.competitors,
    riskWords: partial?.riskWords ?? PRENEW_BRAND.riskWords,
    disclosureTags: { ...PRENEW_BRAND.disclosureTags, ...partial?.disclosureTags },
  };
}
