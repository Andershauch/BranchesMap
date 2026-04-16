import path from "node:path";

import {
  normalizeCsvRow,
  readCsvRows,
  writeCsvRows,
} from "./jobindsats-title-csv-utils";

function main() {
  const csvPath = path.join(process.cwd(), "data", "jobindsats-titles.csv");
  const rows = readCsvRows(csvPath).map(normalizeCsvRow);

  rows.sort((left, right) => left.da_key.localeCompare(right.da_key, "da"));
  writeCsvRows(csvPath, rows);

  console.log(`Normalized Jobindsats translation CSV at ${csvPath}`);
}

main();
