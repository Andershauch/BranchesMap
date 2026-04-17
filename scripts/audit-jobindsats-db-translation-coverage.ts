import { enJobindsatsTitleTranslations } from "../lib/i18n/generated/jobindsats-title-translations";
import { disconnectPrismaScriptClient, prisma } from "./prisma-script-client";

const locales = ["en", "uk", "ar", "fa", "ur", "pl", "de"] as const;

async function main() {
  const masterKeys = Object.keys(enJobindsatsTitleTranslations);
  const rows = await prisma.jobindsatsTitleTranslation.findMany({
    orderBy: { daKey: "asc" },
  });

  const rowMap = new Map(rows.map((row) => [row.daKey, row]));
  const missingRows = masterKeys.filter((key) => !rowMap.has(key));

  console.log(`Master keys: ${masterKeys.length}`);
  console.log(`DB rows: ${rows.length}`);
  console.log(`Missing rows: ${missingRows.length}`);

  if (missingRows.length > 0) {
    console.log("");
    console.log("Missing DB rows:");
    for (const key of missingRows) {
      console.log(`- ${key}`);
    }
  }

  for (const locale of locales) {
    const filled = masterKeys.filter((key) => {
      const row = rowMap.get(key);
      const value = row?.[locale];
      return typeof value === "string" && value.trim().length > 0;
    }).length;

    console.log("");
    console.log(`Locale: ${locale}`);
    console.log(`Filled: ${filled}/${masterKeys.length}`);
    console.log(`Missing: ${masterKeys.length - filled}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectPrismaScriptClient();
  });
