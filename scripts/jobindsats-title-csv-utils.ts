import { readFileSync, writeFileSync } from "node:fs";

import { normalizeJobindsatsRepresentativeTitle } from "../lib/server/jobindsats-category-mapping";
import { normalizeJobindsatsText, repairJobindsatsText } from "../lib/server/jobindsats-imports";

export const jobindsatsTitleLocales = ["en", "uk", "ar", "fa", "ur", "pl", "de"] as const;
export type JobindsatsTitleLocale = (typeof jobindsatsTitleLocales)[number];

export type JobindsatsCsvRow = {
  da_key: string;
} & Record<JobindsatsTitleLocale, string>;

export function parseCsv(content: string) {
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let index = 0;
  let inQuotes = false;

  while (index < content.length) {
    const char = content[index];

    if (inQuotes) {
      if (char === '"') {
        if (content[index + 1] === '"') {
          currentCell += '"';
          index += 2;
          continue;
        }

        inQuotes = false;
        index += 1;
        continue;
      }

      currentCell += char;
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      index += 1;
      continue;
    }

    if (char === ",") {
      currentRow.push(currentCell);
      currentCell = "";
      index += 1;
      continue;
    }

    if (char === "\n") {
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentCell = "";
      currentRow = [];
      index += 1;
      continue;
    }

    if (char === "\r") {
      index += 1;
      continue;
    }

    currentCell += char;
    index += 1;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

export function parseCsvRows(content: string): JobindsatsCsvRow[] {
  const [headerRow, ...dataRows] = parseCsv(content);

  if (!headerRow) {
    throw new Error("CSV is empty.");
  }

  const expectedHeader = ["da_key", ...jobindsatsTitleLocales];
  if (headerRow.join("|") !== expectedHeader.join("|")) {
    throw new Error(`Invalid CSV header. Expected ${expectedHeader.join(",")}`);
  }

  return dataRows
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => {
      const record = Object.fromEntries(
        headerRow.map((column, index) => [column, row[index] ?? ""]),
      ) as JobindsatsCsvRow;

      if (!record.da_key.trim()) {
        throw new Error("CSV contains a row without da_key.");
      }

      return record;
    });
}

export function repairTextRecursively(value: string) {
  let current = value.trim();

  for (let index = 0; index < 4; index += 1) {
    const repaired = normalizeJobindsatsText(repairJobindsatsText(current));

    if (repaired === current) {
      break;
    }

    current = repaired;
  }

  return current;
}

function normalizeTranslationCell(value: string) {
  return value.trim();
}

export function normalizeCsvRow(row: JobindsatsCsvRow): JobindsatsCsvRow {
  return {
    da_key: normalizeJobindsatsRepresentativeTitle(row.da_key),
    en: normalizeTranslationCell(row.en),
    uk: normalizeTranslationCell(row.uk),
    ar: normalizeTranslationCell(row.ar),
    fa: normalizeTranslationCell(row.fa),
    ur: normalizeTranslationCell(row.ur),
    pl: normalizeTranslationCell(row.pl),
    de: normalizeTranslationCell(row.de),
  };
}

export function mergeDuplicateCsvRows(rows: JobindsatsCsvRow[]) {
  const merged = new Map<string, JobindsatsCsvRow>();

  for (const row of rows) {
    const existing = merged.get(row.da_key);

    if (!existing) {
      merged.set(row.da_key, { ...row });
      continue;
    }

    for (const locale of jobindsatsTitleLocales) {
      if (!existing[locale].trim() && row[locale].trim()) {
        existing[locale] = row[locale];
      }
    }
  }

  return [...merged.values()];
}

export function escapeCsvCell(value: string) {
  return `"${value.replace(/"/g, "\"\"")}"`;
}

export function writeCsvRows(filePath: string, rows: JobindsatsCsvRow[]) {
  const lines = [
    ["da_key", ...jobindsatsTitleLocales].map(escapeCsvCell).join(","),
    ...rows.map((row) =>
      [row.da_key, ...jobindsatsTitleLocales.map((locale) => row[locale])].map(escapeCsvCell).join(","),
    ),
  ];

  writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

export function readCsvRows(filePath: string) {
  return parseCsvRows(readFileSync(filePath, "utf8"));
}
