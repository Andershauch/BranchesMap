import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

import { enJobindsatsTitleTranslations } from "../lib/i18n/generated/jobindsats-title-translations";
import { normalizeJobindsatsRepresentativeTitle } from "../lib/server/jobindsats-category-mapping";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  return { prisma, pool };
}

function normalizeTitle(title: string) {
  return normalizeJobindsatsRepresentativeTitle(title).trim();
}

function buildEnglishSeedMap() {
  return new Map(
    Object.entries(enJobindsatsTitleTranslations).map(([daKey, en]) => [normalizeTitle(daKey), en] as const),
  );
}

async function main() {
  const { prisma, pool } = createPrismaClient();

  try {
    const englishSeedMap = buildEnglishSeedMap();
    const snapshotTitles = await prisma.municipalityJobSourceTopTitle.findMany({
      select: {
        titleLabel: true,
      },
      distinct: ["titleLabel"],
      orderBy: { titleLabel: "asc" },
    });

    const normalizedTitles = [...new Set(snapshotTitles.map((row) => normalizeTitle(row.titleLabel)).filter(Boolean))];
    const existingRows = await prisma.jobindsatsTitleTranslation.findMany({
      select: { daKey: true },
    });
    const existingKeys = new Set(existingRows.map((row) => normalizeTitle(row.daKey)));

    const missingRows = normalizedTitles
      .filter((title) => !existingKeys.has(title))
      .map((title) => ({
        daKey: title,
        en: englishSeedMap.get(title) ?? title,
      }));

    if (missingRows.length > 0) {
      await prisma.jobindsatsTitleTranslation.createMany({
        data: missingRows,
        skipDuplicates: true,
      });
    }

    console.log(`Snapshot titles: ${normalizedTitles.length}`);
    console.log(`Existing DB rows: ${existingRows.length}`);
    console.log(`Created rows: ${missingRows.length}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
