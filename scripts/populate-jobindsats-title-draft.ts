import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const supportedLocales = ["uk", "ur", "pl", "de"] as const;
type SupportedLocale = (typeof supportedLocales)[number];

function parseLocaleArg(): SupportedLocale {
  const localeArg = process.argv.find((arg) => arg.startsWith("--locale="))?.split("=")[1];

  if (!localeArg || !supportedLocales.includes(localeArg as SupportedLocale)) {
    throw new Error(`Missing or invalid --locale. Supported values: ${supportedLocales.join(", ")}`);
  }

  return localeArg as SupportedLocale;
}

function parseOverwriteArg() {
  return process.argv.includes("--overwrite");
}

const locale = parseLocaleArg();
const overwrite = parseOverwriteArg();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const pool = new pg.Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function translateText(text: string, targetLocale: SupportedLocale) {
  const q = encodeURIComponent(text);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLocale}&dt=t&q=${q}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Translation request failed for ${targetLocale}: ${response.status}`);
  }

  const payload = (await response.json()) as unknown[];
  const segments = Array.isArray(payload[0]) ? (payload[0] as unknown[]) : [];
  const translated = segments
    .map((segment) => (Array.isArray(segment) ? segment[0] : ""))
    .filter((part): part is string => typeof part === "string")
    .join("")
    .trim();

  if (!translated) {
    throw new Error(`Empty translation received for "${text}" (${targetLocale})`);
  }

  return translated;
}

async function main() {
  const rows = await prisma.jobindsatsTitleTranslation.findMany({
    orderBy: { daKey: "asc" },
    select: { daKey: true, en: true, [locale]: true },
  });

  let updated = 0;

  for (const row of rows) {
    const existing = (row as unknown as Record<string, string | null>)[locale];

    if (!overwrite && typeof existing === "string" && existing.trim()) {
      continue;
    }

    const translated = await translateText(row.en, locale);

    await prisma.jobindsatsTitleTranslation.update({
      where: { daKey: row.daKey },
      data: {
        [locale]: translated,
      },
    });

    updated += 1;

    if (updated % 25 === 0) {
      console.log(`[${locale}] updated ${updated}/${rows.length}`);
    }
  }

  console.log(`[${locale}] completed. Updated ${updated} rows.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
