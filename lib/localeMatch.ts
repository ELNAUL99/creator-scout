// Vietnamese-UNIQUE characters only. Deliberately excludes plain Latin diacritics
// (á à â ã é ê í ó ô õ ú, etc.) that Portuguese/Spanish/French/Italian also use —
// otherwise a Portuguese title like "INÍCIO … PORTUGUÊS" false-matches Vietnamese.
const VI_CHARS =
  /[ăơưđảạẻẽẹỉĩịỏọủũụ]|[ầấẩẫậằắẳẵặềếểễệồốổỗộờớởỡợừứửữự]|[ỳỷỹỵ]/i;

const HINTS: Record<string, RegExp> = {
  vi: /\b(việt nam|viet nam|tiếng việt|lắp pc|giá rẻ|card đồ họa|chơi game|choi game|game việt|game viet)\b/i,
  fi: /[äöå]|\b(pelikone|suomi|näytönohjain)\b/i,
  sv: /[äöå]|\b(sverige|grafikkort|dator)\b/i,
  de: /[äöüß]|\b(grafikkarte|gaming-pc|gebraucht)\b/i,
  pl: /[ąćęłńóśźż]|\b(polska|komputer|karta)\b/i,
  et: /[äöõü]|\b(eesti|mänguarvuti)\b/i,
  pt: /[áâãàçéêíóôõú]|\b(brasil|gamer|placa)\b/i,
  ja: /[\u3040-\u30ff\u4e00-\u9faf]/,
  ko: /[\uac00-\ud7af]/,
  tr: /[çğıöşü]|\b(türkiye|ekran kartı)\b/i,
  fr: /[àâçéèêëîïôùûü]|\b(france|carte graphique)\b/i,
  es: /[áéíóúñ¿¡]|\b(españa|méxico)\b/i,
  it: /[àèéìòù]|\b(italia|scheda)\b/i,
  nl: /\b(nederland|grafische kaart)\b/i,
};

export function looksLikeLanguage(text: string, language: string) {
  if (language === "vi") return VI_CHARS.test(text) || HINTS.vi.test(text);
  const hint = HINTS[language];
  if (!hint) return true;
  return hint.test(text);
}

/**
 * Country is a preference, not a hard ISO lock.
 * YouTube country is often blank or “US” even when the channel makes Vietnamese (etc.)
 * to reach that audience. Keep those. Drop channels with a different country and no
 * local-language evidence (so random English “gameplay” hits don’t fill Vietnam).
 */
export function matchesSelectedCountries(
  channelCountry: string | null | undefined,
  selected: string[],
  opts?: { language?: string; text?: string; videoLanguages?: string[] },
) {
  if (!selected.length) return true;
  const cc = (channelCountry ?? "").toUpperCase();
  const allow = new Set(selected.map((s) => s.toUpperCase()));
  if (cc && allow.has(cc)) return true;
  const lang = (opts?.language ?? "en").toLowerCase();
  if (lang === "en") return false;
  const videoHit = (opts?.videoLanguages ?? []).some((l) => l.toLowerCase().split("-")[0] === lang);
  if (videoHit) return true;
  return looksLikeLanguage(opts?.text ?? "", lang);
}

export function belongsToMarket(opts: {
  channelCountry: string | null | undefined;
  targetMarket: string;
  language: string;
  text: string;
}) {
  return matchesSelectedCountries(opts.channelCountry, [opts.targetMarket], {
    language: opts.language,
    text: opts.text,
  });
}
