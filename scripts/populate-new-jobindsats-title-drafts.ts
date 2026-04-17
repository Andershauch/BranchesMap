import "dotenv/config";

import { enJobindsatsTitleTranslations } from "../lib/i18n/generated/jobindsats-title-translations";
import { disconnectPrismaScriptClient, prisma } from "./prisma-script-client";

const locales = ["en", "uk", "ar", "fa", "ur", "pl", "de"] as const;
type SupportedLocale = (typeof locales)[number];

const masterKeySet = new Set(Object.keys(enJobindsatsTitleTranslations));

function parseOverwriteArg() {
  return process.argv.includes("--overwrite");
}

async function translateText(text: string, sourceLocale: string, targetLocale: string) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const q = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLocale}&tl=${targetLocale}&dt=t&q=${q}`;
    const response = await fetch(url);

    if (response.ok) {
      const payload = (await response.json()) as unknown[];
      const segments = Array.isArray(payload[0]) ? (payload[0] as unknown[]) : [];
      const translated = segments
        .map((segment) => (Array.isArray(segment) ? segment[0] : ""))
        .filter((part): part is string => typeof part === "string")
        .join("")
        .trim();

      if (translated) {
        return translated;
      }
    }

    if (attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
      continue;
    }

    throw new Error(`Translation request failed for ${sourceLocale}->${targetLocale} after ${attempt} attempts`);
  }

  throw new Error(`Unreachable translation state for ${sourceLocale}->${targetLocale}`);
}

async function main() {
  const overwrite = parseOverwriteArg();
  const rows = await prisma.jobindsatsTitleTranslation.findMany({
    orderBy: { daKey: "asc" },
  });

  const newRows = rows.filter((row) => !masterKeySet.has(row.daKey));
  let updatedRows = 0;

  for (const row of newRows) {
    const nextValues: Partial<Record<SupportedLocale, string>> = {};
    const sourceEnglish = overwrite || !row.en?.trim()
      ? await translateText(row.daKey, "da", "en")
      : row.en;

    if (overwrite || !row.en?.trim()) {
      nextValues.en = sourceEnglish;
    }

    for (const locale of locales) {
      if (locale === "en") {
        continue;
      }

      const existing = row[locale];
      if (!overwrite && typeof existing === "string" && existing.trim()) {
        continue;
      }

      nextValues[locale] = await translateText(sourceEnglish, "en", locale);
    }

    if (Object.keys(nextValues).length === 0) {
      continue;
    }

    await prisma.jobindsatsTitleTranslation.update({
      where: { daKey: row.daKey },
      data: nextValues,
    });

    updatedRows += 1;

    if (updatedRows % 10 === 0) {
      console.log(`Updated ${updatedRows}/${newRows.length} new title rows`);
    }
  }

  console.log(`Completed. Updated ${updatedRows} new title rows.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrismaScriptClient();
  });
