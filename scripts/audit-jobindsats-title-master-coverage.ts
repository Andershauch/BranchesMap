import "dotenv/config";

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

import { enJobindsatsTitleTranslations } from "../lib/i18n/generated/jobindsats-title-translations";
import {
  classifyJobindsatsTitle,
  normalizeJobindsatsRepresentativeTitle,
  rankJobindsatsRepresentativeTitle,
  shouldHideRepresentativeTitleFromUi,
} from "../lib/server/jobindsats-category-mapping";
import { JOBINDSATS_OPEN_POSITIONS_TABLE, JOBINDSATS_SOURCE } from "../lib/server/jobindsats-imports";

type VisibleRepresentativeTitle = {
  title: string;
  municipalities: number;
  totalOpenPositions: number;
};

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

function parseArgs() {
  const args = process.argv.slice(2);
  let take = 100;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--take") {
      const parsed = Number.parseInt(args[index + 1] ?? "", 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        take = parsed;
      }
      index += 1;
    }
  }

  return { take };
}

function buildNormalizedEnglishMasterSet() {
  return new Set(
    Object.keys(enJobindsatsTitleTranslations)
      .map((title) => normalizeJobindsatsRepresentativeTitle(title))
      .filter(Boolean),
  );
}

function escapeCsvCell(value: string) {
  return `"${value.replace(/"/g, "\"\"")}"`;
}

async function main() {
  const { take } = parseArgs();
  const { prisma, pool } = createPrismaClient();

  try {
    const latestSnapshots = await prisma.municipalityJobSourceSnapshot.findMany({
      where: {
        source: JOBINDSATS_SOURCE,
        sourceTable: JOBINDSATS_OPEN_POSITIONS_TABLE,
      },
      orderBy: [{ municipalityId: "asc" }, { period: "desc" }],
      select: {
        municipalityId: true,
        period: true,
        topTitles: {
          select: {
            titleLabel: true,
            openPositions: true,
            rank: true,
          },
          orderBy: [{ rank: "asc" }, { openPositions: "desc" }],
        },
      },
      distinct: ["municipalityId"],
    });

    const englishMasterTitles = buildNormalizedEnglishMasterSet();
    const aggregated = new Map<
      string,
      {
        title: string;
        municipalityIds: Set<string>;
        totalOpenPositions: number;
      }
    >();

    for (const snapshot of latestSnapshots) {
      const chosenTitles = snapshot.topTitles
        .map((title) =>
          rankJobindsatsRepresentativeTitle({
            titleLabel: title.titleLabel,
            openPositions: title.openPositions,
            rank: title.rank,
          }),
        )
        .filter((title): title is NonNullable<typeof title> => Boolean(title))
        .filter((title) => !classifyJobindsatsTitle(title.normalizedTitle).isGeneric)
        .filter((title) => !shouldHideRepresentativeTitleFromUi(title.normalizedTitle))
        .slice(0, 12);

      for (const title of chosenTitles) {
        const canonicalTitle = normalizeJobindsatsRepresentativeTitle(title.normalizedTitle);

        if (!canonicalTitle) {
          continue;
        }

        if (englishMasterTitles.has(canonicalTitle)) {
          continue;
        }

        const existing = aggregated.get(canonicalTitle) ?? {
          title: canonicalTitle,
          municipalityIds: new Set<string>(),
          totalOpenPositions: 0,
        };

        existing.municipalityIds.add(snapshot.municipalityId);
        existing.totalOpenPositions += title.openPositions;
        aggregated.set(canonicalTitle, existing);
      }
    }

    const missingTitles: VisibleRepresentativeTitle[] = [...aggregated.values()]
      .map((entry) => ({
        title: entry.title,
        municipalities: entry.municipalityIds.size,
        totalOpenPositions: entry.totalOpenPositions,
      }))
      .sort((left, right) => {
        if (left.totalOpenPositions !== right.totalOpenPositions) {
          return right.totalOpenPositions - left.totalOpenPositions;
        }

        if (left.municipalities !== right.municipalities) {
          return right.municipalities - left.municipalities;
        }

        return left.title.localeCompare(right.title, "da");
      })
      .slice(0, take);

    console.log(`Latest municipality snapshots scanned: ${latestSnapshots.length}`);
    console.log(`English master keys: ${englishMasterTitles.size}`);
    console.log(`Visible representative titles missing in en.ts: ${missingTitles.length}`);
    console.log("");

    const outputPath = path.join(process.cwd(), "docs", "generated", "jobindsats-title-missing.csv");
    mkdirSync(path.dirname(outputPath), { recursive: true });
    const csvLines = [
      ["da_key", "totalOpenPositions", "municipalities"].map(escapeCsvCell).join(","),
      ...missingTitles.map((title) =>
        [title.title, String(title.totalOpenPositions), String(title.municipalities)]
          .map(escapeCsvCell)
          .join(","),
      ),
    ];
    writeFileSync(outputPath, `${csvLines.join("\n")}\n`, "utf8");

    for (const title of missingTitles) {
      console.log(
        `- ${title.title} | totalOpenPositions=${title.totalOpenPositions} | municipalities=${title.municipalities}`,
      );
    }

    console.log("");
    console.log(`Wrote missing-title CSV to ${outputPath}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
