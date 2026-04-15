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
    ],
  },
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

export function mapJobindsatsTitleToIndustryCode(titleLabel: string): ProductIndustryCode | null {
  const normalized = normalizeForMatching(titleLabel);

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.industryCode;
    }
  }

  return null;
}
