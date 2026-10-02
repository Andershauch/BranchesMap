import "server-only";

const JOBINDSATS_API_BASE_URL = "https://api.jobindsats.dk/v3";
const REQUEST_TIMEOUT_MS = 15000;

export type JobindsatsSubject = { subject_id: string | number; subject_name: string };
export type JobindsatsSubjectGroup = { subject_group_id: string | number; subject_group_name: string; subjects: JobindsatsSubject[] };

export type JobindsatsMeasurement = { mgroup_id: string; mgroup_name: string; measures?: Array<{ measure_id: string; measure_name: string }> };

export type JobindsatsDimensionSummary = { dimension_id: string; dimension_name: string; hierarchies?: Array<{ hierarchy_id: string; hierarchy_name: string }> };
type JobindsatsPeriodSummary = {
  periodtype_id: string;
  periodtype_name?: string;
  values?: Array<{ period_id: string; period_name?: string }>;
  period_first?: string;
  period_last?: string;
};

export type JobindsatsTableSummary = {
  table_id: string;
  table_name: string;
  subject_id?: string | number;
  subject_name?: string;
  update_frequency?: string;
  latest_update?: string;
  next_update?: string;
  mgroups?: JobindsatsMeasurement[];
  periods?: JobindsatsPeriodSummary[] | { period_first_date?: string; period_last_date?: string; periodtypes?: JobindsatsPeriodSummary[] };
  dimensions?: JobindsatsDimensionSummary[];
};

type JobindsatsTableGroup = {
  subject_id: string | number;
  subject_name: string;
  table_groups: Array<{ table_group_id: string | number; table_group_name: string; tables: JobindsatsTableSummary[] }>;
};

export type JobindsatsTableDimension = {
  dimension_id: string;
  dimension_name: string;
  hierarchies?: Array<{ hierarchy_id: string; hierarchy_name: string; levels?: Array<{ level_id: string; level_name: string; values?: Array<{ value_id: string; value_name: string }> }> }>;
};

export type JobindsatsTableDetail = {
  table_id: string;
  table_name: string;
  subject_id?: string | number;
  subject_name?: string;
  periods?: JobindsatsTableSummary["periods"];
  mgroups?: JobindsatsMeasurement[];
  dimensions?: JobindsatsTableDimension[];
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
        Authorization: `Bearer ${token}`,
        accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Jobindsats request failed (${response.status} ${response.statusText}).`,
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
  const normalized = tableId.trim().toLowerCase();
  if (!/^[a-z0-9_-]{1,40}$/.test(normalized)) {
    throw new Error("Invalid Jobindsats table id.");
  }
  return normalized;
}

export async function getJobindsatsSubjects() {
  return fetchJobindsats<JobindsatsSubjectGroup[]>("/subjects", new URLSearchParams({ format: "json" }));
}

export async function getJobindsatsTables(subjectIds?: string[]) {
  const params = new URLSearchParams();

  if (subjectIds && subjectIds.length > 0) {
    params.set("subject_id", subjectIds.join(","));
  }
  params.set("format", "json");

  return fetchJobindsats<JobindsatsTableGroup[]>("/tables", params);
}

export async function getJobindsatsTable(tableId: string) {
  return fetchJobindsats<JobindsatsTableDetail>(`/table/${normalizeJobindsatsTableId(tableId)}`, new URLSearchParams({ format: "json" }));
}

function scoreTable(table: JobindsatsTableSummary) {
  const haystacks = [
    table.table_name,
    table.subject_name ?? "",
    ...(table.mgroups ?? []).flatMap((measurement) => [measurement.mgroup_name, ...(measurement.measures ?? []).map((item) => item.measure_name)]),
    ...(table.dimensions ?? []).flatMap((dimension) => [dimension.dimension_name, ...(dimension.hierarchies ?? []).map((item) => item.hierarchy_name)]),
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

  const hierarchies = (table.dimensions ?? []).flatMap((dimension) => dimension.hierarchies ?? []);
  if (hierarchies.some((item) => item.hierarchy_name.toLowerCase().includes("kommune"))) {
    score += 3;
    reasons.push("supports kommune area hierarchy");
  }

  if ((table.dimensions ?? []).some((item) => item.dimension_name.toLowerCase().includes("branche"))) {
    score += 3;
    reasons.push("has branche dimension");
  }

  const periodTypes = Array.isArray(table.periods) ? table.periods : table.periods?.periodtypes ?? [];

  return {
    tableId: table.table_id,
    tableName: table.table_name,
    subjectName: table.subject_name ?? "",
    score,
    reasons,
    dimensions: (table.dimensions ?? []).flatMap((dimension) => (dimension.hierarchies ?? []).map((hierarchy) => `${hierarchy.hierarchy_id}:${hierarchy.hierarchy_name}`)),
    areaHierarchy: (table.dimensions ?? []).flatMap((dimension) => dimension.hierarchies ?? []).map((hierarchy) => hierarchy.hierarchy_name),
    latestPeriod: periodTypes.find((period) => period.periodtype_id === "M")?.period_last
      ?? periodTypes.find((period) => period.periodtype_id === "M")?.values?.[0]?.period_id,
  } satisfies JobindsatsRelevantTable;
}

export async function findRelevantJobindsatsTables({ limit = 25 }: { limit?: number } = {}) {
  const groups = await getJobindsatsTables();
  const tables = groups.flatMap((group) =>
    (group.table_groups ?? []).flatMap((tableGroup) =>
      (tableGroup.tables ?? []).map((table) => ({ ...table, subject_name: table.subject_name ?? group.subject_name })),
    ),
  );

  return tables
    .map(scoreTable)
    .filter((table) => table.score > 0)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      return left.tableName.localeCompare(right.tableName, "da");
    })
    .slice(0, Math.min(100, Math.max(1, limit)));
}
