import { sjaellandMunicipalityProperties } from "@/lib/geo/sjaelland";

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