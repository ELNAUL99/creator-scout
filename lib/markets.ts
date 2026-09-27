export type Market = {
  code: string;
  name: string;
  region: string;
  language: string;
  languageName: string;
  ytRegion: string;
};

export const MARKETS: Market[] = [
  { code: "FI", name: "Finland", region: "Nordics & Baltics", language: "fi", languageName: "Finnish", ytRegion: "FI" },
  { code: "SE", name: "Sweden", region: "Nordics & Baltics", language: "sv", languageName: "Swedish", ytRegion: "SE" },
  { code: "NO", name: "Norway", region: "Nordics & Baltics", language: "no", languageName: "Norwegian", ytRegion: "NO" },
  { code: "DK", name: "Denmark", region: "Nordics & Baltics", language: "da", languageName: "Danish", ytRegion: "DK" },
  { code: "IS", name: "Iceland", region: "Nordics & Baltics", language: "is", languageName: "Icelandic", ytRegion: "IS" },
  { code: "EE", name: "Estonia", region: "Nordics & Baltics", language: "et", languageName: "Estonian", ytRegion: "EE" },
  { code: "LV", name: "Latvia", region: "Nordics & Baltics", language: "lv", languageName: "Latvian", ytRegion: "LV" },
  { code: "LT", name: "Lithuania", region: "Nordics & Baltics", language: "lt", languageName: "Lithuanian", ytRegion: "LT" },
  { code: "DE", name: "Germany", region: "DACH & Benelux", language: "de", languageName: "German", ytRegion: "DE" },
  { code: "AT", name: "Austria", region: "DACH & Benelux", language: "de", languageName: "German", ytRegion: "AT" },
  { code: "CH", name: "Switzerland", region: "DACH & Benelux", language: "de", languageName: "German", ytRegion: "CH" },
  { code: "NL", name: "Netherlands", region: "DACH & Benelux", language: "nl", languageName: "Dutch", ytRegion: "NL" },
  { code: "BE", name: "Belgium", region: "DACH & Benelux", language: "fr", languageName: "French", ytRegion: "BE" },
  { code: "LU", name: "Luxembourg", region: "DACH & Benelux", language: "fr", languageName: "French", ytRegion: "LU" },
  { code: "GB", name: "United Kingdom", region: "Western & Southern Europe", language: "en", languageName: "English", ytRegion: "GB" },
  { code: "IE", name: "Ireland", region: "Western & Southern Europe", language: "en", languageName: "English", ytRegion: "IE" },
  { code: "FR", name: "France", region: "Western & Southern Europe", language: "fr", languageName: "French", ytRegion: "FR" },
  { code: "ES", name: "Spain", region: "Western & Southern Europe", language: "es", languageName: "Spanish", ytRegion: "ES" },
  { code: "PT", name: "Portugal", region: "Western & Southern Europe", language: "pt", languageName: "Portuguese", ytRegion: "PT" },
  { code: "IT", name: "Italy", region: "Western & Southern Europe", language: "it", languageName: "Italian", ytRegion: "IT" },
  { code: "GR", name: "Greece", region: "Western & Southern Europe", language: "el", languageName: "Greek", ytRegion: "GR" },
  { code: "PL", name: "Poland", region: "Central & Eastern Europe", language: "pl", languageName: "Polish", ytRegion: "PL" },
  { code: "CZ", name: "Czechia", region: "Central & Eastern Europe", language: "cs", languageName: "Czech", ytRegion: "CZ" },
  { code: "HU", name: "Hungary", region: "Central & Eastern Europe", language: "hu", languageName: "Hungarian", ytRegion: "HU" },
  { code: "RO", name: "Romania", region: "Central & Eastern Europe", language: "ro", languageName: "Romanian", ytRegion: "RO" },
  { code: "TR", name: "Türkiye", region: "Central & Eastern Europe", language: "tr", languageName: "Turkish", ytRegion: "TR" },
  { code: "UA", name: "Ukraine", region: "Central & Eastern Europe", language: "uk", languageName: "Ukrainian", ytRegion: "UA" },
  { code: "US", name: "United States", region: "Americas", language: "en", languageName: "English", ytRegion: "US" },
  { code: "CA", name: "Canada", region: "Americas", language: "en", languageName: "English", ytRegion: "CA" },
  { code: "MX", name: "Mexico", region: "Americas", language: "es", languageName: "Spanish", ytRegion: "MX" },
  { code: "BR", name: "Brazil", region: "Americas", language: "pt", languageName: "Portuguese", ytRegion: "BR" },
  { code: "AR", name: "Argentina", region: "Americas", language: "es", languageName: "Spanish", ytRegion: "AR" },
  { code: "CO", name: "Colombia", region: "Americas", language: "es", languageName: "Spanish", ytRegion: "CO" },
  { code: "CL", name: "Chile", region: "Americas", language: "es", languageName: "Spanish", ytRegion: "CL" },
  { code: "JP", name: "Japan", region: "Asia-Pacific", language: "ja", languageName: "Japanese", ytRegion: "JP" },
  { code: "KR", name: "South Korea", region: "Asia-Pacific", language: "ko", languageName: "Korean", ytRegion: "KR" },
  { code: "IN", name: "India", region: "Asia-Pacific", language: "hi", languageName: "Hindi", ytRegion: "IN" },
  { code: "ID", name: "Indonesia", region: "Asia-Pacific", language: "id", languageName: "Indonesian", ytRegion: "ID" },
  { code: "PH", name: "Philippines", region: "Asia-Pacific", language: "fil", languageName: "Filipino", ytRegion: "PH" },
  { code: "AU", name: "Australia", region: "Asia-Pacific", language: "en", languageName: "English", ytRegion: "AU" },
  { code: "NZ", name: "New Zealand", region: "Asia-Pacific", language: "en", languageName: "English", ytRegion: "NZ" },
  { code: "SG", name: "Singapore", region: "Asia-Pacific", language: "en", languageName: "English", ytRegion: "SG" },
  { code: "VN", name: "Vietnam", region: "Asia-Pacific", language: "vi", languageName: "Vietnamese", ytRegion: "VN" },
  { code: "AE", name: "UAE", region: "Middle East & Africa", language: "ar", languageName: "Arabic", ytRegion: "AE" },
  { code: "SA", name: "Saudi Arabia", region: "Middle East & Africa", language: "ar", languageName: "Arabic", ytRegion: "SA" },
  { code: "ZA", name: "South Africa", region: "Middle East & Africa", language: "en", languageName: "English", ytRegion: "ZA" },
  { code: "NG", name: "Nigeria", region: "Middle East & Africa", language: "en", languageName: "English", ytRegion: "NG" },
  { code: "KE", name: "Kenya", region: "Middle East & Africa", language: "en", languageName: "English", ytRegion: "KE" },
  { code: "EG", name: "Egypt", region: "Middle East & Africa", language: "ar", languageName: "Arabic", ytRegion: "EG" },
];

export const DEFAULT_MARKETS = ["FI", "SE", "DE", "PL", "EE", "BR"];

export const MARKET_REGIONS = [...new Set(MARKETS.map((m) => m.region))];

export function getMarket(code: string): Market {
  return (
    MARKETS.find((m) => m.code === code.toUpperCase()) ?? {
      code: code.toUpperCase(),
      name: code.toUpperCase(),
      region: "Other",
      language: "en",
      languageName: "English",
      ytRegion: code.toUpperCase(),
    }
  );
}

/** English country name plus how people search locally (e.g. Suomi, not only Finland). */
const LOCAL_PLACE_NAMES: Record<string, string[]> = {
  FI: ["Suomi"],
  SE: ["Sverige"],
  NO: ["Norge"],
  DK: ["Danmark"],
  IS: ["Ísland"],
  EE: ["Eesti"],
  LV: ["Latvija"],
  LT: ["Lietuva"],
  DE: ["Deutschland"],
  AT: ["Österreich"],
  CH: ["Schweiz"],
  NL: ["Nederland"],
  BE: ["België", "Belgique"],
  FR: ["France"],
  ES: ["España"],
  PT: ["Portugal"],
  IT: ["Italia"],
  PL: ["Polska"],
  CZ: ["Česko"],
  HU: ["Magyarország"],
  RO: ["România"],
  TR: ["Türkiye"],
  UA: ["Україна"],
  BR: ["Brasil"],
  MX: ["México"],
  JP: ["日本"],
  KR: ["한국"],
  VN: ["Việt Nam", "Viet Nam"],
  ID: ["Indonesia"],
};

export function countrySearchLabels(market: { code: string; name: string }): string[] {
  return [...new Set([market.name, ...(LOCAL_PLACE_NAMES[market.code.toUpperCase()] ?? [])])];
}
