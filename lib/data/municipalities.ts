import "server-only";

import {
  getMunicipalityHomeMapConfig,
  type MunicipalityHomeMapConfig,
  type MunicipalityHomeMapLabelMode,
  type MunicipalityHomeMapRegionTag,
} from "@/lib/config/home-map-display";
import { pocMunicipalities } from "@/lib/mock/poc-data";
import { prisma } from "@/lib/server/prisma";

export type MunicipalitySummary = {
  code: string;
  slug: string;
  name: string;
  teaser: string;
  topIndustries: Array<{
    code: string;
    slug: string;
    name: string;
    icon: string;
    accentColor: string;
    jobCount: number;
  }>;
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
  const databaseMap = await getDatabaseMunicipalityMap();

  return sortSummaries(
    pocMunicipalities.map((municipality) => ({
      code: municipality.code,
      slug: municipality.slug,
      name: municipality.name,
      teaser: municipality.teaser,
      topIndustries: municipality.topIndustries,
      totalJobs: municipality.jobsByIndustry.reduce((sum, entry) => sum + entry.jobs.length, 0),
      homeMap: createHomeMapConfig(municipality.slug, databaseMap.get(municipality.slug)),
    })),
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
  return pocMunicipalities.find((municipality) => municipality.slug === slug) ?? null;
}