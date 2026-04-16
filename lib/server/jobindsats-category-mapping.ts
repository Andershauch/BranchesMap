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
];

function normalizeForMatching(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeJobindsatsRepresentativeTitle(titleLabel: string) {
  return titleLabel
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
