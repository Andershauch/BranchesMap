import { sjaellandMunicipalityProperties } from "@/lib/geo/sjaelland";

export type LocalizedText = {
  da: string;
  en: string;
};

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
  title: LocalizedText;
  employerName: LocalizedText;
  locationLabel: LocalizedText;
  summary: LocalizedText;
  applyUrl: string;
};

export type MunicipalityRecord = {
  code: string;
  slug: string;
  name: string;
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
  nameDa: string;
  nameEn: string;
  icon: string;
  accentColor: string;
  sampleRoles: readonly LocalizedText[];
};

const industryCatalog: IndustryDefinition[] = [
  {
    code: "health",
    slug: "sundhed",
    nameDa: "Sundhed",
    nameEn: "Health",
    icon: "🩺",
    accentColor: "#0f766e",
    sampleRoles: [
      { da: "Sygeplejerske", en: "Nurse" },
      { da: "Sundhedskoordinator", en: "Health Coordinator" },
      { da: "Fysioterapeut", en: "Physiotherapist" },
    ],
  },
  {
    code: "tech",
    slug: "teknologi",
    nameDa: "Teknologi",
    nameEn: "Technology",
    icon: "💻",
    accentColor: "#2563eb",
    sampleRoles: [
      { da: "Frontend-udvikler", en: "Frontend Developer" },
      { da: "Dataanalytiker", en: "Data Analyst" },
      { da: "Produktleder", en: "Product Manager" },
    ],
  },
  {
    code: "build",
    slug: "byggeri",
    nameDa: "Byggeri",
    nameEn: "Construction",
    icon: "🏗️",
    accentColor: "#d97706",
    sampleRoles: [
      { da: "Byggeleder", en: "Construction Manager" },
      { da: "Projektkoordinator", en: "Project Coordinator" },
      { da: "Teknisk designer", en: "Technical Designer" },
    ],
  },
  {
    code: "logistics",
    slug: "logistik",
    nameDa: "Logistik",
    nameEn: "Logistics",
    icon: "🚚",
    accentColor: "#7c3aed",
    sampleRoles: [
      { da: "Driftsplanlægger", en: "Operations Planner" },
      { da: "Ruteplanlægger", en: "Route Planner" },
      { da: "Chaufførdisponent", en: "Transport Dispatcher" },
    ],
  },
  {
    code: "education",
    slug: "uddannelse",
    nameDa: "Uddannelse",
    nameEn: "Education",
    icon: "🎓",
    accentColor: "#16a34a",
    sampleRoles: [
      { da: "Lærer", en: "Teacher" },
      { da: "Pædagogisk koordinator", en: "Pedagogical Coordinator" },
      { da: "Studievejleder", en: "Student Advisor" },
    ],
  },
  {
    code: "tourism",
    slug: "turisme",
    nameDa: "Turisme",
    nameEn: "Tourism",
    icon: "🌊",
    accentColor: "#ea580c",
    sampleRoles: [
      { da: "Destinationskoordinator", en: "Destination Coordinator" },
      { da: "Eventmedarbejder", en: "Event Assistant" },
      { da: "Gæsteserviceansvarlig", en: "Guest Services Lead" },
    ],
  },
  {
    code: "food",
    slug: "fodevarer",
    nameDa: "Fødevarer",
    nameEn: "Food",
    icon: "🍎",
    accentColor: "#b45309",
    sampleRoles: [
      { da: "Produktionsleder", en: "Production Manager" },
      { da: "Kvalitetsmedarbejder", en: "Quality Specialist" },
      { da: "Butikschef", en: "Store Manager" },
    ],
  },
];

const municipalitySeeds = sjaellandMunicipalityProperties.map(({ code, slug, name }) => ({
  code,
  slug,
  name,
}));

const rotateIndustryIndexes = (index: number) => [
  index % industryCatalog.length,
  (index + 2) % industryCatalog.length,
  (index + 4) % industryCatalog.length,
];

function buildMunicipalityTeaser(seed: (typeof municipalitySeeds)[number], topIndustries: IndustrySummary[]) {
  return `${seed.name} er lige nu stærkest repræsenteret inden for ${topIndustries[0].name.toLowerCase()}, ${topIndustries[1].name.toLowerCase()} og ${topIndustries[2].name.toLowerCase()}.`;
}

const buildMunicipality = (
  seed: (typeof municipalitySeeds)[number],
  municipalityIndex: number,
): MunicipalityRecord => {
  const industryIndexes = rotateIndustryIndexes(municipalityIndex);

  const topIndustries = industryIndexes.map((industryIndex, rank) => {
    const industry = industryCatalog[industryIndex];

    return {
      code: industry.code,
      slug: industry.slug,
      name: industry.nameDa,
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
      employerName: {
        da: `${seed.name} ${definition.nameDa} Hub`,
        en: `${seed.name} ${definition.nameEn} Hub`,
      },
      locationLabel: {
        da: `${seed.name} Kommune`,
        en: `${seed.name} Municipality`,
      },
      summary: {
        da: `Eksempelopslag for ${seed.name} inden for ${definition.nameDa.toLowerCase()}.`,
        en: `Sample posting in ${seed.name} within ${definition.nameEn.toLowerCase()}.`,
      },
      applyUrl: `https://example.com/jobs/${seed.slug}/${industry.slug}/${jobIndex + 1}`,
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
    teaser: buildMunicipalityTeaser(seed, topIndustries),
    topIndustries,
    jobsByIndustry,
  };
};

export const mockMunicipalities = municipalitySeeds.map(buildMunicipality);

export const mockIndustryCatalog = industryCatalog.map((industry) => ({
  code: industry.code,
  slug: industry.slug,
  name: industry.nameDa,
  icon: industry.icon,
  accentColor: industry.accentColor,
}));
