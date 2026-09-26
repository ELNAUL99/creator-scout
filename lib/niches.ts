export const NICHE_IDS = [
  "gaming",
  "pc-building",
  "budget-second-hand",
  "tech-reviews",
  "sustainability",
  "beauty",
  "fitness",
  "food",
  "travel",
  "fashion",
  "parenting",
  "personal-finance",
  "diy-home",
  "pets",
  "fps-esports",
] as const;

export type NicheId = (typeof NICHE_IDS)[number];

type TermsByLang = Record<string, string[]>;

export const NICHE_TERMS: Record<NicheId, { label: string; terms: TermsByLang }> = {
  gaming: {
    label: "Gaming",
    terms: {
      en: ["gameplay", "let's play"],
      es: ["gameplay", "let's play"],
      pt: ["gameplay", "let's play"],
      fr: ["gameplay", "let's play"],
      de: ["Gameplay", "Let's Play"],
      it: ["gameplay", "let's play"],
      nl: ["gameplay", "let's play"],
      sv: ["gameplay", "let's play"],
      no: ["gameplay", "let's play"],
      da: ["gameplay", "let's play"],
      fi: ["pelivideo", "let's play"],
      et: ["gameplay", "let's play"],
      pl: ["gameplay", "zagrajmy"],
      tr: ["oyun videosu", "gameplay"],
      ja: ["実況", "ゲームプレイ"],
      ko: ["게임플레이", "실황"],
      vi: ["gameplay", "chơi game"],
    },
  },
  "pc-building": {
    label: "PC building",
    terms: {
      en: ["PC build", "custom PC"],
      es: ["montar PC", "PC a medida"],
      pt: ["montar PC", "PC customizado"],
      fr: ["montage PC", "PC sur mesure"],
      de: ["Gaming-PC", "Grafikkarte"],
      it: ["assemblare PC", "build PC"],
      nl: ["PC bouwen", "zelfbouw PC"],
      sv: ["bygga dator", "PC-bygge"],
      no: ["PC-bygging", "bygge PC"],
      da: ["PC-byg", "bygge computer"],
      fi: ["pelikone", "näytönohjain"],
      et: ["arvuti ehitamine", "graafikakaart"],
      pl: ["składanie PC", "karta graficzna"],
      tr: ["PC toplama", "ekran kartı"],
      ja: ["自作PC", "グラボ"],
      ko: ["조립PC", "그래픽카드"],
      vi: ["build PC", "lắp PC"],
    },
  },
  "budget-second-hand": {
    label: "Budget & second-hand",
    terms: {
      en: ["budget gaming PC", "used GPU"],
      es: ["PC barato", "segunda mano"],
      pt: ["PC barato", "usado"],
      fr: ["PC pas cher", "occasion"],
      de: ["günstiger Gaming-PC", "gebrauchte Grafikkarte"],
      it: ["PC economico", "usato"],
      nl: ["goedkope gaming PC", "tweedehands"],
      sv: ["budgetdator", "begagnad"],
      no: ["billig gaming-PC", "brukt"],
      da: ["billig gaming-PC", "brugt"],
      fi: ["edullinen pelikone", "käytetty näytönohjain"],
      et: ["odav mänguarvuti", "kasutatud"],
      pl: ["tani komputer do gier", "używana karta"],
      tr: ["ucuz oyuncu PC", "ikinci el"],
      ja: ["格安ゲーミングPC", "中古グラボ"],
      ko: ["가성비 게이밍PC", "중고 그래픽카드"],
      vi: ["PC gaming giá rẻ", "card đồ họa cũ"],
    },
  },
  "tech-reviews": {
    label: "Tech reviews",
    terms: {
      en: ["tech review", "GPU review"],
      es: ["review tecnología", "análisis GPU"],
      pt: ["review tech", "análise GPU"],
      fr: ["test tech", "test GPU"],
      de: ["Techniktest", "Grafikkarten-Test"],
      it: ["recensione tech", "recensione GPU"],
      nl: ["tech review", "GPU review"],
      sv: ["tech-recension", "grafikkort test"],
      no: ["teknologitest", "GPU-test"],
      da: ["tech-anmeldelse", "GPU-test"],
      fi: ["laitearvostelu", "näytönohjain testi"],
      et: ["tehnikaülevaade", "GPU test"],
      pl: ["recenzja sprzętu", "test GPU"],
      tr: ["teknoloji inceleme", "ekran kartı test"],
      ja: ["ガジェットレビュー", "グラボレビュー"],
      ko: ["테크리뷰", "그래픽카드 리뷰"],
      vi: ["review công nghệ", "review GPU"],
    },
  },
  sustainability: {
    label: "Sustainability",
    terms: {
      en: ["refurbished electronics", "repair not replace"],
      es: ["electrónica reacondicionada", "reparar"],
      pt: ["eletrônicos recondicionados", "reparar"],
      fr: ["électronique reconditionnée", "réparer"],
      de: ["refurbished", "reparieren statt wegwerfen"],
      it: ["elettronica ricondizionata", "riparare"],
      nl: ["refurbished", "repareren"],
      sv: ["renoverad elektronik", "laga istället"],
      no: ["refurbish", "reparere"],
      da: ["renoveret elektronik", "reparere"],
      fi: ["kunnostettu elektroniikka", "korjaa älä heitä"],
      et: ["renoveeritud elektroonika", "paranda"],
      pl: ["elektronika refurbished", "naprawiaj"],
      tr: ["yenilenmiş elektronik", "tamir et"],
      ja: ["リファービッシュ", "修理して使う"],
      ko: ["리퍼비시", "수리해서 쓰기"],
      vi: ["điện tử tân trang", "sửa chữa"],
    },
  },
  beauty: {
    label: "Beauty",
    terms: {
      en: ["makeup tutorial", "skincare routine"],
      es: ["tutorial maquillaje", "rutina skincare"],
      pt: ["tutorial maquiagem", "skincare"],
      fr: ["tutoriel maquillage", "routine skincare"],
      de: ["Make-up Tutorial", "Hautpflege"],
      it: ["tutorial makeup", "skincare"],
      nl: ["make-up tutorial", "huidverzorging"],
      sv: ["sminktutorial", "hudvård"],
      no: ["sminketutorial", "hudpleie"],
      da: ["makeup tutorial", "hudpleje"],
      fi: ["meikkivideo", "ihonhoito"],
      et: ["meigitutorial", "nahahooldus"],
      pl: ["makijaż tutorial", "pielęgnacja"],
      tr: ["makyaj tutorial", "cilt bakımı"],
      ja: ["メイク動画", "スキンケア"],
      ko: ["메이크업 튜토리얼", "스킨케어"],
      vi: ["makeup tutorial", "skincare"],
    },
  },
  fitness: {
    label: "Fitness",
    terms: {
      en: ["home workout", "gym routine"],
      es: ["entrenamiento en casa", "rutina gym"],
      pt: ["treino em casa", "academia"],
      fr: ["sport maison", "séance salle"],
      de: ["Home Workout", "Fitnessstudio"],
      it: ["allenamento casa", "palestra"],
      nl: ["thuis trainen", "sportschool"],
      sv: ["hemmagympa", "gymrutin"],
      no: ["hjemmetrening", "gym"],
      da: ["hjemmetræning", "fitness"],
      fi: ["kotitreeni", "kuntosali"],
      et: ["kodune treening", "jõusaal"],
      pl: ["trening w domu", "siłownia"],
      tr: ["evde spor", "salon antrenman"],
      ja: ["自宅トレーニング", "筋トレ"],
      ko: ["홈트", "헬스 루틴"],
      vi: ["tập gym tại nhà", "workout"],
    },
  },
  food: {
    label: "Food",
    terms: {
      en: ["easy recipe", "home cooking"],
      es: ["receta fácil", "cocina casera"],
      pt: ["receita fácil", "comida caseira"],
      fr: ["recette facile", "cuisine maison"],
      de: ["einfaches Rezept", "Hausmannskost"],
      it: ["ricetta facile", "cucina casalinga"],
      nl: ["makkelijk recept", "thuis koken"],
      sv: ["enkelt recept", "hemmamat"],
      no: ["enkelt oppskrift", "hjemmelaget"],
      da: ["nem opskrift", "hjemmelavet"],
      fi: ["helppo resepti", "kotiruoka"],
      et: ["lihtne retsept", "kodutoit"],
      pl: ["łatwy przepis", "domowe jedzenie"],
      tr: ["kolay tarif", "ev yemeği"],
      ja: ["簡単レシピ", "家庭料理"],
      ko: ["쉬운 레시피", "집밥"],
      vi: ["công thức nấu ăn", "nấu ăn"],
    },
  },
  travel: {
    label: "Travel",
    terms: {
      en: ["travel vlog", "budget travel"],
      es: ["vlog viaje", "viajar barato"],
      pt: ["vlog viagem", "viajar barato"],
      fr: ["vlog voyage", "voyage pas cher"],
      de: ["Reisevlog", "günstig reisen"],
      it: ["vlog viaggio", "viaggiare low cost"],
      nl: ["reisvlog", "goedkoop reizen"],
      sv: ["resevlogg", "budgetresa"],
      no: ["reisevlogg", "billigreise"],
      da: ["rejsevlog", "billigrejse"],
      fi: ["matkavlogi", "edullinen matka"],
      et: ["reisivlogi", "odav reis"],
      pl: ["vlog podróżniczy", "tanie podróże"],
      tr: ["seyahat vlog", "ucuz tatil"],
      ja: ["旅行vlog", "格安旅行"],
      ko: ["여행 브이로그", "가성비 여행"],
      vi: ["vlog du lịch", "du lịch giá rẻ"],
    },
  },
  fashion: {
    label: "Fashion",
    terms: {
      en: ["outfit ideas", "thrift fashion"],
      es: ["ideas de looks", "moda second hand"],
      pt: ["looks", "moda usada"],
      fr: ["idées tenues", "friperie"],
      de: ["Outfit Ideen", "Second-Hand Mode"],
      it: ["outfit", "moda vintage"],
      nl: ["outfit ideeën", "tweedehands mode"],
      sv: ["outfitidéer", "secondhand mode"],
      no: ["antrekk", "brukt mote"],
      da: ["outfit", "genbrugsmode"],
      fi: ["asuehdotukset", "kirpputorimuoti"],
      et: ["riietusideed", "taaskasutusmood"],
      pl: ["stylizacje", "second hand"],
      tr: ["kombin", "second hand moda"],
      ja: ["コーディネート", "古着ファッション"],
      ko: ["코디", "빈티지 패션"],
      vi: ["phối đồ", "thrift"],
    },
  },
  parenting: {
    label: "Parenting",
    terms: {
      en: ["parenting tips", "family vlog"],
      es: ["consejos padres", "vlog familiar"],
      pt: ["dicas para pais", "vlog família"],
      fr: ["conseils parents", "vlog famille"],
      de: ["Erziehungstipps", "Familienvlog"],
      it: ["consigli genitori", "vlog famiglia"],
      nl: ["oudertips", "familie vlog"],
      sv: ["föräldratips", "familjevlogg"],
      no: ["foreldretips", "familievlogg"],
      da: ["forældretips", "familievlog"],
      fi: ["vanhemmuusvinkit", "perhevlogi"],
      et: ["lapsevanema nõuanded", "perevlogi"],
      pl: ["porady dla rodziców", "vlog rodzinny"],
      tr: ["ebeveyn ipuçları", "aile vlog"],
      ja: ["子育てtips", "家族vlog"],
      ko: ["육아 팁", "가족 브이로그"],
      vi: ["tips nuôi con", "vlog gia đình"],
    },
  },
  "personal-finance": {
    label: "Personal finance",
    terms: {
      en: ["save money", "budget tips"],
      es: ["ahorrar dinero", "presupuesto"],
      pt: ["economizar dinheiro", "orçamento"],
      fr: ["économiser", "budget"],
      de: ["Geld sparen", "Haushaltsbudget"],
      it: ["risparmiare soldi", "budget"],
      nl: ["geld besparen", "budgetteren"],
      sv: ["spara pengar", "privatekonomi"],
      no: ["spare penger", "budsjett"],
      da: ["spare penge", "budget"],
      fi: ["säästäminen", "budjettivinkit"],
      et: ["raha säästmine", "eelarve"],
      pl: ["oszczędzanie", "budżet domowy"],
      tr: ["para biriktirme", "bütçe"],
      ja: ["節約", "家計管理"],
      ko: ["돈 모으기", "가계부"],
      vi: ["tiết kiệm tiền", "quản lý chi tiêu"],
    },
  },
  "diy-home": {
    label: "DIY & home",
    terms: {
      en: ["DIY home", "desk setup"],
      es: ["bricolaje", "setup escritorio"],
      pt: ["faça você mesmo", "setup mesa"],
      fr: ["bricolage", "setup bureau"],
      de: ["DIY Zuhause", "Schreibtisch Setup"],
      it: ["fai da te", "setup scrivania"],
      nl: ["klussen", "bureau setup"],
      sv: ["gör det själv", "skrivbordssetup"],
      no: ["gjør det selv", "skrivebord setup"],
      da: ["gør det selv", "skrivebord setup"],
      fi: ["tee se itse", "työpiste setup"],
      et: ["ise tegemine", "lauasetup"],
      pl: ["zrób to sam", "setup biurka"],
      tr: ["kendin yap", "masa setup"],
      ja: ["DIY", "デスクセットアップ"],
      ko: ["DIY", "책상 세팅"],
      vi: ["DIY", "setup bàn làm việc"],
    },
  },
  pets: {
    label: "Pets",
    terms: {
      en: ["dog training", "cat care"],
      es: ["adiestrar perro", "cuidado gato"],
      pt: ["adestrar cachorro", "cuidado gato"],
      fr: ["éducation chien", "soin chat"],
      de: ["Hundeerziehung", "Katzenpflege"],
      it: ["addestrare cane", "cura gatto"],
      nl: ["hond trainen", "kattenzorg"],
      sv: ["hundträning", "kattvård"],
      no: ["hundetraining", "kattestell"],
      da: ["hundetræning", "kattepleje"],
      fi: ["koiran koulutus", "kissan hoito"],
      et: ["koera treenimine", "kassihooldus"],
      pl: ["tresura psa", "pielęgnacja kota"],
      tr: ["köpek eğitimi", "kedi bakımı"],
      ja: ["犬のしつけ", "猫の世話"],
      ko: ["강아지 훈련", "고양이 케어"],
      vi: ["huấn luyện chó", "chăm mèo"],
    },
  },
  "fps-esports": {
    label: "FPS & esports",
    terms: {
      en: ["FPS gameplay", "ranked match"],
      es: ["gameplay FPS", "partida ranked"],
      pt: ["gameplay FPS", "partida ranked"],
      fr: ["gameplay FPS", "match ranked"],
      de: ["FPS Gameplay", "Ranked Match"],
      it: ["gameplay FPS", "partita ranked"],
      nl: ["FPS gameplay", "ranked match"],
      sv: ["FPS-gameplay", "ranked match"],
      no: ["FPS-gameplay", "ranked match"],
      da: ["FPS-gameplay", "ranked match"],
      fi: ["FPS-pelaaminen", "ranked"],
      et: ["FPS mängimine", "ranked"],
      pl: ["gameplay FPS", "mecz ranked"],
      tr: ["FPS oynanış", "ranked maç"],
      ja: ["FPS実況", "ランクマッチ"],
      ko: ["FPS 게임플레이", "랭크 매치"],
      vi: ["gameplay FPS", "đánh ranked"],
    },
  },
};

const BRIEF_HINTS: { keys: string[]; niches: NicheId[] }[] = [
  { keys: ["budget", "cheap", "used", "refurb", "second", "second-hand", "edullinen", "gebraucht", "barato"], niches: ["budget-second-hand", "pc-building"] },
  { keys: ["pc build", "pc building", "custom pc", "pelikone", "näytönohjain", "grafikkarte", "自作"], niches: ["pc-building"] },
  { keys: ["esport", "fps", "valorant", "cs2", "counter-strike"], niches: ["fps-esports", "gaming"] },
  { keys: ["gaming pc", "gaming-pc"], niches: ["pc-building"] },
  { keys: ["gameplay", "let's play", "lets play", "playthrough"], niches: ["gaming"] },
  { keys: ["gaming", "pelaaminen", "chơi game"], niches: ["gaming"] },
  { keys: ["sustain", "repair", "circular", "kunnostettu"], niches: ["sustainability"] },
  { keys: ["review", "unbox"], niches: ["tech-reviews"] },
  { keys: ["beauty", "makeup", "skincare"], niches: ["beauty"] },
  { keys: ["fitness", "workout", "gym"], niches: ["fitness"] },
  { keys: ["recipe", "cook", "food"], niches: ["food"] },
  { keys: ["travel", "vlog trip"], niches: ["travel"] },
  { keys: ["fashion", "outfit", "thrift"], niches: ["fashion"] },
  { keys: ["parent", "family", "baby"], niches: ["parenting"] },
  { keys: ["finance", "budget tips", "save money"], niches: ["personal-finance"] },
  { keys: ["diy", "desk setup", "home"], niches: ["diy-home"] },
  { keys: ["dog", "cat", "pet"], niches: ["pets"] },
];

export function nichesFromBrief(brief: string): NicheId[] {
  const lower = brief.toLowerCase();
  const found = new Set<NicheId>();
  for (const hint of BRIEF_HINTS) {
    if (hint.keys.some((k) => lower.includes(k))) {
      hint.niches.forEach((n) => found.add(n));
    }
  }
  if (found.size === 0) return ["pc-building", "budget-second-hand"];
  return [...found];
}

export function dictionaryTerms(niches: NicheId[], language: string): string[] {
  const lang = language in NICHE_TERMS["pc-building"].terms ? language : "en";
  const terms: string[] = [];
  for (const id of niches) {
    terms.push(...(NICHE_TERMS[id]?.terms[lang] ?? NICHE_TERMS[id]?.terms.en ?? []));
  }
  return [...new Set(terms)].slice(0, 6);
}

const HARDWARE_NICHES: NicheId[] = ["pc-building", "budget-second-hand", "tech-reviews", "diy-home"];
const PLAY_NICHES: NicheId[] = ["gaming", "fps-esports"];

export function shouldExcludePcHardware(niches: NicheId[]) {
  const wantsPlay = niches.some((n) => PLAY_NICHES.includes(n));
  const wantsHardware = niches.some((n) => HARDWARE_NICHES.includes(n));
  return wantsPlay && !wantsHardware;
}

export function looksLikePcHardware(text: string) {
  return /pc build|custom pc|gaming-pc|gaming pc|grafikkarte|näytönohjain|pelikone|lắp pc|build pc|自作pc|조립pc|gpu|grafikkort|karta graficzna|card đồ họa|refurbished pc|kunnostettu pelikone/i.test(
    text,
  );
}

export const NICHE_OPTIONS = NICHE_IDS.map((id) => ({
  id,
  label: NICHE_TERMS[id].label,
}));

export function isNicheId(value: string): value is NicheId {
  return (NICHE_IDS as readonly string[]).includes(value);
}
