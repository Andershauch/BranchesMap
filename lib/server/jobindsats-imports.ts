export const JOBINDSATS_SOURCE = "jobindsats";
export const JOBINDSATS_OPEN_POSITIONS_TABLE = "Y25i07";

export type MunicipalityTotalJobsSource =
  | "mock_or_db"
  | "mock_or_db_plus_live_estimate"
  | "jobindsats_y25i07_import";

export type MunicipalityTopIndustriesSource = "mock_or_db" | "mock_or_db_plus_live_estimate";
export type MunicipalityImportedTopIndustriesSource = "jobindsats_y25i07_category_mapping";

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

const mojibakeRepairs = [
  [Buffer.from([0xc3, 0x86]).toString("latin1"), "\u00C6"],
  [Buffer.from([0xc3, 0x98]).toString("latin1"), "\u00D8"],
  [Buffer.from([0xc3, 0x85]).toString("latin1"), "\u00C5"],
  [Buffer.from([0xc3, 0xa6]).toString("latin1"), "\u00E6"],
  [Buffer.from([0xc3, 0xb8]).toString("latin1"), "\u00F8"],
  [Buffer.from([0xc3, 0xa5]).toString("latin1"), "\u00E5"],
  ["\u00C3\u02DC", "\u00D8"],
  ["\u00C3\u00A6", "\u00E6"],
  ["\u00C3\u00B8", "\u00F8"],
  ["\u00C3\u00A5", "\u00E5"],
] as const;

export function normalizeJobindsatsText(value: string) {
  const repaired = mojibakeRepairs.reduce(
    (current, [broken, fixed]) => current.replaceAll(broken, fixed),
    repairJobindsatsText(value),
  );

  return repaired.trim().replace(/\s+/g, " ");
}
