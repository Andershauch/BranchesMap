import "dotenv/config";

import { enJobindsatsTitleTranslations } from "../lib/i18n/generated/jobindsats-title-translations";
import { disconnectPrismaScriptClient, prisma } from "./prisma-script-client";

const locales = ["en", "uk", "ar", "fa", "ur", "pl", "de"] as const;

async function main() {
  const master = new Set(Object.keys(enJobindsatsTitleTranslations));
  const rows = await prisma.jobindsatsTitleTranslation.findMany();
  const newRows = rows.filter((row) => !master.has(row.daKey));

  console.log(`New rows: ${newRows.length}`);

  for (const locale of locales) {
    const missing = newRows.filter((row) => !(typeof row[locale] === "string" && row[locale]?.trim())).length;
    console.log(`${locale}: missing ${missing}/${newRows.length}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrismaScriptClient();
  });
