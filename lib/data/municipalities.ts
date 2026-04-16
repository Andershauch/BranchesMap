import "server-only";

import { unstable_cache } from "next/cache";

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
import {
  JOBINDSATS_OPEN_POSITIONS_TABLE,
  JOBINDSATS_SOURCE,
  type MunicipalityImportedTopIndustriesSource,
  type MunicipalityTopIndustriesSource,
  type MunicipalityTotalJobsSource,
} from "@/lib/server/jobindsats-imports";
import {
  mapJobindsatsTitleToIndustryCode,
  normalizeJobindsatsRepresentativeTitle,
} from "@/lib/server/jobindsats-category-mapping";
import { prisma } from "@/lib/server/prisma";
import type { AppLocale } from "@/lib/i18n/config";

export type LocalizedText = {
  da: string;
  en: string;
} & Partial<Record<Exclude<AppLocale, "da" | "en">, string>>;

export type MunicipalityIndustrySummary = {
  code: string;
  slug: string;
  name: string;
  icon: string;
  accentColor: string;
  jobCount: number;
  representativeTitles?: string[];
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
  totalJobs: number;
  topIndustries: MunicipalityIndustrySummary[];
  industryOverview: MunicipalityIndustrySummary[];
  jobsByIndustry: Array<{
    industry: MunicipalityIndustrySummary;
    jobs: MunicipalityJobSummary[];
  }>;
  sources: MunicipalityDataSources;
};

export type MunicipalitySummary = {
  code: string;
  slug: string;
  name: string;
  teaser: string;
  topIndustries: MunicipalityIndustrySummary[];
  totalJobs: number;
  homeMap: MunicipalityHomeMapConfig;
  sources: MunicipalityDataSources;
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

type DatabaseImportedTopTitleRow = {
  rank: number;
  titleKey: string;
  titleLabel: string;
  openPositions: number;
};

type DatabaseImportedJobSnapshotRow = {
  source: string;
  sourceTable: string;
  period: string;
  totalOpenPositions: number;
  dailyAverageOpenPositions: number;
  newlyPostedPositions: number;
  fetchedAt: Date;
  categories: Array<{
    rank: number;
    openPositions: number;
    industry: DatabaseIndustryRow;
  }>;
  topTitles: DatabaseImportedTopTitleRow[];
};

type DatabaseMunicipalitySummaryRow = DatabaseHomeMapRow & {
  code: string;
  name: string;
  teaser: string | null;
  _count: {
    jobs: number;
  };
  industryStats: DatabaseIndustryStatRow[];
  jobSourceSnapshots: DatabaseImportedJobSnapshotRow[];
};

type DatabaseMunicipalityDetailRow = {
  code: string;
  slug: string;
  name: string;
  teaser: string | null;
  isActive: boolean;
  industryStats: DatabaseIndustryStatRow[];
  jobs: DatabaseJobRow[];
  jobSourceSnapshots: DatabaseImportedJobSnapshotRow[];
};

type LiveEstimateCacheEntry = {
  value: MunicipalityJobEstimateResponse | null;
  expiresAt: number;
  pending?: Promise<MunicipalityJobEstimateResponse | null>;
};

export type MunicipalityDataSources = {
  totalJobs: MunicipalityTotalJobsSource;
  topIndustries: MunicipalityTopIndustriesSource | MunicipalityImportedTopIndustriesSource;
  jobCards: "mock_or_db_for_now_extend_with_star_later";
};

const defaultIndustryIcon = "*";
const defaultIndustryColor = "#64748b";
const mockMunicipalityMap = new Map(pocMunicipalities.map((municipality) => [municipality.slug, municipality]));
const municipalityPublicDataTag = "municipality-public-data";
const municipalityAdminDataTag = "municipality-admin-data";
const liveEstimateTtlMs = 15 * 60 * 1000;
const liveEstimateErrorTtlMs = 2 * 60 * 1000;
const globalForMunicipalityData = globalThis as typeof globalThis & {
  branchesMapLiveEstimateCache?: Map<string, LiveEstimateCacheEntry>;
};
const liveEstimateCache =
  globalForMunicipalityData.branchesMapLiveEstimateCache ?? new Map<string, LiveEstimateCacheEntry>();

if (!globalForMunicipalityData.branchesMapLiveEstimateCache) {
  globalForMunicipalityData.branchesMapLiveEstimateCache = liveEstimateCache;
}

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

function withRepresentativeTitles(
  industries: MunicipalityIndustrySummary[],
  importedSnapshot?: DatabaseImportedJobSnapshotRow | null,
) {
  if (!importedSnapshot || importedSnapshot.topTitles.length === 0) {
    return industries;
  }

  const titlesByCode = new Map<string, string[]>();

  for (const title of importedSnapshot.topTitles) {
    const industryCode = mapJobindsatsTitleToIndustryCode(title.titleLabel);

    if (!industryCode) {
      continue;
    }

    const normalizedTitle = normalizeJobindsatsRepresentativeTitle(title.titleLabel);
    if (!normalizedTitle) {
      continue;
    }

    const existing = titlesByCode.get(industryCode) ?? [];
    if (!existing.includes(normalizedTitle)) {
      existing.push(normalizedTitle);
      titlesByCode.set(industryCode, existing);
    }
  }

  return industries.map((industry) => ({
    ...industry,
    representativeTitles: titlesByCode.get(industry.code)?.slice(0, 4) ?? [],
  }));
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

function createDefaultSources(): MunicipalityDataSources {
  return {
    totalJobs: "mock_or_db",
    topIndustries: "mock_or_db",
    jobCards: "mock_or_db_for_now_extend_with_star_later",
  };
}

function resolveImportedTopIndustries(importedSnapshot?: DatabaseImportedJobSnapshotRow | null) {
  if (!importedSnapshot || importedSnapshot.categories.length === 0) {
    return null;
  }

  return {
    topIndustries: withRepresentativeTitles(
      importedSnapshot.categories.slice(0, 3).map((entry) =>
        createIndustrySummaryFromDatabase(entry.industry, entry.openPositions),
      ),
      importedSnapshot,
    ),
    source: "jobindsats_y25i07_category_mapping" as const,
  };
}

function resolveIndustryOverview(
  current: MunicipalityIndustrySummary[],
  importedSnapshot?: DatabaseImportedJobSnapshotRow | null,
  liveEstimate?: MunicipalityJobEstimateResponse | null,
) {
  if (importedSnapshot && importedSnapshot.categories.length > 0) {
    return withRepresentativeTitles(
      importedSnapshot.categories.map((entry) => createIndustrySummaryFromDatabase(entry.industry, entry.openPositions)),
      importedSnapshot,
    );
  }

  if (liveEstimate && liveEstimate.municipalityEstimate.industryBreakdown.length > 0) {
    return liveEstimate.municipalityEstimate.industryBreakdown.map((entry) =>
      createIndustrySummaryFromLiveEstimate({
        ...entry.industry,
        jobCount: entry.estimatedJobCount,
        officialShare: entry.officialShare,
      }),
    );
  }

  return current;
}

function resolveTopIndustries(
  current: MunicipalityIndustrySummary[],
  importedSnapshot?: DatabaseImportedJobSnapshotRow | null,
  liveEstimate?: MunicipalityJobEstimateResponse | null,
) {
  const imported = resolveImportedTopIndustries(importedSnapshot);

  if (imported) {
    return imported;
  }

  if (!liveEstimate) {
    return {
      topIndustries: current,
      source: "mock_or_db" as const,
    };
  }

  const liveTopIndustries = liveEstimate.municipalityEstimate.topIndustries.map(createIndustrySummaryFromLiveEstimate);

  return {
    topIndustries: liveTopIndustries.length > 0 ? liveTopIndustries : current,
    source: "mock_or_db_plus_live_estimate" as const,
  };
}

function getLatestImportedJobSnapshot(snapshots: DatabaseImportedJobSnapshotRow[]) {
  return snapshots[0] ?? null;
}

function resolveTotalJobs(
  currentTotal: number,
  importedSnapshot?: DatabaseImportedJobSnapshotRow | null,
  liveEstimate?: MunicipalityJobEstimateResponse | null,
) {
  if (importedSnapshot) {
    return {
      totalJobs: importedSnapshot.totalOpenPositions,
      source: "jobindsats_y25i07_import" as const,
    };
  }

  if (!liveEstimate) {
    return {
      totalJobs: currentTotal,
      source: "mock_or_db" as const,
    };
  }

  return {
    totalJobs: liveEstimate.municipalityEstimate.totalEstimatedJobCount || currentTotal,
    source: "mock_or_db_plus_live_estimate" as const,
  };
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
    sources: createDefaultSources(),
  };
}

function createDetailFromMock(municipality: MockMunicipalityRecord): MunicipalityRecord {
  const industryOverview =
    municipality.jobsByIndustry.length > 0
      ? createIndustryOverviewFromJobGroups(municipality.jobsByIndustry)
      : municipality.topIndustries;

  return {
    code: municipality.code,
    slug: municipality.slug,
    name: municipality.name,
    teaser: municipality.teaser,
    totalJobs: countMockJobs(municipality),
    topIndustries: municipality.topIndustries,
    industryOverview,
    jobsByIndustry: municipality.jobsByIndustry,
    sources: createDefaultSources(),
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

function createIndustryOverviewFromJobGroups(
  jobsByIndustry: MunicipalityRecord["jobsByIndustry"],
): MunicipalityIndustrySummary[] {
  return [...jobsByIndustry]
    .sort((left, right) => {
      const leftCount = left.industry.jobCount || left.jobs.length;
      const rightCount = right.industry.jobCount || right.jobs.length;

      if (leftCount !== rightCount) {
        return rightCount - leftCount;
      }

      return left.industry.name.localeCompare(right.industry.name, "da");
    })
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

function mergeImportedCategoryCounts(
  current: MunicipalityRecord["jobsByIndustry"],
  importedSnapshot?: DatabaseImportedJobSnapshotRow | null,
) {
  if (!importedSnapshot || importedSnapshot.categories.length === 0) {
    return current;
  }

  const importedCounts = new Map(
    importedSnapshot.categories.map((entry) => [entry.industry.code, entry.openPositions] as const),
  );

  return current.map((entry) => {
    const importedCount = importedCounts.get(entry.industry.code);

    if (importedCount === undefined) {
      return entry;
    }

    return {
      ...entry,
      industry: {
        ...entry.industry,
        jobCount: importedCount,
      },
    };
  });
}

function createSummaryFromDatabase(
  row: DatabaseMunicipalitySummaryRow,
  fallback?: MockMunicipalityRecord,
  liveEstimate?: MunicipalityJobEstimateResponse | null,
): MunicipalitySummary {
  const importedSnapshot = getLatestImportedJobSnapshot(row.jobSourceSnapshots);
  const baseTopIndustries =
    row.industryStats.length > 0
      ? row.industryStats.map((stat) => createIndustrySummaryFromDatabase(stat.industry, stat.jobCount))
      : fallback?.topIndustries ?? [];
  const resolvedTopIndustries = resolveTopIndustries(baseTopIndustries, importedSnapshot, liveEstimate);
  const resolvedTotalJobs = resolveTotalJobs(
    row._count.jobs || (fallback ? countMockJobs(fallback) : 0),
    importedSnapshot,
    liveEstimate,
  );

  return {
    code: row.code,
    slug: row.slug,
    name: row.name,
    teaser:
      row.teaser?.trim() || fallback?.teaser || buildFallbackTeaser(row.name, resolvedTopIndustries.topIndustries),
    topIndustries: resolvedTopIndustries.topIndustries,
    totalJobs: resolvedTotalJobs.totalJobs,
    homeMap: createHomeMapConfig(row.slug, row),
    sources: {
      totalJobs: resolvedTotalJobs.source,
      topIndustries: resolvedTopIndustries.source,
      jobCards: "mock_or_db_for_now_extend_with_star_later",
    },
  };
}

function createDetailFromDatabase(
  row: DatabaseMunicipalityDetailRow,
  fallback?: MockMunicipalityRecord,
  liveEstimate?: MunicipalityJobEstimateResponse | null,
): MunicipalityRecord {
  const importedSnapshot = getLatestImportedJobSnapshot(row.jobSourceSnapshots);
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
  const industryOverview = resolveIndustryOverview(
    jobsByIndustry.map((entry) => entry.industry),
    importedSnapshot,
    liveEstimate,
  );
  const resolvedTopIndustries = resolveTopIndustries(baseTopIndustries, importedSnapshot, liveEstimate);
  const resolvedTotalJobs = resolveTotalJobs(
    row.jobs.length || (fallback ? countMockJobs(fallback) : 0),
    importedSnapshot,
    liveEstimate,
  );

  return {
    code: row.code,
    slug: row.slug,
    name: row.name,
    teaser:
      row.teaser?.trim() || fallback?.teaser || buildFallbackTeaser(row.name, resolvedTopIndustries.topIndustries),
    totalJobs: resolvedTotalJobs.totalJobs,
    topIndustries: resolvedTopIndustries.topIndustries,
    industryOverview,
    jobsByIndustry: mergeLiveJobsByIndustry(mergeImportedCategoryCounts(jobsByIndustry, importedSnapshot), liveEstimate),
    sources: {
      totalJobs: resolvedTotalJobs.source,
      topIndustries: resolvedTopIndustries.source,
      jobCards: "mock_or_db_for_now_extend_with_star_later",
    },
  };
}

async function getLiveEstimateSafely(municipalityCode: string) {
  if (!isLiveJobEstimatesEnabled()) {
    return null;
  }

  const now = Date.now();
  const cached = liveEstimateCache.get(municipalityCode);

  if (cached && cached.expiresAt > now && !cached.pending) {
    return cached.value;
  }

  if (cached?.pending) {
    return cached.pending;
  }

  const pending = (async () => {
    try {
      const estimate = await getMunicipalityLiveJobEstimate(
        createJobsRequest({ municipalityCode, locale: "da" }),
      );
      liveEstimateCache.set(municipalityCode, {
        value: estimate,
        expiresAt: Date.now() + liveEstimateTtlMs,
      });
      return estimate;
    } catch (error) {
      if (
        !(error instanceof Error && "digest" in error && (error as Error & { digest?: string }).digest === "DYNAMIC_SERVER_USAGE")
      ) {
        console.error(`Failed to read live StatBank estimate for municipality ${municipalityCode}.`, error);
      }
      liveEstimateCache.set(municipalityCode, {
        value: null,
        expiresAt: Date.now() + liveEstimateErrorTtlMs,
      });
      return null;
    }
  })();

  liveEstimateCache.set(municipalityCode, {
    value: cached?.value ?? null,
    expiresAt: now + liveEstimateTtlMs,
    pending,
  });

  return pending;
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
const getCachedDatabaseMunicipalityMap = unstable_cache(
  async () => {
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

      return rows satisfies DatabaseHomeMapRow[];
    } catch (error) {
      console.error("Failed to read municipality home map configuration from Prisma.", error);
      return [] as DatabaseHomeMapRow[];
    }
  },
  ["municipality-home-map-config"],
  { revalidate: 60 * 60, tags: [municipalityAdminDataTag, municipalityPublicDataTag] },
);

async function getDatabaseMunicipalityMap() {
  const rows = await getCachedDatabaseMunicipalityMap();
  return new Map(rows.map((row) => [row.slug, row satisfies DatabaseHomeMapRow]));
}

const getCachedDatabaseMunicipalitySummaryRows = unstable_cache(
  async () => {
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
          jobSourceSnapshots: {
            where: {
              source: JOBINDSATS_SOURCE,
              sourceTable: JOBINDSATS_OPEN_POSITIONS_TABLE,
            },
            orderBy: [{ period: "desc" }, { fetchedAt: "desc" }],
            take: 1,
            include: {
              categories: {
                orderBy: [{ rank: "asc" }],
                take: 10,
                include: {
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
              topTitles: {
                orderBy: [{ rank: "asc" }],
                take: 5,
                select: {
                  rank: true,
                  titleKey: true,
                  titleLabel: true,
                  openPositions: true,
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
  },
  ["municipality-summary-rows"],
  { revalidate: 10 * 60, tags: [municipalityPublicDataTag] },
);

async function getDatabaseMunicipalitySummaryRows() {
  return getCachedDatabaseMunicipalitySummaryRows();
}

const getCachedDatabaseMunicipalityDetailRow = unstable_cache(
  async (slug: string) => {
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
          jobSourceSnapshots: {
            where: {
              source: JOBINDSATS_SOURCE,
              sourceTable: JOBINDSATS_OPEN_POSITIONS_TABLE,
            },
            orderBy: [{ period: "desc" }, { fetchedAt: "desc" }],
            take: 1,
            include: {
              categories: {
                orderBy: [{ rank: "asc" }],
                take: 10,
                include: {
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
              topTitles: {
                orderBy: [{ rank: "asc" }],
                take: 50,
                select: {
                  rank: true,
                  titleKey: true,
                  titleLabel: true,
                  openPositions: true,
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
  },
  ["municipality-detail-row"],
  { revalidate: 10 * 60, tags: [municipalityPublicDataTag] },
);

async function getDatabaseMunicipalityDetailRow(slug: string) {
  return getCachedDatabaseMunicipalityDetailRow(slug);
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
        const resolvedTopIndustries = resolveTopIndustries(municipality.topIndustries, null, liveEstimate);
        const resolvedTotalJobs = resolveTotalJobs(countMockJobs(municipality), null, liveEstimate);
        return {
          ...createSummaryFromMock(municipality),
          topIndustries: resolvedTopIndustries.topIndustries,
          totalJobs: resolvedTotalJobs.totalJobs,
          sources: {
            totalJobs: resolvedTotalJobs.source,
            topIndustries: resolvedTopIndustries.source,
            jobCards: "mock_or_db_for_now_extend_with_star_later",
          },
        } satisfies MunicipalitySummary;
      }),
    );
  }

  const databaseMap = new Map(databaseRows.map((row) => [row.slug, row]));
  const visibleMunicipalities = pocMunicipalities.filter((municipality) => databaseMap.get(municipality.slug)?.isActive !== false);

  return sortSummaries(
    visibleMunicipalities.map((municipality) => {
      const databaseRow = databaseMap.get(municipality.slug);
      return databaseRow
        ? createSummaryFromDatabase(databaseRow, municipality, null)
        : (() => {
            const resolvedTopIndustries = resolveTopIndustries(municipality.topIndustries, null, null);
            const resolvedTotalJobs = resolveTotalJobs(countMockJobs(municipality), null, null);

            return {
              ...createSummaryFromMock(municipality),
              topIndustries: resolvedTopIndustries.topIndustries,
              totalJobs: resolvedTotalJobs.totalJobs,
              sources: {
                totalJobs: resolvedTotalJobs.source,
                topIndustries: resolvedTopIndustries.source,
                jobCards: "mock_or_db_for_now_extend_with_star_later",
              },
            } satisfies MunicipalitySummary;
          })();
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
  const resolvedTopIndustries = resolveTopIndustries(fallback.topIndustries, null, liveEstimate);
  const resolvedTotalJobs = resolveTotalJobs(countMockJobs(fallback), null, liveEstimate);
  return {
    ...createDetailFromMock(fallback),
    totalJobs: resolvedTotalJobs.totalJobs,
    topIndustries: resolvedTopIndustries.topIndustries,
    industryOverview: resolveIndustryOverview(fallback.jobsByIndustry.map((entry) => entry.industry), null, liveEstimate),
    jobsByIndustry: mergeLiveJobsByIndustry(fallback.jobsByIndustry, liveEstimate),
    sources: {
      totalJobs: resolvedTotalJobs.source,
      topIndustries: resolvedTopIndustries.source,
      jobCards: "mock_or_db_for_now_extend_with_star_later",
    },
  } satisfies MunicipalityRecord;
}
