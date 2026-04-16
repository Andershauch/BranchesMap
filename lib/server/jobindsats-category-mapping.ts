import { normalizeJobindsatsText } from "@/lib/server/jobindsats-imports";

export const PRODUCT_INDUSTRY_CODES = [
  "health",
  "tech",
  "build",
  "logistics",
  "education",
  "tourism",
  "food",
] as const;

export type ProductIndustryCode = (typeof PRODUCT_INDUSTRY_CODES)[number];

export type RepresentativeTitleScoreInput = {
  titleLabel: string;
  openPositions: number;
  rank: number;
};

export type RankedRepresentativeTitle = {
  industryCode: ProductIndustryCode;
  normalizedTitle: string;
  score: number;
  openPositions: number;
  rank: number;
};

export type JobindsatsTitleClassification = {
  normalizedTitle: string;
  normalizedForMatching: string;
  industryCode: ProductIndustryCode | null;
  isGeneric: boolean;
  score: number | null;
};

type CategoryRule = {
  industryCode: ProductIndustryCode;
  keywords: string[];
};

const CATEGORY_RULES: CategoryRule[] = [
  {
    industryCode: "health",
    keywords: [
      "sygeplej",
      "sundhed",
      "laege",
      "speciallaege",
      "tandlaege",
      "tand",
      "jordemoder",
      "social- og sundhed",
      "sosu",
      "hospital",
      "pleje",
      "omsorg",
      "fysioterapeut",
      "ergoterapeut",
      "radiograf",
      "bioanalytiker",
      "laegesekretaer",
      "laboratorie",
      "medico",
      "psyki",
      "socialt arbejde",
      "socialradgiver",
      "hjaelpemiddel",
      "handicap",
      "laegesekretaer",
      "behandling",
      "genoptraening",
      "psykolog",
      "uddannelseslaege",
      "dyrlaege",
      "ambulance",
      "laege",
      "psykologarbejde",
      "hospitalsarbejde",
      "sundhedsomradet",
    ],
  },
  {
    industryCode: "tech",
    keywords: [
      "it",
      "software",
      "udvikler",
      "developer",
      "programmer",
      "data",
      "digital",
      "cyber",
      "cloud",
      "frontend",
      "backend",
      "fullstack",
      "system",
      "netvaerk",
      "tele",
      "elektronik",
      "automation",
      "automations",
      "robot",
      "produktleder",
      "analytiker",
      "ingenior",
      "ingeniorarbejde",
      "ingenioer",
      "ingenioerarbejde",
      "ingeniorteknisk",
      "maskinmester",
      "tekniker",
      "driftstekniker",
      "supporter",
      "it support",
      "ui",
      "ux",
      "devops",
      "qa",
      "projektleder",
      "studentermedhjaelp",
      "kommunikation",
      "bibliotek",
      "museum",
      "fotograf",
      "kamera",
      "akademisk",
      "ph d",
      "professor",
      "lektor",
      "forskning",
      "naturvidenskab",
      "teknik",
    ],
  },
  {
    industryCode: "build",
    keywords: [
      "byg",
      "anlaeg",
      "toemrer",
      "murer",
      "elektriker",
      "vvs",
      "roerlaegger",
      "kloak",
      "beton",
      "snedker",
      "maler",
      "bygning",
      "konstrukt",
      "landmaaling",
      "asfalt",
      "brolaegger",
      "fugemontoer",
      "diamantskaerer",
      "anlaegs",
      "ejendomsservice",
      "smed",
      "metal",
      "jern",
      "mekaniker",
      "auto",
      "karrosseri",
      "cnc",
      "industri",
      "maskinarbejder",
      "montor",
      "teknisk designer",
      "toemrer",
      "anlaegsarbejde",
      "anlaegsgartner",
      "brolaegger",
      "rorlaegger",
      "stillads",
      "isolering",
      "isolator",
      "daekmontor",
      "teknisk servicemedarbejder",
      "ejendomsfunktionaer",
      "specialarbejder",
      "rengoering",
      "rengoeringsassistent",
      "rengoeringsinspektor",
      "vinduespudser",
      "nedriver",
      "maskinforer",
      "maskinfoerer",
      "maskinfoererarbejde",
      "anlaegsstruktor",
      "anlaegsstruktoer",
      "isolatoer",
      "daekmontoer",
      "teknisk service",
      "begravelses",
      "kirkegard",
    ],
  },
  {
    industryCode: "logistics",
    keywords: [
      "logistik",
      "transport",
      "lager",
      "truck",
      "kran",
      "chauff",
      "fragt",
      "rute",
      "distribution",
      "koersel",
      "post",
      "togfoerer",
      "lokomotiv",
      "havnearbejder",
      "pilot",
      "fly",
      "skibs",
      "taxi",
      "pakkeri",
      "indkoeb",
      "salg",
      "kunde",
      "kundeservice",
      "butik",
      "retail",
      "marketing",
      "markedsforing",
      "e commerce",
      "ehandel",
      "ordre",
      "kontor",
      "administration",
      "regnskab",
      "finans",
      "bogholderi",
      "okonomi",
      "sekretaer",
      "sagsbehandler",
      "koordinator",
      "callcenter",
      "ekspedient",
      "interviewer",
      "fundraiser",
      "hr",
      "ledelse",
      "fuldmaegtig",
      "juridisk",
      "jurist",
      "afdelingsleder",
      "teamleder",
      "projektmedarbejder",
      "driftsplanlaegger",
      "organisation",
      "raadgivning",
      "okonomiassistent",
      "administrativ assistent",
      "administrativt arbejde",
      "vagt",
      "sikkerhed",
      "overvaagning",
      "bud",
      "omdeler",
      "visual merchandiser",
      "oekonomi",
    ],
  },
  {
    industryCode: "education",
    keywords: [
      "laerer",
      "undervis",
      "skole",
      "paedagog",
      "vejleder",
      "gymnasie",
      "professionshoejskole",
      "erhvervsskole",
      "folkeskole",
      "specialundervis",
      "vuc",
      "fgu",
      "hoejskole",
      "koerelaerer",
      "logopaed",
      "socialt",
      "paedagogisk",
      "kirkeligt",
      "daginstitu",
      "specialpaedagog",
      "skoleleder",
      "paedagog",
      "paedagogmedhjaelper",
      "paedagogisk assistent",
      "paedagogisk konsulent",
      "bornepas",
      "born",
      "socialpaedagog",
      "socialarbejder",
      "socialraadgiver",
      "vejledning",
      "pau",
      "akademisk arbejde",
      "paedagogisk arbejde",
      "paedagog",
      "socialpaedagog",
      "bornepasser",
      "bornepasning",
      "boernepas",
      "boernepasser",
      "boernepasning",
      "lektor",
      "professor",
      "uddannelse",
    ],
  },
  {
    industryCode: "tourism",
    keywords: [
      "hotel",
      "restaurant",
      "turisme",
      "gaeste",
      "destinations",
      "event",
      "servering",
      "reception",
      "kok",
      "tjener",
      "rengoering",
      "bar",
      "cafe",
      "konference",
      "oplevelse",
      "booking",
      "receptionist",
      "housekeeping",
      "vaert",
      "vaertskab",
      "livredder",
      "dyrepasser",
    ],
  },
  {
    industryCode: "food",
    keywords: [
      "foedevare",
      "bager",
      "slagter",
      "koekken",
      "ernaering",
      "mejeri",
      "levnedsmiddel",
      "kantine",
      "delikatesse",
      "butikschef",
      "farmakonom",
      "apotek",
      "koekkenchef",
      "ernarings",
      "mad",
      "catering",
      "produktionskok",
      "koekkenmedhjaelper",
      "koekkenassistent",
      "ernaeringsassistent",
      "naerings",
      "nydelsesmiddel",
      "koekken",
    ],
  },
];

const GENERIC_TITLE_PATTERNS = [
  " arbejde",
  "arbejde ",
  " arbejde ",
  " ovrig",
  " ovrige",
  " mv",
  " eleve",
  " elever",
  " forskning og universitetsundervisning",
  " salg indkob og markedsforing",
  " administrativt arbejde",
  " paedagogisk socialt og kirkeligt arbejde",
  " undervisning og vejledning",
  " bygge og anlaeg",
  " transport post lager og maskinforerarbejde",
  " hotel restauration koekken kantine",
  " kokken og kantinearbejde",
  " paedagogisk arbejde",
  " akademisk arbejde",
  " ledelse",
  " jern metal og auto",
  " butiksekspedition",
  " elever",
  " studentermedhjaelp",
  " juridisk arbejde",
  " administrativt sundhedsarbejde",
  " sygepleje og jordemoderarbejde",
  " forskning og universitetsundervisning samfundsvidenskab",
  " forskning og universitetsundervisning naturvidenskab og teknik",
  " tvargaende arbejde",
  " kontor og sekretararbejde",
  " socialraadgivning mv",
  " rengoering mv",
  " servering mv",
  " ledelse:",
  " hotel restauration koekken kantine",
];

const CONCRETE_TITLE_PATTERNS = [
  "sygeplejerske",
  "social og sundhedshjaelper",
  "social og sundhedsassistent",
  "elektriker",
  "toemrer",
  "murer",
  "chauffor",
  "buschauffor",
  "lager og logistikmedarbejder",
  "laerer",
  "folkeskolelaerer",
  "paedagog",
  "socialradgiver",
  "maskinmester",
  "mekaniker",
  "smed",
  "ingenior",
  "tekniker",
  "receptionist",
  "kok",
  "tjener",
  "bager",
  "slagter",
  "fuldmaegtig",
  "jurist",
  "afdelingsleder",
  "rengoeringsassistent",
  "paedagogmedhjaelper",
  "paedagogisk assistent",
  "laege",
  "laegesekretaer",
];

function normalizeForMatching(value: string) {
  return value
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeJobindsatsRepresentativeTitle(titleLabel: string) {
  return normalizeJobindsatsText(titleLabel)
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreTitlePresentation(normalized: string, normalizedTitle: string) {
  let score = 0;
  const words = normalizedTitle.split(/\s+/).filter(Boolean);

  if (words.length >= 2 && words.length <= 4) {
    score += 10;
  } else if (words.length === 1) {
    score += 4;
  } else if (words.length >= 6) {
    score -= 8;
  }

  if (GENERIC_TITLE_PATTERNS.some((pattern) => normalized.includes(pattern))) {
    score -= 25;
  }

  if (normalized.includes(" mv")) {
    score -= 12;
  }

  if (normalized.includes("elever") || normalized.includes("elev")) {
    score -= 10;
  }

  if (CONCRETE_TITLE_PATTERNS.some((pattern) => normalized.includes(pattern))) {
    score += 16;
  }

  if (normalized.includes(" og ")) {
    score -= 6;
  }

  if (normalizedTitle.includes(",") || normalizedTitle.includes("/")) {
    score -= 4;
  }

  return score;
}

export function isGenericJobindsatsRepresentativeTitle(titleLabel: string) {
  const normalizedTitle = normalizeJobindsatsRepresentativeTitle(titleLabel);
  if (!normalizedTitle) {
    return false;
  }

  const normalized = ` ${normalizeForMatching(normalizedTitle)} `;

  return (
    GENERIC_TITLE_PATTERNS.some((pattern) => normalized.includes(pattern)) ||
    normalized.includes(" mv") ||
    normalized.includes("elever") ||
    normalized.includes("elev")
  );
}

export function classifyJobindsatsTitle(titleLabel: string): JobindsatsTitleClassification {
  const normalizedTitle = normalizeJobindsatsRepresentativeTitle(titleLabel);
  const normalizedForMatching = normalizeForMatching(normalizedTitle);
  const industryCode = normalizedTitle ? mapJobindsatsTitleToIndustryCode(normalizedTitle) : null;
  const isGeneric = normalizedTitle ? isGenericJobindsatsRepresentativeTitle(normalizedTitle) : false;

  if (!normalizedTitle || !industryCode) {
    return {
      normalizedTitle,
      normalizedForMatching,
      industryCode,
      isGeneric,
      score: null,
    };
  }

  return {
    normalizedTitle,
    normalizedForMatching,
    industryCode,
    isGeneric,
    score: scoreTitlePresentation(` ${normalizedForMatching} `, normalizedTitle),
  };
}

export function rankJobindsatsRepresentativeTitle(
  input: RepresentativeTitleScoreInput,
): RankedRepresentativeTitle | null {
  const normalizedTitle = normalizeJobindsatsRepresentativeTitle(input.titleLabel);
  if (!normalizedTitle) {
    return null;
  }

  const industryCode = mapJobindsatsTitleToIndustryCode(normalizedTitle);
  if (!industryCode) {
    return null;
  }

  const normalized = ` ${normalizeForMatching(normalizedTitle)} `;
  const score =
    input.openPositions * 4 +
    Math.max(0, 30 - input.rank * 2) +
    scoreTitlePresentation(normalized, normalizedTitle);

  return {
    industryCode,
    normalizedTitle,
    score,
    openPositions: input.openPositions,
    rank: input.rank,
  };
}

export function mapJobindsatsTitleToIndustryCode(titleLabel: string): ProductIndustryCode | null {
  const normalized = normalizeForMatching(titleLabel);

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.industryCode;
    }
  }

  return null;
}
