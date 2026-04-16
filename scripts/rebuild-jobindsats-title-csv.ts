import { execFileSync } from "node:child_process";
import path from "node:path";
import vm from "node:vm";

import ts from "typescript";

import {
  jobindsatsTitleLocales,
  mergeDuplicateCsvRows,
  normalizeCsvRow,
  type JobindsatsCsvRow,
  writeCsvRows,
} from "./jobindsats-title-csv-utils";

const legacySourcePaths = {
  en: "lib/i18n/jobindsats-titles/en.ts",
  uk: "lib/i18n/jobindsats-titles/uk.ts",
  ar: "lib/i18n/jobindsats-titles/ar.ts",
  fa: "lib/i18n/jobindsats-titles/fa.ts",
  ur: "lib/i18n/jobindsats-titles/ur.ts",
  pl: "lib/i18n/jobindsats-titles/pl.ts",
  de: "lib/i18n/jobindsats-titles/de.ts",
} as const;

function readLegacyFileFromHead(filePath: string) {
  return execFileSync("git", ["show", `HEAD:${filePath}`], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

function loadLegacyTranslationMap(filePath: string) {
  const source = readLegacyFileFromHead(filePath);
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  const sandbox = {
    Buffer,
    exports: {},
    module: { exports: {} as Record<string, unknown> },
  };

  vm.runInNewContext(transpiled, sandbox, { filename: filePath });

  const exported =
    (sandbox.module.exports as { default?: unknown }).default ??
    (sandbox.exports as { default?: unknown }).default;

  if (!exported || typeof exported !== "object" || Array.isArray(exported)) {
    throw new Error(`Could not load translation map from ${filePath}`);
  }

  return exported as Record<string, string>;
}

function buildRows() {
  const maps = Object.fromEntries(
    jobindsatsTitleLocales.map((locale) => [locale, loadLegacyTranslationMap(legacySourcePaths[locale])]),
  ) as Record<(typeof jobindsatsTitleLocales)[number], Record<string, string>>;

  const englishKeys = Object.keys(maps.en);
  const rows: JobindsatsCsvRow[] = englishKeys.map((daKey) =>
    normalizeCsvRow({
      da_key: daKey,
      en: maps.en[daKey] ?? "",
      uk: maps.uk[daKey] ?? "",
      ar: maps.ar[daKey] ?? "",
      fa: maps.fa[daKey] ?? "",
      ur: maps.ur[daKey] ?? "",
      pl: maps.pl[daKey] ?? "",
      de: maps.de[daKey] ?? "",
    }),
  );

  const mergedRows = mergeDuplicateCsvRows(rows);
  mergedRows.sort((left, right) => left.da_key.localeCompare(right.da_key, "da"));
  return mergedRows;
}

function main() {
  const outputPath = path.join(process.cwd(), "data", "jobindsats-titles.csv");
  const rows = buildRows();
  writeCsvRows(outputPath, rows);
  console.log(`Rebuilt readable Jobindsats CSV from HEAD into ${outputPath}`);
}

main();
