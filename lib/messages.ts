import { PRENEW_BRAND } from "./brand";
import type { BrandProfile } from "./types";

const TEMPLATES: Record<string, (p: MsgParams) => string> = {
  en: (p) =>
    `Hi ${p.name} — I loved “${p.title}”. I'm reaching out from ${p.brand} about a collab on refurbished gaming PCs that fit your audience. Suggested: ${p.deal}. Your code: ${p.code}. Happy to send a unit or keep it affiliate-only. ${p.tag}`,
  fi: (p) =>
    `Moi ${p.name}! Tykkäsin videosta “${p.title}”. Olen ${p.brand}ilta — kunnostetut pelikoneet sopisivat yleisöllesi. Ehdotus: ${p.deal}. Koodisi: ${p.code}. Voimme lähettää koneen tai aloittaa affiliate-koodilla. ${p.tag}`,
  sv: (p) =>
    `Hej ${p.name}! Jag gillade “${p.title}”. Jag skriver från ${p.brand} om ett samarbete kring renovated gaming-PCs. Förslag: ${p.deal}. Din kod: ${p.code}. ${p.tag}`,
  de: (p) =>
    `Hallo ${p.name}, “${p.title}” hat uns überzeugt. Ich komme von ${p.brand} — refurbished Gaming-PCs für dein Publikum. Vorschlag: ${p.deal}. Code: ${p.code}. ${p.tag}`,
  pl: (p) =>
    `Cześć ${p.name}! Super materiał “${p.title}”. Piszę z ${p.brand} w sprawie współpracy przy odnowionych PC do gier. Propozycja: ${p.deal}. Kod: ${p.code}. ${p.tag}`,
  et: (p) =>
    `Tere ${p.name}! Mulle meeldis “${p.title}”. Kirjutan ${p.brand}ist — taastatud mänguarvutid sinu vaatajatele. Ettepanek: ${p.deal}. Kood: ${p.code}. ${p.tag}`,
  pt: (p) =>
    `Oi ${p.name}! Curti “${p.title}”. Sou da ${p.brand} e queria uma collab com PCs gamer recondicionados. Sugestão: ${p.deal}. Código: ${p.code}. ${p.tag}`,
  es: (p) =>
    `Hola ${p.name}, me encantó “${p.title}”. Te escribo de ${p.brand} para una collab de PCs gaming reacondicionados. Propuesta: ${p.deal}. Código: ${p.code}. ${p.tag}`,
  fr: (p) =>
    `Salut ${p.name} — j’ai adoré “${p.title}”. Je t’écris de ${p.brand} pour une collab PCs gaming reconditionnés. Proposition : ${p.deal}. Code : ${p.code}. ${p.tag}`,
  it: (p) =>
    `Ciao ${p.name}! “${p.title}” è ottimo. Ti scrivo da ${p.brand} per una collab su PC gaming ricondizionati. Proposta: ${p.deal}. Codice: ${p.code}. ${p.tag}`,
  nl: (p) =>
    `Hoi ${p.name}, “${p.title}” was top. Ik mail namens ${p.brand} over een collab met refurbished gaming-PC’s. Voorstel: ${p.deal}. Code: ${p.code}. ${p.tag}`,
  no: (p) =>
    `Hei ${p.name}! Likte “${p.title}”. Jeg skriver fra ${p.brand} om et samarbeid på refurbished gaming-PCer. Forslag: ${p.deal}. Kode: ${p.code}. ${p.tag}`,
  da: (p) =>
    `Hej ${p.name}! Jeg kunne lide “${p.title}”. Jeg skriver fra ${p.brand} om et samarbejde om refurbished gaming-PCer. Forslag: ${p.deal}. Kode: ${p.code}. ${p.tag}`,
  tr: (p) =>
    `Merhaba ${p.name}, “${p.title}” çok iyiydi. ${p.brand}’den yazıyorum: yenilenmiş oyuncu PC’leri için iş birliği. Öneri: ${p.deal}. Kod: ${p.code}. ${p.tag}`,
  ja: (p) =>
    `${p.name}さん、「${p.title}」拝見しました。${p.brand}です。リファービッシュのゲーミングPCでのコラボをご相談したく。提案: ${p.deal}。コード: ${p.code}。${p.tag}`,
  ko: (p) =>
    `${p.name}님, “${p.title}” 잘 봤습니다. ${p.brand}에서 리퍼비시 게이밍 PC 협업을 제안드려요. 제안: ${p.deal}. 코드: ${p.code}. ${p.tag}`,
  vi: (p) =>
    `Chào ${p.name}, mình rất thích video “${p.title}”. Mình liên hệ từ ${p.brand} về collab PC gaming tân trang. Đề xuất: ${p.deal}. Mã: ${p.code}. ${p.tag}`,
};

type MsgParams = {
  name: string;
  title: string;
  brand: string;
  deal: string;
  code: string;
  tag: string;
};

export function affiliateCode(name: string, brandName = "PRENEW") {
  const brand = brandName.replace(/[^A-Za-z0-9]/g, "").slice(0, 10).toUpperCase() || "BRAND";
  const slug = name.replace(/[^A-Za-z0-9]/g, "").slice(0, 10).toUpperCase() || "CREATOR";
  return `${brand}-${slug}`;
}

export function draftMessage(opts: {
  name: string;
  language: string;
  title: string;
  deal: string;
  brand?: BrandProfile;
}) {
  const brand = opts.brand ?? PRENEW_BRAND;
  const prenew = brand.name.trim().toLowerCase() === "prenew";
  const lang = prenew && TEMPLATES[opts.language] ? opts.language : "en";
  const tag = brand.disclosureTags[lang] ?? brand.disclosureTags.en;
  const pitch = brand.pitch.replace(/\s+/g, " ").slice(0, 140);
  const code = affiliateCode(opts.name, brand.name);
  if (!prenew) {
    return `Hi ${opts.name} — I liked “${opts.title.slice(0, 80)}”. I'm reaching out from ${brand.name} (${pitch}) about a collaboration that fits your audience. Suggested: ${opts.deal}. Your code: ${code}. ${tag}`;
  }
  return TEMPLATES[lang]({
    name: opts.name,
    title: opts.title.slice(0, 80),
    brand: brand.name,
    deal: opts.deal,
    code,
    tag,
  });
}

export function ruleReasons(opts: {
  niche: number;
  audience: number;
  engagement: number;
  brand: number;
  recent: number;
  hiddenGem: boolean;
  marketLanguage: boolean;
  brandName?: string;
  prenew?: boolean;
}) {
  const reasons: string[] = [];
  if (opts.niche >= 70) reasons.push("Recent titles match the brief terms, not just a generic channel.");
  else reasons.push("Partial topic overlap — worth a look but not a perfect niche match.");
  if (opts.audience >= 85) reasons.push("Channel country or language lines up with the target market.");
  if (opts.engagement >= 70) reasons.push("Engagement is strong relative to this size tier.");
  if (opts.brand >= 75) {
    reasons.push(
      opts.prenew !== false
        ? "Content already talks budget, used, or PC building — natural brand fit."
        : `Content already overlaps what ${opts.brandName ?? "this brand"} talks about.`,
    );
  }
  if (opts.recent >= 80) reasons.push("Posted in the last month, so outreach is timely.");
  if (opts.hiddenGem) reasons.push("Hidden gem: under 50k followers, fit ≥ 70, no brand-risk flags.");
  return reasons.slice(0, 4);
}

export function hoursSaved(creatorCount: number) {
  return Math.round(((creatorCount * 4) / 60) * 10) / 10;
}
