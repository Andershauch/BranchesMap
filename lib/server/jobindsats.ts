import "server-only";

const JOBINDSATS_API_BASE_URL = "https://api.jobindsats.dk/v2";
const REQUEST_TIMEOUT_MS = 15000;

export type JobindsatsSubject = {
  SubjectID: string | number;
  SubjectName: string;
};

export type JobindsatsMeasurement = {
  ID: string;
  Name: string;
};

export type JobindsatsDimensionSummary = {
  ID: string;
  Name: string;
};

export type JobindsatsTableSummary = {
  TableID: string;
  TableName: string;
  SubjectID: string | number;
  SubjectName: string;
  UpdateFrequency?: string;
  LatestUpdate?: string;
  NextUpdate?: string;
  Measurements?: JobindsatsMeasurement[];
  PeriodCategory?: string[];
  AreaHierarchy?: string[];
  FirstPeriod?: string;
  LatestPeriod?: string;
  Dimensions?: JobindsatsDimensionSummary[];
};

export type JobindsatsTableDimension = {
  DimensionID: string;
  DimensionName: string;
  DefaultValue?: string;
  Values?: string[];
};

export type JobindsatsTableDetail = {
  TableID: string;
  TableName: string;
  SubjectID: string | number;
  SubjectName: string;
  Area?: string[];
  Period?: string[];
  Measurements?: JobindsatsMeasurement[];
  Dimensions?: JobindsatsTableDimension[];
};

export type JobindsatsRelevantTable = {
  tableId: string;
  tableName: string;
  subjectName: string;
  score: number;
  reasons: string[];
  dimensions: string[];
  areaHierarchy: string[];
  latestPeriod?: string;
};

function getApiToken() {
  return process.env.JOBINDSATS_API_TOKEN?.trim() || null;
}

export function isJobindsatsConfigured() {
  return Boolean(getApiToken());
}

async function fetchJobindsats<T>(path: string, searchParams?: URLSearchParams) {
  const token = getApiToken();

  if (!token) {
    throw new Error("JOBINDSATS_API_TOKEN is not configured.");
  }

  const url = new URL(`${JOBINDSATS_API_BASE_URL}${path}`);
  if (searchParams) {
    url.search = searchParams.toString();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: token,
        accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new Error(
        `Jobindsats request failed (${response.status} ${response.statusText})${details ? `: ${details}` : ""}`,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Jobindsats request timed out after ${REQUEST_TIMEOUT_MS}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function normalizeJobindsatsTableId(tableId: string) {
  return tableId.trim().toUpperCase();
}

export async function getJobindsatsSubjects() {
  return fetchJobindsats<JobindsatsSubject[]>("/subjects/");
}

export async function getJobindsatsTables(subjectIds?: string[]) {
  const params = new URLSearchParams();

  if (subjectIds && subjectIds.length > 0) {
    params.set("subjectid", subjectIds.join(","));
  }

  return fetchJobindsats<JobindsatsTableSummary[]>("/tables/", params);
}

export async function getJobindsatsTable(tableId: string) {
  return fetchJobindsats<JobindsatsTableDetail>(`/tables/${normalizeJobindsatsTableId(tableId)}/`);
}

function scoreTable(table: JobindsatsTableSummary) {
  const haystacks = [
    table.TableName,
    table.SubjectName,
    ...(table.Measurements ?? []).map((measurement) => measurement.Name),
    ...(table.Dimensions ?? []).map((dimension) => dimension.Name),
    ...(table.AreaHierarchy ?? []),
  ].map((value) => value.toLowerCase());

  const reasons: string[] = [];
  let score = 0;

  const rules: Array<[string, number, string]> = [
    ["job", 4, "contains 'job'"],
    ["stilling", 4, "contains 'stilling'"],
    ["virksom", 2, "contains 'virksom'"],
    ["arbejdssted", 3, "contains 'arbejdssted'"],
    ["kommune", 4, "contains 'kommune'"],
    ["branch", 3, "contains 'branch'"],
    ["sektor", 2, "contains 'sektor'"],
    ["rekruttering", 2, "contains 'rekruttering'"],
    ["forgæves", 1, "contains 'forgæves'"],
  ];

  for (const [needle, value, reason] of rules) {
    if (haystacks.some((item) => item.includes(needle))) {
      score += value;
      reasons.push(reason);
    }
  }

  if ((table.AreaHierarchy ?? []).some((item) => item.toLowerCase().includes("kommune"))) {
    score += 3;
    reasons.push("supports kommune area hierarchy");
  }

  if ((table.Dimensions ?? []).some((item) => item.Name.toLowerCase().includes("branche"))) {
    score += 3;
    reasons.push("has branche dimension");
  }

  return {
    tableId: table.TableID,
    tableName: table.TableName,
    subjectName: table.SubjectName,
    score,
    reasons,
    dimensions: (table.Dimensions ?? []).map((dimension) => `${dimension.ID}:${dimension.Name}`),
    areaHierarchy: table.AreaHierarchy ?? [],
    latestPeriod: table.LatestPeriod,
  } satisfies JobindsatsRelevantTable;
}

export async function findRelevantJobindsatsTables({ limit = 25 }: { limit?: number } = {}) {
  const tables = await getJobindsatsTables();

  return tables
    .map(scoreTable)
    .filter((table) => table.score > 0)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      return left.tableName.localeCompare(right.tableName, "da");
    })
    .slice(0, limit);
}
