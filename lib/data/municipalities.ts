import "server-only";

import {
  getMunicipalityHomeMapConfig,
  type MunicipalityHomeMapConfig,
  type MunicipalityHomeMapLabelMode,
  type MunicipalityHomeMapRegionTag,
} from "@/lib/config/home-map-display";
import { pocMunicipalities, type MunicipalityRecord as MockMunicipalityRecord } from "@/lib/mock/poc-data";
import {
  createJobsRequest,
  getMunicipalityLiveJobEstimate,
  isLiveJobEstimatesEnabled,
  type MunicipalityJobEstimateResponse,
} from "@/lib/server/statbank-jobs";
import { prisma } from "@/lib/server/prisma";

export type LocalizedText = {
  da: string;
  en: string;
};

export type MunicipalityIndustrySummary = {
  code: string;
  slug: string;
  name: string;
  icon: string;
  accentColor: string;
  jobCount: number;
};

export type MunicipalityJobSummary = {
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
  topIndustries: MunicipalityIndustrySummary[];
  jobsByIndustry: Array<{
    industry: MunicipalityIndustrySummary;
    jobs: MunicipalityJobSummary[];
  }>;
};

export type MunicipalitySummary = {
  code: string;
  slug: string;
  name: string;
  teaser: string;
  topIndustries: MunicipalityIndustrySummary[];
  totalJobs: number;
  homeMap: MunicipalityHomeMapConfig;
};

export type MunicipalityHomeMapAdminRow = {
  code: string;
  slug: string;
  name: string;
  isActive: boolean;
  homeMap: MunicipalityHomeMapConfig;
};

type DatabaseHomeMapRow = {
  slug: string;
  isActive: boolean;
  homeMapVisible: boolean;
  homeMapPriority: number;
  homeMapLabelMode: string;
  homeMapRegionTag: string;
};

type DatabaseIndustryRow = {
  code: string;
  slug: string;
  nameDa: string;
  icon: string | null;
  accentColor: string | null;
};

type DatabaseIndustryStatRow = {
  jobCount: number;
  industry: DatabaseIndustryRow;
};

type DatabaseJobRow = {
  id: string;
  title: string;
  employerName: string;
  locationLabel: string | null;
  summary: string | null;
  applyUrl: string | null;
  industry: DatabaseIndustryRow;
};

type DatabaseMunicipalitySummaryRow = DatabaseHomeMapRow & {
  code: string;
  name: string;
  teaser: string | null;
  _count: {
    jobs: number;
  };
  industryStats: DatabaseIndustryStatRow[];
};

type DatabaseMunicipalityDetailRow = {
  code: string;
  slug: string;
  name: string;
  teaser: string | null;
  isActive: boolean;
  industryStats: DatabaseIndustryStatRow[];
  jobs: DatabaseJobRow[];
};

const defaultIndustryIcon = "*";
const defaultIndustryColor = "#64748b";
const mockMunicipalityMap = new Map(pocMunicipalities.map((municipality) => [municipality.slug, municipality]));

function normalizeLabelMode(value: string): MunicipalityHomeMapLabelMode {
  return value === "name-only" || value === "name-icons" ? value : "auto";
}

function normalizeRegionTag(value: string): MunicipalityHomeMapRegionTag {
  switch (value) {
    case "west":
    case "south":
    case "central":
    case "north":
    case "metro":
      return value;
    default:
      return "other";
  }
}

function createHomeMapConfig(slug: string, dbRow?: DatabaseHomeMapRow): MunicipalityHomeMapConfig {
  const fallback = getMunicipalityHomeMapConfig(slug);

  if (!dbRow) {
    return fallback;
  }

  return {
    isPrimary: dbRow.homeMapVisible,
    priority: dbRow.homeMapPriority,
    labelMode: normalizeLabelMode(dbRow.homeMapLabelMode),
    regionTag: normalizeRegionTag(dbRow.homeMapRegionTag),
  };
}

function createLocalizedText(value: string | null | undefined, fallback: string): LocalizedText {
  const text = value?.trim() || fallback;

  return {
    da: text,
    en: text,
  };
}

function createIndustrySummaryFromDatabase(industry: DatabaseIndustryRow, jobCount: number): MunicipalityIndustrySummary {
  return {
    code: industry.code,
    slug: industry.slug,
    name: industry.nameDa,
    icon: industry.icon ?? defaultIndustryIcon,
    accentColor: industry.accentColor ?? defaultIndustryColor,
    jobCount,
  };
}

function buildFallbackTeaser(name: string, topIndustries: MunicipalityIndustrySummary[]) {
  if (topIndustries.length < 3) {
    return name;
  }

  return `${name} er i denne POC staerkest repraesenteret inden for ${topIndustries[0].name.toLowerCase()}, ${topIndustries[1].name.toLowerCase()} og ${topIndustries[2].name.toLowerCase()}.`;
}

function countMockJobs(municipality: MockMunicipalityRecord) {
  return municipality.jobsByIndustry.reduce((sum, entry) => sum + entry.jobs.length, 0);
}

function createSummaryFromMock(municipality: MockMunicipalityRecord, dbRow?: DatabaseHomeMapRow): MunicipalitySummary {
  return {
    code: municipality.code,
    slug: municipality.slug,
    name: municipality.name,
    teaser: municipality.teaser,
    topIndustries: municipality.topIndustries,
    totalJobs: countMockJobs(municipality),
    homeMap: createHomeMapConfig(municipality.slug, dbRow),
  };
}

function createDetailFromMock(municipality: MockMunicipalityRecord): MunicipalityRecord {
  return {
    code: municipality.code,
    slug: municipality.slug,
    name: municipality.name,
    teaser: municipality.teaser,
    topIndustries: municipality.topIndustries,
    jobsByIndustry: municipality.jobsByIndustry,
  };
}

function createJobsByIndustryFromDatabase(
  jobs: DatabaseJobRow[],
  municipalityName: string,
  statsByIndustrySlug: Map<string, MunicipalityIndustrySummary>,
): MunicipalityRecord["jobsByIndustry"] {
  const grouped = new Map<string, { industry: MunicipalityIndustrySummary; jobs: MunicipalityJobSummary[] }>();

  for (const stat of statsByIndustrySlug.values()) {
    grouped.set(stat.slug, {
      industry: stat,
      jobs: [],
    });
  }

  for (const job of jobs) {
    const fallbackLocation = `${municipalityName} Kommune`;
    const existing = grouped.get(job.industry.slug) ?? {
      industry: createIndustrySummaryFromDatabase(job.industry, 0),
      jobs: [],
    };

    existing.jobs.push({
      id: job.id,
      title: createLocalizedText(job.title, job.title),
      employerName: createLocalizedText(job.employerName, job.employerName),
      locationLabel: createLocalizedText(job.locationLabel, fallbackLocation),
      summary: createLocalizedText(job.summary, ""),
      applyUrl: job.applyUrl ?? "",
    });

    grouped.set(job.industry.slug, existing);
  }

  const orderedSlugs = [
    ...statsByIndustrySlug.keys(),
    ...[...grouped.entries()]
      .filter(([slug]) => !statsByIndustrySlug.has(slug))
      .sort((left, right) => left[1].industry.name.localeCompare(right[1].industry.name, "da"))
      .map(([slug]) => slug),
  ];

  return orderedSlugs
    .map((slug) => grouped.get(slug))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .map((entry) => ({
      industry: {
        ...entry.industry,
        jobCount: entry.industry.jobCount || entry.jobs.length,
      },
      jobs: entry.jobs,
    }))
    .filter((entry) => entry.jobs.length > 0);
}

function createTopIndustriesFromJobGroups(jobsByIndustry: MunicipalityRecord["jobsByIndustry"]): MunicipalityIndustrySummary[] {
  return [...jobsByIndustry]
    .sort((left, right) => {
      if (left.jobs.length !== right.jobs.length) {
        return right.jobs.length - left.jobs.length;
      }

      return left.industry.name.localeCompare(right.industry.name, "da");
    })
    .slice(0, 3)
    .map((entry) => ({
      ...entry.industry,
      jobCount: entry.industry.jobCount || entry.jobs.length,
    }));
}
function createIndustrySummaryFromLiveEstimate(
  industry: MunicipalityJobEstimateResponse["municipalityEstimate"]["topIndustries"][number],
): MunicipalityIndustrySummary {
  return {
    code: industry.code,
    slug: industry.slug,
    name: industry.name,
    icon: industry.icon,
    accentColor: industry.accentColor,
    jobCount: industry.jobCount,
  };
}

function mergeLiveTopIndustries(
  current: MunicipalityIndustrySummary[],
  liveEstimate?: MunicipalityJobEstimateResponse | null,
) {
  if (!liveEstimate) {
    return current;
  }

  const liveTopIndustries = liveEstimate.municipalityEstimate.topIndustries.map(createIndustrySummaryFromLiveEstimate);
  return liveTopIndustries.length > 0 ? liveTopIndustries : current;
}

function mergeLiveTotalJobs(currentTotal: number, liveEstimate?: MunicipalityJobEstimateResponse | null) {
  if (!liveEstimate) {
    return currentTotal;
  }

  return liveEstimate.municipalityEstimate.totalEstimatedJobCount || currentTotal;
}

function mergeLiveJobsByIndustry(
  current: MunicipalityRecord["jobsByIndustry"],
  liveEstimate?: MunicipalityJobEstimateResponse | null,
) {
  if (!liveEstimate) {
    return current;
  }

  const liveRankByCode = new Map(
    liveEstimate.municipalityEstimate.industryBreakdown.map((entry, index) => [entry.industry.code, index]),
  );
  const liveCountByCode = new Map(
    liveEstimate.municipalityEstimate.industryBreakdown.map((entry) => [entry.industry.code, entry]),
  );

  return [...current]
    .map((entry) => {
      const liveEntry = liveCountByCode.get(entry.industry.code);

      if (!liveEntry) {
        return entry;
      }

      return {
        ...entry,
        industry: {
          ...entry.industry,
          slug: liveEntry.industry.slug,
          name: liveEntry.industry.name,
          icon: liveEntry.industry.icon,
          accentColor: liveEntry.industry.accentColor,
          jobCount: liveEntry.estimatedJobCount,
        },
      };
    })
    .sort((left, right) => {
      const leftRank = liveRankByCode.get(left.industry.code);
      const rightRank = liveRankByCode.get(right.industry.code);

      if (leftRank !== undefined || rightRank !== undefined) {
        if (leftRank === undefined) {
          return 1;
        }

        if (rightRank === undefined) {
          return -1;
        }

        return leftRank - rightRank;
      }

      return left.industry.name.localeCompare(right.industry.name, "da");
    });
}

function createSummaryFromDatabase(
  row: DatabaseMunicipalitySummaryRow,
  fallback?: MockMunicipalityRecord,
  liveEstimate?: MunicipalityJobEstimateResponse | null,
): MunicipalitySummary {
  const baseTopIndustries =
    row.industryStats.length > 0
      ? row.industryStats.map((stat) => createIndustrySummaryFromDatabase(stat.industry, stat.jobCount))
      : fallback?.topIndustries ?? [];
  const topIndustries = mergeLiveTopIndustries(baseTopIndustries, liveEstimate);

  return {
    code: row.code,
    slug: row.slug,
    name: row.name,
    teaser: row.teaser?.trim() || fallback?.teaser || buildFallbackTeaser(row.name, topIndustries),
    topIndustries,
    totalJobs: mergeLiveTotalJobs(row._count.jobs || (fallback ? countMockJobs(fallback) : 0), liveEstimate),
    homeMap: createHomeMapConfig(row.slug, row),
  };
}

function createDetailFromDatabase(
  row: DatabaseMunicipalityDetailRow,
  fallback?: MockMunicipalityRecord,
  liveEstimate?: MunicipalityJobEstimateResponse | null,
): MunicipalityRecord {
  const statsByIndustrySlug = new Map<string, MunicipalityIndustrySummary>(
    row.industryStats.map((stat) => [stat.industry.slug, createIndustrySummaryFromDatabase(stat.industry, stat.jobCount)]),
  );
  const baseJobsByIndustry = createJobsByIndustryFromDatabase(row.jobs, row.name, statsByIndustrySlug);
  const jobsByIndustry = baseJobsByIndustry.length > 0 ? baseJobsByIndustry : fallback?.jobsByIndustry ?? [];
  const baseTopIndustries =
    statsByIndustrySlug.size > 0
      ? [...statsByIndustrySlug.values()]
      : jobsByIndustry.length > 0
        ? createTopIndustriesFromJobGroups(jobsByIndustry)
        : fallback?.topIndustries ?? [];
  const topIndustries = mergeLiveTopIndustries(baseTopIndustries, liveEstimate);

  return {
    code: row.code,
    slug: row.slug,
    name: row.name,
    teaser: row.teaser?.trim() || fallback?.teaser || buildFallbackTeaser(row.name, topIndustries),
    topIndustries,
    jobsByIndustry: mergeLiveJobsByIndustry(jobsByIndustry, liveEstimate),
  };
}

async function getLiveEstimateSafely(municipalityCode: string) {
  if (!isLiveJobEstimatesEnabled()) {
    return null;
  }

  try {
    return await getMunicipalityLiveJobEstimate(createJobsRequest({ municipalityCode, locale: "da" }));
  } catch (error) {
    console.error(`Failed to read live StatBank estimate for municipality ${municipalityCode}.`, error);
    return null;
  }
}

async function getLiveEstimateMap(
  municipalities: Array<{ slug: string; code: string }>,
): Promise<Map<string, MunicipalityJobEstimateResponse>> {
  if (!isLiveJobEstimatesEnabled()) {
    return new Map<string, MunicipalityJobEstimateResponse>();
  }

  const entries = await Promise.all(
    municipalities.map(async (municipality) => {
      const estimate = await getLiveEstimateSafely(municipality.code);
      return estimate ? ([municipality.slug, estimate] as const) : null;
    }),
  );

  return new Map(entries.filter((entry): entry is readonly [string, MunicipalityJobEstimateResponse] => Boolean(entry)));
}
async function getDatabaseMunicipalityMap() {
  try {
    const rows = await prisma.municipality.findMany({
      select: {
        slug: true,
        isActive: true,
        homeMapVisible: true,
        homeMapPriority: true,
        homeMapLabelMode: true,
        homeMapRegionTag: true,
      },
    });

    return new Map(rows.map((row) => [row.slug, row satisfies DatabaseHomeMapRow]));
  } catch (error) {
    console.error("Failed to read municipality home map configuration from Prisma.", error);
    return new Map<string, DatabaseHomeMapRow>();
  }
}

async function getDatabaseMunicipalitySummaryRows() {
  try {
    return (await prisma.municipality.findMany({
      select: {
        code: true,
        slug: true,
        name: true,
        teaser: true,
        isActive: true,
        homeMapVisible: true,
        homeMapPriority: true,
        homeMapLabelMode: true,
        homeMapRegionTag: true,
        _count: {
          select: {
            jobs: true,
          },
        },
        industryStats: {
          orderBy: [{ rank: "asc" }, { jobCount: "desc" }],
          take: 3,
          select: {
            jobCount: true,
            industry: {
              select: {
                code: true,
                slug: true,
                nameDa: true,
                icon: true,
                accentColor: true,
              },
            },
          },
        },
      },
    })) satisfies DatabaseMunicipalitySummaryRow[];
  } catch (error) {
    console.error("Failed to read municipality summaries from Prisma.", error);
    return [] as DatabaseMunicipalitySummaryRow[];
  }
}

async function getDatabaseMunicipalityDetailRow(slug: string) {
  try {
    return (await prisma.municipality.findUnique({
      where: { slug },
      select: {
        code: true,
        slug: true,
        name: true,
        teaser: true,
        isActive: true,
        industryStats: {
          orderBy: [{ rank: "asc" }, { jobCount: "desc" }],
          select: {
            jobCount: true,
            industry: {
              select: {
                code: true,
                slug: true,
                nameDa: true,
                icon: true,
                accentColor: true,
              },
            },
          },
        },
        jobs: {
          orderBy: [{ industryId: "asc" }, { title: "asc" }],
          select: {
            id: true,
            title: true,
            employerName: true,
            locationLabel: true,
            summary: true,
            applyUrl: true,
            industry: {
              select: {
                code: true,
                slug: true,
                nameDa: true,
                icon: true,
                accentColor: true,
              },
            },
          },
        },
      },
    })) satisfies DatabaseMunicipalityDetailRow | null;
  } catch (error) {
    console.error(`Failed to read municipality ${slug} from Prisma.`, error);
    return null;
  }
}

function sortSummaries(items: MunicipalitySummary[]) {
  return [...items].sort((left, right) => {
    if (left.homeMap.isPrimary !== right.homeMap.isPrimary) {
      return left.homeMap.isPrimary ? -1 : 1;
    }

    if (left.homeMap.priority !== right.homeMap.priority) {
      return left.homeMap.priority - right.homeMap.priority;
    }

    return left.name.localeCompare(right.name, "da");
  });
}
export async function getMunicipalitySummaries(): Promise<MunicipalitySummary[]> {
  const databaseRows = await getDatabaseMunicipalitySummaryRows();

  if (databaseRows.length === 0) {
    const liveEstimateMap = await getLiveEstimateMap(
      pocMunicipalities.map((municipality) => ({ slug: municipality.slug, code: municipality.code })),
    );

    return sortSummaries(
      pocMunicipalities.map((municipality) => {
        const liveEstimate = liveEstimateMap.get(municipality.slug);
        return {
          ...createSummaryFromMock(municipality),
          topIndustries: mergeLiveTopIndustries(municipality.topIndustries, liveEstimate),
          totalJobs: mergeLiveTotalJobs(countMockJobs(municipality), liveEstimate),
        } satisfies MunicipalitySummary;
      }),
    );
  }

  const databaseMap = new Map(databaseRows.map((row) => [row.slug, row]));
  const visibleMunicipalities = pocMunicipalities.filter((municipality) => databaseMap.get(municipality.slug)?.isActive !== false);
  const liveEstimateMap = await getLiveEstimateMap(
    visibleMunicipalities.map((municipality) => ({ slug: municipality.slug, code: municipality.code })),
  );

  return sortSummaries(
    visibleMunicipalities.map((municipality) => {
      const databaseRow = databaseMap.get(municipality.slug);
      const liveEstimate = liveEstimateMap.get(municipality.slug);
      return databaseRow
        ? createSummaryFromDatabase(databaseRow, municipality, liveEstimate)
        : {
            ...createSummaryFromMock(municipality),
            topIndustries: mergeLiveTopIndustries(municipality.topIndustries, liveEstimate),
            totalJobs: mergeLiveTotalJobs(countMockJobs(municipality), liveEstimate),
          };
    }),
  );
}

export async function getMunicipalityHomeMapAdminRows(): Promise<MunicipalityHomeMapAdminRow[]> {
  const databaseMap = await getDatabaseMunicipalityMap();

  return pocMunicipalities
    .map((municipality) => {
      const dbRow = databaseMap.get(municipality.slug);

      return {
        code: municipality.code,
        slug: municipality.slug,
        name: municipality.name,
        isActive: dbRow?.isActive ?? true,
        homeMap: createHomeMapConfig(municipality.slug, dbRow),
      } satisfies MunicipalityHomeMapAdminRow;
    })
    .sort((left, right) => {
      if (left.homeMap.isPrimary !== right.homeMap.isPrimary) {
        return left.homeMap.isPrimary ? -1 : 1;
      }

      if (left.homeMap.priority !== right.homeMap.priority) {
        return left.homeMap.priority - right.homeMap.priority;
      }

      return left.name.localeCompare(right.name, "da");
    });
}

export async function getMunicipalityBySlug(slug: string) {
  const fallback = mockMunicipalityMap.get(slug) ?? null;
  const databaseRow = await getDatabaseMunicipalityDetailRow(slug);

  if (databaseRow) {
    if (!databaseRow.isActive) {
      return null;
    }

    const liveEstimate = await getLiveEstimateSafely(databaseRow.code);
    return createDetailFromDatabase(databaseRow, fallback ?? undefined, liveEstimate);
  }

  if (!fallback) {
    return null;
  }

  const liveEstimate = await getLiveEstimateSafely(fallback.code);
  return {
    ...createDetailFromMock(fallback),
    topIndustries: mergeLiveTopIndustries(fallback.topIndustries, liveEstimate),
    jobsByIndustry: mergeLiveJobsByIndustry(fallback.jobsByIndustry, liveEstimate),
  } satisfies MunicipalityRecord;
}