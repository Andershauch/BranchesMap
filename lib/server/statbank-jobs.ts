import "server-only";

import { sjaellandMunicipalityProperties } from "@/lib/geo/sjaelland";
import { pocMunicipalities, pocIndustryCatalog } from "@/lib/mock/poc-data";

export const STATBANK_DATA_URL = "https://api.statbank.dk/v1/data";
export const BRANCH_TABLE = "LSK01";
export const REGION_TABLE = "LSK02";
export const DEFAULT_FORMAT = "JSONSTAT" as const;
export const DEFAULT_MUNICIPALITY_CODE = "0101";
export const DEFAULT_BRANCH_SELECTION = ["*"];
export const DEFAULT_TIME_SELECTION = ["(1)"];
export const DEFAULT_BRANCH_VALUES = ["2", "3", "4", "5", "6-7", "8"];
export const DEFAULT_REGION_UNIT = "LS";
export const DEFAULT_BRANCH_UNIT = "LS";
export const DEFAULT_SIZE = "000";
const REQUEST_TIMEOUT_MS = 10000;
const DANISH_AREA_LABEL = "Omrade";
const DANISH_AREA_LABEL_UNICODE = "Omr\u00E5de";
const ESTIMATION_NOTE =
  "Danmarks Statistik stiller aktuelt ledige stillinger til raadighed fordelt paa brancher (LSK01) og regioner (LSK02), men ikke pr. kommune og branche i samme tabel. Kommunelag er derfor et tydeligt markeret estimat, skaleret til den nuvaerende demo-model.";
const FALLBACK_INDUSTRY = {
  code: "other",
  slug: "andet",
  name: "Andet",
  icon: "*",
  accentColor: "#64748b",
};

const municipalityByCode = new Map(sjaellandMunicipalityProperties.map((municipality) => [municipality.code, municipality]));
const municipalityByLookupCode = new Map(
  sjaellandMunicipalityProperties.flatMap((municipality) => {
    const withoutLeadingZeroes = municipality.code.replace(/^0+/, "") || municipality.code;
    return [
      [municipality.code, municipality],
      [withoutLeadingZeroes, municipality],
    ] as const;
  }),
);
const demoMunicipalityByCode = new Map(
  pocMunicipalities.flatMap((municipality) => {
    const withoutLeadingZeroes = municipality.code.replace(/^0+/, "") || municipality.code;
    return [
      [municipality.code, municipality],
      [withoutLeadingZeroes, municipality],
    ] as const;
  }),
);
const industryByCode = new Map(pocIndustryCatalog.map((industry) => [industry.code, industry]));
const branchRowsCache = new Map<string, Promise<BranchRow[]>>();
const regionRowsCache = new Map<string, Promise<RegionRow[]>>();

type JsonStatDimension = {
  label?: string;
  category?: {
    index?: string[] | Record<string, number>;
    label?: Record<string, string>;
  };
};

type JsonStatDataset = {
  class?: string;
  id?: string[];
  size?: number[];
  value?: Array<number | null> | Record<string, number | null>;
  dimension?: Record<string, JsonStatDimension>;
};

type FlatJsonStatRow = {
  value: number;
  dimensions: Record<string, { code: string; label: string }>;
};

export type StatbankLocale = "da" | "en";

export type JobsRouteRequest = {
  Tabel: string;
  Variable: {
    Omrade: string[];
    Branche: string[];
    Tid: string[];
  };
  Format: typeof DEFAULT_FORMAT;
  locale: StatbankLocale;
  allowHistorical: boolean;
};

export type RouteBody = {
  Tabel?: string;
  Variable?: Record<string, string | string[] | undefined>;
  Format?: string;
  locale?: string;
  allowHistorical?: boolean;
};

export type BranchRow = {
  branchCode: string;
  branchLabel: string;
  timeCode: string;
  timeLabel: string;
  jobCount: number;
  share: number;
};

export type RegionRow = {
  regionCode: string;
  regionLabel: string;
  timeCode: string;
  timeLabel: string;
  jobCount: number;
};

export type StatbankIndustry = {
  code: string;
  slug: string;
  name: string;
  icon: string;
  accentColor: string;
};

export type IndustryBreakdownEntry = {
  industry: StatbankIndustry;
  estimatedJobCount: number;
  officialShare: number;
  statbankBranches: Array<{ code: string; label: string; officialJobCount: number; share: number }>;
};

export type MunicipalityJobEstimateResponse = {
  ok: true;
  exactness: string;
  note: string;
  municipality: { code: string; name: string; slug: string; regionCode: string; regionName: string };
  source: { requestedTable: string; usedTables: string[]; tableWasReplaced: boolean; endpoint: string; format: typeof DEFAULT_FORMAT };
  latestTime: { code: string; label: string } | null;
  dataFreshness: {
    mode: "historical_override" | "latest_official_period_only";
    usesLatestOfficialPeriodByDefault: boolean;
    historicalOverrideEnabled: boolean;
    requestedTimeSelection: string[];
    latestOfficialPeriod: { code: string; label: string } | null;
    message: string;
  };
  official: { regionTotalJobPostings: number | null; branchBreakdown: BranchRow[] };
  municipalityEstimate: {
    basis: string;
    demoTotalWeight: number;
    totalEstimatedJobCount: number;
    topIndustries: Array<StatbankIndustry & { jobCount: number; officialShare: number }>;
    industryBreakdown: IndustryBreakdownEntry[];
  };
  requestedExtract: JobsRouteRequest;
  fetchedAt: string;
};

function normalizeForLookup(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function toArray(value: string | string[] | undefined, fallback: string[]) {
  if (Array.isArray(value)) {
    const items = value.map((item) => item.trim()).filter(Boolean);
    return items.length > 0 ? items : fallback;
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return fallback;
}

export function normalizeMunicipalityCode(candidate: string | null | undefined) {
  if (!candidate) {
    return DEFAULT_MUNICIPALITY_CODE;
  }

  const digits = candidate.replace(/\D/g, "");

  if (digits.length === 3) {
    return digits.padStart(4, "0");
  }

  if (digits.length === 4) {
    return digits;
  }

  return DEFAULT_MUNICIPALITY_CODE;
}

export function isTruthyFlag(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  return value === "1" || value.toLowerCase() === "true" || value.toLowerCase() === "yes";
}

export function resolveRequestedTimeSelection(timeValues: string[], allowHistorical: boolean) {
  if (!allowHistorical) {
    return DEFAULT_TIME_SELECTION;
  }

  return timeValues.length > 0 ? timeValues : DEFAULT_TIME_SELECTION;
}

export function buildDataFreshnessMessage(locale: StatbankLocale, latestTimeLabel: string | null, allowHistorical: boolean) {
  const periodLabel = latestTimeLabel ?? "(ukendt periode)";

  if (locale === "en") {
    return allowHistorical
      ? `Historical override enabled. Current response is based on the selected official quarter ${periodLabel}.`
      : `Latest official period only. Current response is based on the most recent published quarter ${periodLabel}, not live daily or monthly data.`;
  }

  return allowHistorical
    ? `Historisk override er aktiv. Det aktuelle svar er baseret paa den valgte officielle periode ${periodLabel}.`
    : `Kun seneste officielle periode bruges. Det aktuelle svar er baseret paa det nyeste offentliggjorte kvartal ${periodLabel}, ikke live dags- eller maanedsdata.`;
}

export function createJobsRequest(input: {
  municipalityCode: string;
  table?: string;
  branchValues?: string[];
  timeValues?: string[];
  locale?: StatbankLocale;
  allowHistorical?: boolean;
}): JobsRouteRequest {
  const allowHistorical = input.allowHistorical === true;

  return {
    Tabel: input.table?.trim() || BRANCH_TABLE,
    Variable: {
      Omrade: [normalizeMunicipalityCode(input.municipalityCode)],
      Branche: toArray(input.branchValues, DEFAULT_BRANCH_SELECTION),
      Tid: resolveRequestedTimeSelection(toArray(input.timeValues, DEFAULT_TIME_SELECTION), allowHistorical),
    },
    Format: DEFAULT_FORMAT,
    locale: input.locale === "en" ? "en" : "da",
    allowHistorical,
  };
}

export function readJobsRequestFromBody(body: RouteBody | null | undefined): JobsRouteRequest {
  const variable = body?.Variable ?? {};
  const areaValue = variable.Omrade ?? variable[DANISH_AREA_LABEL] ?? variable[DANISH_AREA_LABEL_UNICODE];
  const allowHistorical = body?.allowHistorical === true;

  return {
    Tabel: body?.Tabel?.trim() || BRANCH_TABLE,
    Variable: {
      Omrade: toArray(areaValue, [DEFAULT_MUNICIPALITY_CODE]).map((value) => normalizeMunicipalityCode(value)),
      Branche: toArray(variable.Branche, DEFAULT_BRANCH_SELECTION),
      Tid: resolveRequestedTimeSelection(toArray(variable.Tid, DEFAULT_TIME_SELECTION), allowHistorical),
    },
    Format: body?.Format === DEFAULT_FORMAT ? DEFAULT_FORMAT : DEFAULT_FORMAT,
    locale: body?.locale === "en" ? "en" : "da",
    allowHistorical,
  };
}
async function fetchJson(url: string, init: RequestInit, errorContext: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        "content-type": "application/json; charset=utf-8",
        accept: "application/json",
        ...(init.headers ?? {}),
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new Error(`${errorContext} (${response.status} ${response.statusText})${details ? `: ${details}` : ""}`);
    }

    return (await response.json()) as unknown;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${errorContext}: request timed out after ${REQUEST_TIMEOUT_MS}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJsonStatDataset({
  table,
  locale,
  variables,
}: {
  table: string;
  locale: StatbankLocale;
  variables: Array<{ code: string; values: string[] }>;
}) {
  return fetchJson(
    STATBANK_DATA_URL,
    {
      method: "POST",
      body: JSON.stringify({
        table,
        format: DEFAULT_FORMAT,
        lang: locale,
        valuePresentation: "Value",
        variables,
      }),
    },
    `Could not read data for table ${table} from Danmarks Statistik`,
  );
}

function getJsonStatDataset(payload: unknown): JsonStatDataset | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as JsonStatDataset & { dataset?: JsonStatDataset };

  if (candidate.class === "dataset" && candidate.dimension) {
    return candidate;
  }

  if (candidate.dataset?.dimension) {
    return candidate.dataset;
  }

  return candidate.dimension ? candidate : null;
}

function getCategoryEntries(dimension: JsonStatDimension | undefined) {
  const category = dimension?.category;
  const index = category?.index;
  const labels = category?.label ?? {};

  if (Array.isArray(index)) {
    return index.map((code) => ({ code, label: labels[code] ?? code }));
  }

  if (index && typeof index === "object") {
    return Object.entries(index)
      .sort((left, right) => left[1] - right[1])
      .map(([code]) => ({ code, label: labels[code] ?? code }));
  }

  return Object.keys(labels).map((code) => ({ code, label: labels[code] ?? code }));
}

function getValueAt(dataset: JsonStatDataset, flatIndex: number) {
  if (Array.isArray(dataset.value)) {
    return dataset.value[flatIndex] ?? null;
  }

  if (dataset.value && typeof dataset.value === "object") {
    return dataset.value[String(flatIndex)] ?? null;
  }

  return null;
}

function flattenJsonStatDataset(dataset: JsonStatDataset) {
  const dimensions = dataset.dimension ?? {};
  const dimensionMetadata = dimensions as Record<string, unknown> & {
    id?: string[];
    size?: number[];
  };
  const ids = dataset.id ?? dimensionMetadata.id ?? [];
  const sizes = dataset.size ?? dimensionMetadata.size ?? [];

  if (ids.length === 0 || sizes.length === 0 || ids.length !== sizes.length) {
    return [] as FlatJsonStatRow[];
  }

  const categoryEntries = ids.map((id) => getCategoryEntries(dimensions[id]));
  const totalRows = sizes.reduce((product, size) => product * size, 1);
  const rows: FlatJsonStatRow[] = [];

  for (let flatIndex = 0; flatIndex < totalRows; flatIndex += 1) {
    const rawValue = getValueAt(dataset, flatIndex);

    if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
      continue;
    }

    const valuesByDimension: FlatJsonStatRow["dimensions"] = {};

    for (let dimensionIndex = 0; dimensionIndex < ids.length; dimensionIndex += 1) {
      const stride = sizes.slice(dimensionIndex + 1).reduce((product, size) => product * size, 1);
      const categoryIndex = Math.floor(flatIndex / stride) % sizes[dimensionIndex];
      const category = categoryEntries[dimensionIndex]?.[categoryIndex];
      const id = ids[dimensionIndex];

      if (category) {
        valuesByDimension[id] = category;
      }
    }

    rows.push({ value: rawValue, dimensions: valuesByDimension });
  }

  return rows;
}

function mapBranchToIndustry(branchLabel: string) {
  const normalized = normalizeForLookup(branchLabel);

  if (normalized.includes("offentlig administration") || normalized.includes("undervisning") || normalized.includes("sundhed")) {
    return industryByCode.get("health") ?? FALLBACK_INDUSTRY;
  }

  if (normalized.includes("landbrug") || normalized.includes("skovbrug") || normalized.includes("fiskeri")) {
    return industryByCode.get("food") ?? FALLBACK_INDUSTRY;
  }

  if (normalized.includes("industri") || normalized.includes("raastof") || normalized.includes("forsyning")) {
    return industryByCode.get("build") ?? FALLBACK_INDUSTRY;
  }

  if (normalized.includes("bygge") || normalized.includes("anlaeg")) {
    return industryByCode.get("build") ?? FALLBACK_INDUSTRY;
  }

  if (normalized.includes("handel") || normalized.includes("transport") || normalized.includes("hotel") || normalized.includes("restauration")) {
    return industryByCode.get("logistics") ?? FALLBACK_INDUSTRY;
  }

  if (normalized.includes("information") || normalized.includes("kommunikation")) {
    return industryByCode.get("tech") ?? FALLBACK_INDUSTRY;
  }

  if (normalized.includes("finans") || normalized.includes("forsikring") || normalized.includes("ejendom")) {
    return industryByCode.get("tech") ?? FALLBACK_INDUSTRY;
  }

  if (normalized.includes("erhvervsservice")) {
    return industryByCode.get("tech") ?? FALLBACK_INDUSTRY;
  }

  if (normalized.includes("kultur") || normalized.includes("fritid") || normalized.includes("anden service")) {
    return industryByCode.get("tourism") ?? FALLBACK_INDUSTRY;
  }

  return FALLBACK_INDUSTRY;
}

function createUiBreakdown(branches: BranchRow[], demoTotalWeight: number) {
  const aggregated = new Map<string, IndustryBreakdownEntry>();

  for (const branch of branches) {
    const mappedIndustry = mapBranchToIndustry(branch.branchLabel);
    const existing = aggregated.get(mappedIndustry.code) ?? {
      industry: mappedIndustry,
      estimatedJobCount: 0,
      officialShare: 0,
      statbankBranches: [],
    };

    existing.estimatedJobCount += Math.round(demoTotalWeight * branch.share);
    existing.officialShare += branch.share;
    existing.statbankBranches.push({
      code: branch.branchCode,
      label: branch.branchLabel,
      officialJobCount: branch.jobCount,
      share: branch.share,
    });

    aggregated.set(mappedIndustry.code, existing);
  }

  return [...aggregated.values()].sort((left, right) => {
    if (left.estimatedJobCount !== right.estimatedJobCount) {
      return right.estimatedJobCount - left.estimatedJobCount;
    }

    return left.industry.name.localeCompare(right.industry.name, "da");
  });
}

function buildBranchRows(rows: FlatJsonStatRow[]) {
  const result = rows
    .map((row) => {
      const branch = row.dimensions.BRANCHE;
      const time = row.dimensions.Tid;

      if (!branch || !time || branch.code === "0") {
        return null;
      }

      return {
        branchCode: branch.code,
        branchLabel: branch.label,
        timeCode: time.code,
        timeLabel: time.label,
        jobCount: row.value,
        share: 0,
      } satisfies BranchRow;
    })
    .filter((row): row is BranchRow => Boolean(row))
    .sort((left, right) => right.jobCount - left.jobCount);

  const total = result.reduce((sum, row) => sum + row.jobCount, 0);
  return result.map((row) => ({ ...row, share: total > 0 ? row.jobCount / total : 0 }));
}

function buildRegionRows(rows: FlatJsonStatRow[]) {
  return rows
    .map((row) => {
      const region = row.dimensions.REGION;
      const time = row.dimensions.Tid;

      if (!region || !time) {
        return null;
      }

      return {
        regionCode: region.code,
        regionLabel: region.label,
        timeCode: time.code,
        timeLabel: time.label,
        jobCount: row.value,
      } satisfies RegionRow;
    })
    .filter((row): row is RegionRow => Boolean(row))
    .sort((left, right) => right.jobCount - left.jobCount);
}

function getDemoTotalWeight(municipalityCode: string) {
  const demoMunicipality = demoMunicipalityByCode.get(municipalityCode) ?? demoMunicipalityByCode.get(municipalityCode.replace(/^0+/, ""));
  return demoMunicipality ? demoMunicipality.topIndustries.reduce((sum, industry) => sum + industry.jobCount, 0) : 0;
}

function getMunicipalityMeta(municipalityCode: string) {
  return municipalityByCode.get(municipalityCode) ?? municipalityByLookupCode.get(municipalityCode.replace(/^0+/, "")) ?? null;
}

function getRegionCodeForMunicipality(municipalityCode: string) {
  const municipality = getMunicipalityMeta(municipalityCode);
  return municipality ? municipality.regionCode.slice(-3) : null;
}

function getTimeCacheKey(locale: StatbankLocale, timeValues: string[]) {
  return `${locale}:${timeValues.join(",")}`;
}
function getBranchRowsForSelection(locale: StatbankLocale, timeValues: string[]) {
  const cacheKey = getTimeCacheKey(locale, timeValues);
  const existing = branchRowsCache.get(cacheKey);

  if (existing) {
    return existing;
  }

  const pending = (async () => {
    const payload = await fetchJsonStatDataset({
      table: BRANCH_TABLE,
      locale,
      variables: [
        { code: "BRANCHE", values: DEFAULT_BRANCH_VALUES },
        { code: "ENHED", values: [DEFAULT_BRANCH_UNIT] },
        { code: "ST\u00D8RRELSE", values: [DEFAULT_SIZE] },
        { code: "Tid", values: timeValues },
      ],
    });
    const dataset = getJsonStatDataset(payload);

    if (!dataset) {
      throw new Error("Danmarks Statistik returned an unexpected JSONSTAT payload.");
    }

    return buildBranchRows(flattenJsonStatDataset(dataset));
  })();

  branchRowsCache.set(cacheKey, pending);
  pending.catch(() => branchRowsCache.delete(cacheKey));
  return pending;
}

function getRegionRowsForSelection(locale: StatbankLocale, regionCode: string, timeValues: string[]) {
  const cacheKey = `${getTimeCacheKey(locale, timeValues)}:${regionCode}`;
  const existing = regionRowsCache.get(cacheKey);

  if (existing) {
    return existing;
  }

  const pending = (async () => {
    const payload = await fetchJsonStatDataset({
      table: REGION_TABLE,
      locale,
      variables: [
        { code: "REGION", values: [regionCode] },
        { code: "ENHED", values: [DEFAULT_REGION_UNIT] },
        { code: "Tid", values: timeValues },
      ],
    });
    const dataset = getJsonStatDataset(payload);

    if (!dataset) {
      throw new Error("Danmarks Statistik returned an unexpected JSONSTAT payload.");
    }

    return buildRegionRows(flattenJsonStatDataset(dataset));
  })();

  regionRowsCache.set(cacheKey, pending);
  pending.catch(() => regionRowsCache.delete(cacheKey));
  return pending;
}

export function isLiveJobEstimatesEnabled() {
  const value = process.env.ENABLE_LIVE_JOB_ESTIMATES?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export async function getMunicipalityLiveJobEstimate(requested: JobsRouteRequest): Promise<MunicipalityJobEstimateResponse> {
  const municipalityCode = requested.Variable.Omrade[0] ?? DEFAULT_MUNICIPALITY_CODE;
  const municipality = getMunicipalityMeta(municipalityCode);

  if (!municipality) {
    throw new Error(`Unknown municipality code: ${municipalityCode}`);
  }

  const regionCode = getRegionCodeForMunicipality(municipality.code);

  if (!regionCode) {
    throw new Error(`Could not map municipality ${municipality.code} to a region code.`);
  }

  const timeValues = requested.Variable.Tid.length > 0 ? requested.Variable.Tid : DEFAULT_TIME_SELECTION;
  const [branchRows, regionRows] = await Promise.all([
    getBranchRowsForSelection(requested.locale, timeValues),
    getRegionRowsForSelection(requested.locale, regionCode, timeValues),
  ]);

  const regionTotal = regionRows[0] ?? null;
  const demoTotalWeight = getDemoTotalWeight(municipality.code);
  const industryBreakdown = createUiBreakdown(branchRows, demoTotalWeight);
  const totalEstimatedJobCount = industryBreakdown.reduce((sum, entry) => sum + entry.estimatedJobCount, 0);
  const topIndustries = industryBreakdown.slice(0, 3).map((entry) => ({
    ...entry.industry,
    jobCount: entry.estimatedJobCount,
    officialShare: entry.officialShare,
  }));
  const requestedTable = requested.Tabel;
  const tableWasReplaced = requestedTable !== BRANCH_TABLE;
  const latestTime = regionTotal
    ? { code: regionTotal.timeCode, label: regionTotal.timeLabel }
    : branchRows[0]
      ? { code: branchRows[0].timeCode, label: branchRows[0].timeLabel }
      : null;

  return {
    ok: true,
    exactness: "official_branch_distribution_plus_region_total_with_demo_scaled_municipality_estimate",
    note: ESTIMATION_NOTE,
    municipality: {
      code: municipality.code,
      name: municipality.name,
      slug: municipality.slug,
      regionCode,
      regionName: municipality.regionName,
    },
    source: {
      requestedTable,
      usedTables: [BRANCH_TABLE, REGION_TABLE],
      tableWasReplaced,
      endpoint: STATBANK_DATA_URL,
      format: DEFAULT_FORMAT,
    },
    latestTime,
    dataFreshness: {
      mode: requested.allowHistorical ? "historical_override" : "latest_official_period_only",
      usesLatestOfficialPeriodByDefault: !requested.allowHistorical,
      historicalOverrideEnabled: requested.allowHistorical,
      requestedTimeSelection: requested.Variable.Tid,
      latestOfficialPeriod: latestTime,
      message: buildDataFreshnessMessage(requested.locale, latestTime?.label ?? null, requested.allowHistorical),
    },
    official: {
      regionTotalJobPostings: regionTotal?.jobCount ?? null,
      branchBreakdown: branchRows,
    },
    municipalityEstimate: {
      basis: "National branch mix from LSK01 scaled to the current municipality demo weight.",
      demoTotalWeight,
      totalEstimatedJobCount,
      topIndustries,
      industryBreakdown,
    },
    requestedExtract: requested,
    fetchedAt: new Date().toISOString(),
  };
}