import "server-only";

import { pocMunicipalities } from "@/lib/mock/poc-data";

export async function getMunicipalitySummaries() {
  return pocMunicipalities.map((municipality) => ({
    code: municipality.code,
    slug: municipality.slug,
    name: municipality.name,
    mapX: municipality.mapX,
    mapY: municipality.mapY,
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