import "server-only";

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
};

export async function getMunicipalitySummaries(): Promise<MunicipalitySummary[]> {
  return pocMunicipalities.map((municipality) => ({
    code: municipality.code,
    slug: municipality.slug,
    name: municipality.name,
    teaser: municipality.teaser,
    topIndustries: municipality.topIndustries,
    totalJobs: municipality.jobsByIndustry.reduce(
      (sum, entry) => sum + entry.jobs.length,
      0,
    ),
  }));
}

export async function getMunicipalityBySlug(slug: string) {
  return pocMunicipalities.find((municipality) => municipality.slug === slug) ?? null;
}