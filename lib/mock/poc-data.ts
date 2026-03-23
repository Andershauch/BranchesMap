export type IndustrySummary = {
  code: string;
  slug: string;
  name: string;
  icon: string;
  accentColor: string;
  jobCount: number;
};

export type JobSummary = {
  id: string;
  title: string;
  employerName: string;
  locationLabel: string;
  summary: string;
  applyUrl: string;
  language: "da";
};

export type MunicipalityRecord = {
  code: string;
  slug: string;
  name: string;
  mapX: number;
  mapY: number;
  teaser: string;
  topIndustries: IndustrySummary[];
  jobsByIndustry: Array<{
    industry: IndustrySummary;
    jobs: JobSummary[];
  }>;
};

type IndustryDefinition = {
  code: string;
  slug: string;
  name: string;
  icon: string;
  accentColor: string;
  sampleRoles: readonly string[];
};

type MunicipalitySeed = {
  code: string;
  slug: string;
  name: string;
  mapX: number;
  mapY: number;
};

const industryCatalog: IndustryDefinition[] = [
  {
    code: "health",
    slug: "sundhed",
    name: "Sundhed",
    icon: "🩺",
    accentColor: "#0f766e",
    sampleRoles: ["Sygeplejerske", "Sundhedskoordinator", "Fysioterapeut"],
  },
  {
    code: "tech",
    slug: "teknologi",
    name: "Teknologi",
    icon: "💻",
    accentColor: "#2563eb",
    sampleRoles: ["Frontend-udvikler", "Dataanalytiker", "Produktleder"],
  },
  {
    code: "build",
    slug: "byggeri",
    name: "Byggeri",
    icon: "🏗️",
    accentColor: "#d97706",
    sampleRoles: ["Byggeleder", "Projektkoordinator", "Teknisk designer"],
  },
  {
    code: "logistics",
    slug: "logistik",
    name: "Logistik",
    icon: "🚚",
    accentColor: "#7c3aed",
    sampleRoles: ["Driftsplanlægger", "Ruteplanlægger", "Chaufførdisponent"],
  },
  {
    code: "education",
    slug: "uddannelse",
    name: "Uddannelse",
    icon: "🎓",
    accentColor: "#16a34a",
    sampleRoles: ["Lærer", "Pædagogisk koordinator", "Studievejleder"],
  },
  {
    code: "tourism",
    slug: "turisme",
    name: "Turisme",
    icon: "🌊",
    accentColor: "#ea580c",
    sampleRoles: ["Destinationskoordinator", "Eventmedarbejder", "Gæsteserviceansvarlig"],
  },
  {
    code: "food",
    slug: "fodevarer",
    name: "Fødevarer",
    icon: "🍎",
    accentColor: "#b45309",
    sampleRoles: ["Produktionsleder", "Kvalitetsmedarbejder", "Butikschef"],
  },
];

const municipalitySeeds: MunicipalitySeed[] = [
  { code: "sj-001", slug: "helsingor", name: "Helsingør", mapX: 82, mapY: 7 },
  { code: "sj-002", slug: "gribskov", name: "Gribskov", mapX: 73, mapY: 10 },
  { code: "sj-003", slug: "hillerod", name: "Hillerød", mapX: 67, mapY: 14 },
  { code: "sj-004", slug: "frederikssund", name: "Frederikssund", mapX: 50, mapY: 19 },
  { code: "sj-005", slug: "egedal", name: "Egedal", mapX: 61, mapY: 20 },
  { code: "sj-006", slug: "ballerup", name: "Ballerup", mapX: 68, mapY: 23 },
  { code: "sj-007", slug: "kobenhavn", name: "København", mapX: 81, mapY: 23 },
  { code: "sj-008", slug: "frederiksberg", name: "Frederiksberg", mapX: 78, mapY: 25 },
  { code: "sj-009", slug: "greve", name: "Greve", mapX: 69, mapY: 34 },
  { code: "sj-010", slug: "koge", name: "Køge", mapX: 68, mapY: 40 },
  { code: "sj-011", slug: "roskilde", name: "Roskilde", mapX: 58, mapY: 31 },
  { code: "sj-012", slug: "lejre", name: "Lejre", mapX: 50, mapY: 33 },
  { code: "sj-013", slug: "odsherred", name: "Odsherred", mapX: 34, mapY: 20 },
  { code: "sj-014", slug: "holbaek", name: "Holbæk", mapX: 42, mapY: 30 },
  { code: "sj-015", slug: "kalundborg", name: "Kalundborg", mapX: 20, mapY: 31 },
  { code: "sj-016", slug: "slagelse", name: "Slagelse", mapX: 29, mapY: 46 },
  { code: "sj-017", slug: "soro", name: "Sorø", mapX: 40, mapY: 46 },
  { code: "sj-018", slug: "ringsted", name: "Ringsted", mapX: 53, mapY: 44 },
  { code: "sj-019", slug: "naestved", name: "Næstved", mapX: 54, mapY: 59 },
  { code: "sj-020", slug: "faxe", name: "Faxe", mapX: 67, mapY: 56 },
  { code: "sj-021", slug: "stevns", name: "Stevns", mapX: 75, mapY: 49 },
  { code: "sj-022", slug: "vordingborg", name: "Vordingborg", mapX: 61, mapY: 74 },
];

const rotateIndustryIndexes = (index: number) => [
  index % industryCatalog.length,
  (index + 2) % industryCatalog.length,
  (index + 4) % industryCatalog.length,
];

const buildMunicipality = (
  seed: MunicipalitySeed,
  municipalityIndex: number,
): MunicipalityRecord => {
  const industryIndexes = rotateIndustryIndexes(municipalityIndex);

  const topIndustries = industryIndexes.map((industryIndex, rank) => {
    const industry = industryCatalog[industryIndex];

    return {
      code: industry.code,
      slug: industry.slug,
      name: industry.name,
      icon: industry.icon,
      accentColor: industry.accentColor,
      jobCount: 28 + (municipalityIndex % 5) * 4 - rank * 3,
    };
  });

  const jobsByIndustry = topIndustries.map((industry, rank) => {
    const definition = industryCatalog.find(({ slug }) => slug === industry.slug)!;

    const jobs = definition.sampleRoles.map((title, jobIndex) => ({
      id: `${seed.slug}-${industry.slug}-${jobIndex + 1}`,
      title,
      employerName: `${seed.name} ${industry.name} Hub`,
      locationLabel: `${seed.name} Kommune`,
      summary: `Mock-opslag til POC for ${seed.name} inden for ${industry.name.toLowerCase()}.`,
      applyUrl: `https://example.com/jobs/${seed.slug}/${industry.slug}/${jobIndex + 1}`,
      language: "da" as const,
    }));

    return {
      industry: {
        ...industry,
        jobCount: industry.jobCount + rank,
      },
      jobs,
    };
  });

  return {
    ...seed,
    teaser: `${seed.name} er i denne POC stærkest repræsenteret inden for ${topIndustries[0].name.toLowerCase()}, ${topIndustries[1].name.toLowerCase()} og ${topIndustries[2].name.toLowerCase()}.`,
    topIndustries,
    jobsByIndustry,
  };
};

export const pocMunicipalities = municipalitySeeds.map(buildMunicipality);

export const pocIndustryCatalog = industryCatalog.map((industry) => ({
  code: industry.code,
  slug: industry.slug,
  name: industry.name,
  icon: industry.icon,
  accentColor: industry.accentColor,
}));