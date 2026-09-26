const VI_CHARS =
  /[ăâêôơưđáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;

const HINTS: Record<string, RegExp> = {
  vi: /\b(việt nam|viet nam|tiếng việt|lắp pc|giá rẻ|card đồ họa)\b/i,
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

export function belongsToMarket(opts: {
  channelCountry: string | null | undefined;
  targetMarket: string;
  language: string;
  text: string;
}) {
  const cc = (opts.channelCountry ?? "").toUpperCase();
  const target = opts.targetMarket.toUpperCase();
  if (cc === target) return true;
  if (cc && cc !== target) {
    return looksLikeLanguage(opts.text, opts.language);
  }
  if (opts.language === "en") return true;
  return looksLikeLanguage(opts.text, opts.language);
}
