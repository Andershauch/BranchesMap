export const JOBINDSATS_SOURCE = "jobindsats";
export const JOBINDSATS_OPEN_POSITIONS_TABLE = "Y25i07";

export type MunicipalityTotalJobsSource =
  | "mock_or_db"
  | "mock_or_db_plus_live_estimate"
  | "jobindsats_y25i07_import";

export type MunicipalityTopIndustriesSource = "mock_or_db" | "mock_or_db_plus_live_estimate";

export const JOBINDSATS_MONTHLY_PERIOD_PATTERN = /^\d{4}M\d{2}$/;

export function compareJobindsatsPeriods(left: string, right: string) {
  return left.localeCompare(right, "en");
}

export function getLatestMonthlyJobindsatsPeriod(periods: string[]) {
  const monthlyPeriods = periods.filter((period) => JOBINDSATS_MONTHLY_PERIOD_PATTERN.test(period));

  if (monthlyPeriods.length === 0) {
    return null;
  }

  return [...monthlyPeriods].sort(compareJobindsatsPeriods).at(-1) ?? null;
}

export function repairJobindsatsText(value: string) {
  const repaired = Buffer.from(value, "latin1").toString("utf8");
  return repaired.includes("\uFFFD") ? value : repaired;
}

export function normalizeJobindsatsText(value: string) {
  return repairJobindsatsText(value).trim().replace(/\s+/g, " ");
}
