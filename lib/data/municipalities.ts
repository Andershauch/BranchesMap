import "server-only";

import { getMunicipalityHomeMapConfig, type MunicipalityHomeMapConfig } from "@/lib/config/home-map-display";
import { pocMunicipalities } from "@/lib/mock/poc-data";

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

export async function getMunicipalitySummaries(): Promise<MunicipalitySummary[]> {
  return pocMunicipalities
    .map((municipality) => ({
      code: municipality.code,
      slug: municipality.slug,
      name: municipality.name,
      teaser: municipality.teaser,
      topIndustries: municipality.topIndustries,
      totalJobs: municipality.jobsByIndustry.reduce(
        (sum, entry) => sum + entry.jobs.length,
        0,
      ),
      homeMap: getMunicipalityHomeMapConfig(municipality.slug),
    }))
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
