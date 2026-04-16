import "dotenv/config";

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

import {
  classifyJobindsatsTitle,
  type ProductIndustryCode,
} from "../lib/server/jobindsats-category-mapping";
import {
  JOBINDSATS_OPEN_POSITIONS_TABLE,
  JOBINDSATS_SOURCE,
  normalizeJobindsatsText,
} from "../lib/server/jobindsats-imports";

type AggregatedTitle = {
  titleLabel: string;
  normalizedTitle: string;
  industryCode: ProductIndustryCode | null;
  isGeneric: boolean;
  occurrences: number;
  municipalities: number;
  totalOpenPositions: number;
  avgOpenPositions: number;
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
  let take = 200;

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

function repairTitleForReport(value: string) {
  let current = value;

  for (let index = 0; index < 3; index += 1) {
    const repaired = normalizeJobindsatsText(current);
    if (repaired === current) {
      break;
    }
    current = repaired;
  }

  return current;
}

function toAsciiReportText(value: string) {
  return repairTitleForReport(value)
    .replace(/æ/g, "ae")
    .replace(/Æ/g, "Ae")
    .replace(/ø/g, "oe")
    .replace(/Ø/g, "Oe")
    .replace(/å/g, "aa")
    .replace(/Å/g, "Aa")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^ -~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function aggregateTitles(
  rows: Array<{ municipalityId: string; titleLabel: string; openPositions: number }>,
): AggregatedTitle[] {
  const grouped = new Map<
    string,
    {
      titleLabel: string;
      normalizedTitle: string;
      industryCode: ProductIndustryCode | null;
      isGeneric: boolean;
      occurrences: number;
      municipalityIds: Set<string>;
      totalOpenPositions: number;
    }
  >();

  for (const row of rows) {
    const repairedTitleLabel = repairTitleForReport(row.titleLabel);
    const reportTitleLabel = toAsciiReportText(row.titleLabel);
    const classification = classifyJobindsatsTitle(repairedTitleLabel);
    const key = classification.normalizedTitle || repairedTitleLabel;
    const existing = grouped.get(key) ?? {
      titleLabel: reportTitleLabel,
      normalizedTitle: toAsciiReportText(classification.normalizedTitle || repairedTitleLabel),
      industryCode: classification.industryCode,
      isGeneric: classification.isGeneric,
      occurrences: 0,
      municipalityIds: new Set<string>(),
      totalOpenPositions: 0,
    };

    existing.occurrences += 1;
    existing.municipalityIds.add(row.municipalityId);
    existing.totalOpenPositions += row.openPositions;
    grouped.set(key, existing);
  }

  return [...grouped.values()].map((entry) => ({
    titleLabel: entry.titleLabel,
    normalizedTitle: entry.normalizedTitle,
    industryCode: entry.industryCode,
    isGeneric: entry.isGeneric,
    occurrences: entry.occurrences,
    municipalities: entry.municipalityIds.size,
    totalOpenPositions: entry.totalOpenPositions,
    avgOpenPositions: Math.round(entry.totalOpenPositions / Math.max(1, entry.occurrences)),
  }));
}

function formatSection(title: string, items: AggregatedTitle[]) {
  const lines = [`## ${title}`, ""];

  if (items.length === 0) {
    lines.push("No rows found.", "");
    return lines.join("\n");
  }

  lines.push("| Title | Total open positions | Municipalities | Occurrences | Mapping |");
  lines.push("| --- | ---: | ---: | ---: | --- |");

  for (const item of items) {
    lines.push(
      `| ${item.normalizedTitle || item.titleLabel} | ${item.totalOpenPositions} | ${item.municipalities} | ${item.occurrences} | ${
        item.industryCode ?? "unmapped"
      } |`,
    );
  }

  lines.push("");
  return lines.join("\n");
}

async function main() {
  const { take } = parseArgs();
  const { prisma, pool } = createPrismaClient();

  try {
    const latestPeriods = await prisma.municipalityJobSourceSnapshot.findMany({
      where: {
        source: JOBINDSATS_SOURCE,
        sourceTable: JOBINDSATS_OPEN_POSITIONS_TABLE,
      },
      distinct: ["period"],
      select: {
        period: true,
      },
      orderBy: {
        period: "desc",
      },
      take: 3,
    });

    const periods = latestPeriods.map((entry) => entry.period);
    if (periods.length === 0) {
      throw new Error("No Jobindsats snapshots found.");
    }

    const rows = await prisma.municipalityJobSourceTopTitle.findMany({
      where: {
        snapshot: {
          source: JOBINDSATS_SOURCE,
          sourceTable: JOBINDSATS_OPEN_POSITIONS_TABLE,
          period: {
            in: periods,
          },
        },
      },
      select: {
        titleLabel: true,
        openPositions: true,
        snapshot: {
          select: {
            municipalityId: true,
          },
        },
      },
      orderBy: [{ openPositions: "desc" }, { titleLabel: "asc" }],
      take: 2000,
    });

    const aggregated = aggregateTitles(
      rows.map((row) => ({
        municipalityId: row.snapshot.municipalityId,
        titleLabel: row.titleLabel,
        openPositions: row.openPositions,
      })),
    ).sort((left, right) => {
      if (left.totalOpenPositions !== right.totalOpenPositions) {
        return right.totalOpenPositions - left.totalOpenPositions;
      }

      return left.normalizedTitle.localeCompare(right.normalizedTitle, "da");
    });

    const unmapped = aggregated.filter((item) => !item.industryCode).slice(0, take);
    const generic = aggregated.filter((item) => item.industryCode && item.isGeneric).slice(0, take);

    const output = [
      "# Jobindsats Title Quality Audit",
      "",
      `Date: ${new Date().toISOString()}`,
      "",
      `Periods scanned: ${periods.join(", ")}`,
      "",
      formatSection("Top Unmapped Titles", unmapped),
      formatSection("Top Generic Mapped Titles", generic),
    ].join("\n");

    const outputDir = path.join(process.cwd(), "docs", "generated");
    mkdirSync(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, "jobindsats-title-quality-audit.md");
    writeFileSync(outputPath, output, "utf8");

    console.log(`Wrote Jobindsats title quality audit to ${outputPath}`);
    console.log(`Unmapped titles: ${unmapped.length}`);
    console.log(`Generic mapped titles: ${generic.length}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
