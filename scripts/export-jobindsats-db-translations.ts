import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { disconnectPrismaScriptClient, prisma } from "./prisma-script-client";

function escapeCsv(value: string | null) {
  const normalized = value ?? "";
  return `"${normalized.replaceAll('"', '""')}"`;
}

async function main() {
  const rows = await prisma.jobindsatsTitleTranslation.findMany({
    orderBy: { daKey: "asc" },
  });

  const header = ["da_key", "en", "uk", "ar", "fa", "ur", "pl", "de"];
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        escapeCsv(row.daKey),
        escapeCsv(row.en),
        escapeCsv(row.uk),
        escapeCsv(row.ar),
        escapeCsv(row.fa),
        escapeCsv(row.ur),
        escapeCsv(row.pl),
        escapeCsv(row.de),
      ].join(","),
    ),
  ];

  const targetDir = path.join(process.cwd(), "docs", "generated");
  const targetPath = path.join(targetDir, "jobindsats-title-translations-db-export.csv");

  await mkdir(targetDir, { recursive: true });
  await writeFile(targetPath, `${lines.join("\n")}\n`, "utf8");

  console.log(`Exported ${rows.length} DB translation rows to ${targetPath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectPrismaScriptClient();
  });
