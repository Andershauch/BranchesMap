import "server-only";

import { createHash } from "node:crypto";

import { getMunicipalityBySlug } from "@/lib/data/municipalities";

export const MUNICIPALITY_FOLLOW_SNAPSHOT_VERSION = "municipality-follow-v1";

export type MunicipalityFollowSnapshot = {
  version: typeof MUNICIPALITY_FOLLOW_SNAPSHOT_VERSION;
  municipality: {
    code: string;
    slug: string;
    name: string;
  };
  content: {
    teaser: string;
    totalJobs: number;
    topIndustries: Array<{
      code: string;
      slug: string;
      name: string;
      jobCount: number;
    }>;
    jobsByIndustry: Array<{
      industry: {
        code: string;
        slug: string;
        name: string;
        jobCount: number;
      };
      jobs: Array<{
        id: string;
        titleDa: string;
        titleEn: string;
        employerNameDa: string;
        employerNameEn: string;
        locationDa: string;
        locationEn: string;
        summaryDa: string;
        summaryEn: string;
        applyUrl: string;
      }>;
    }>;
  };
  sources: {
    totalJobs: "mock_or_db" | "mock_or_db_plus_live_estimate" | "jobindsats_y25i07_import";
    topIndustries: "mock_or_db" | "mock_or_db_plus_live_estimate" | "jobindsats_y25i07_category_mapping";
    jobCards: "mock_or_db_for_now_extend_with_star_later";
  };
};

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export async function buildMunicipalityFollowSnapshotBySlug(
  municipalitySlug: string,
): Promise<MunicipalityFollowSnapshot | null> {
  const municipality = await getMunicipalityBySlug(municipalitySlug);

  if (!municipality) {
    return null;
  }

  return {
    version: MUNICIPALITY_FOLLOW_SNAPSHOT_VERSION,
    municipality: {
      code: municipality.code,
      slug: municipality.slug,
      name: normalizeText(municipality.name),
    },
    content: {
      teaser: normalizeText(municipality.teaser),
      totalJobs: municipality.totalJobs,
      topIndustries: municipality.topIndustries.map((industry) => ({
        code: industry.code,
        slug: industry.slug,
        name: normalizeText(industry.name),
        jobCount: industry.jobCount,
      })),
      jobsByIndustry: municipality.jobsByIndustry.map((entry) => ({
        industry: {
          code: entry.industry.code,
          slug: entry.industry.slug,
          name: normalizeText(entry.industry.name),
          jobCount: entry.industry.jobCount,
        },
        jobs: entry.jobs.map((job) => ({
          id: job.id,
          titleDa: normalizeText(job.title.da),
          titleEn: normalizeText(job.title.en),
          employerNameDa: normalizeText(job.employerName.da),
          employerNameEn: normalizeText(job.employerName.en),
          locationDa: normalizeText(job.locationLabel.da),
          locationEn: normalizeText(job.locationLabel.en),
          summaryDa: normalizeText(job.summary.da),
          summaryEn: normalizeText(job.summary.en),
          applyUrl: normalizeText(job.applyUrl),
        })),
      })),
    },
    sources: {
      ...municipality.sources,
    },
  };
}

export function hashMunicipalityFollowSnapshot(snapshot: MunicipalityFollowSnapshot) {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

export async function buildMunicipalityFollowSnapshotWithHash(municipalitySlug: string) {
  const snapshot = await buildMunicipalityFollowSnapshotBySlug(municipalitySlug);

  if (!snapshot) {
    return null;
  }

  return {
    snapshot,
    hash: hashMunicipalityFollowSnapshot(snapshot),
  };
}
