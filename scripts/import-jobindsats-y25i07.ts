import "dotenv/config";

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

import {
  JOBINDSATS_OPEN_POSITIONS_TABLE,
  JOBINDSATS_SOURCE,
  getLatestMonthlyJobindsatsPeriod,
  normalizeJobindsatsText,
} from "../lib/server/jobindsats-imports";
import {
  mapJobindsatsTitleToIndustryCode,
  type ProductIndustryCode,
} from "../lib/server/jobindsats-category-mapping";

const IMPORT_OUTPUT_DIR = path.join(process.cwd(), "_tmp_jobindsats", "imports", JOBINDSATS_OPEN_POSITIONS_TABLE.toLowerCase());
const DISCOVERY_SCRIPT_PATH = path.join(process.cwd(), "scripts", "jobindsats-discovery.ps1");
const DEFAULT_TOP_TITLE_LIMIT = 10;

type MunicipalityScopeRow = {
  id: string;
  code: string;
  slug: string;
  name: string;
  isActive: boolean;
};

type JobindsatsTableDetail = {
  Period?: string[];
};

type JobindsatsDataResponse = {
  Data?: Array<{ value?: string[] } | string[]>;
};

type JobindsatsRawRow = { value?: string[] } | string[];

type ParsedDataRow = {
  area: string;
  period: string;
  titleLabel: string | null;
  totalOpenPositions: number;
  dailyAverageOpenPositions: number;
  newlyPostedPositions: number;
};

type MunicipalityImportPayload = {
  municipalityId: string;
  municipalitySlug: string;
  municipalityName: string;
  period: string;
  totalOpenPositions: number;
  dailyAverageOpenPositions: number;
  newlyPostedPositions: number;
  topTitles: Array<{
    rank: number;
    titleKey: string;
    titleLabel: string;
    openPositions: number;
  }>;
  categoryCounts: Array<{
    industryId: string;
    rank: number;
    openPositions: number;
  }>;
};

function parseArgs() {
  const args = process.argv.slice(2);

  let periodArg: string | null = null;
  let topTitleLimit = DEFAULT_TOP_TITLE_LIMIT;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--period") {
      periodArg = args[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === "--top-titles") {
      const value = Number.parseInt(args[index + 1] ?? "", 10);
      if (Number.isFinite(value) && value > 0) {
        topTitleLimit = value;
      }
      index += 1;
    }
  }

  return {
    periodArg,
    topTitleLimit,
  };
}

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

function runDiscoveryCommand(args: string[]) {
  const result = spawnSync(
    "powershell",
    ["-ExecutionPolicy", "Bypass", "-File", DISCOVERY_SCRIPT_PATH, ...args],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
    },
  );

  if (result.status !== 0) {
    throw new Error(
      [
        `Jobindsats discovery command failed: powershell ${args.join(" ")}`,
        result.stdout?.trim(),
        result.stderr?.trim(),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
}

function readJsonFile<T>(filePath: string): T {
  if (!existsSync(filePath)) {
    throw new Error(`Expected import artifact not found: ${filePath}`);
  }

  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function createTitleKey(label: string) {
  return createHash("sha1").update(label).digest("hex").slice(0, 16);
}

function parseInteger(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return 0;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getRowValues(row: JobindsatsRawRow) {
  if (Array.isArray(row)) {
    return row;
  }

  if (Array.isArray(row?.value)) {
    return row.value;
  }

  return [];
}

function parseDataRows(response: JobindsatsDataResponse): ParsedDataRow[] {
  return (response.Data ?? [])
    .map(getRowValues)
    .filter((row) => row.length >= 5)
    .map((row) => ({
      area: normalizeJobindsatsText(row[0] ?? ""),
      period: normalizeJobindsatsText(row[1] ?? ""),
      titleLabel: row.length >= 6 ? normalizeJobindsatsText(row[2] ?? "") : null,
      totalOpenPositions: parseInteger(row[row.length >= 6 ? 3 : 2]),
      dailyAverageOpenPositions: parseInteger(row[row.length >= 6 ? 4 : 3]),
      newlyPostedPositions: parseInteger(row[row.length >= 6 ? 5 : 4]),
    }));
}

async function getMunicipalityScope(prisma: PrismaClient) {
  return prisma.municipality.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      code: true,
      slug: true,
      name: true,
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
  }) as Promise<MunicipalityScopeRow[]>;
}

async function getIndustryMap(prisma: PrismaClient) {
  const industries = await prisma.industry.findMany({
    where: {
      code: {
        in: ["health", "tech", "build", "logistics", "education", "tourism", "food"],
      },
    },
    select: {
      id: true,
      code: true,
    },
  });

  return new Map(industries.map((industry) => [industry.code, industry.id]));
}

function resolveLatestPeriod(periodArg: string | null) {
  const metadataOutputName = `table-${JOBINDSATS_OPEN_POSITIONS_TABLE.toLowerCase()}-import`;

  runDiscoveryCommand([
    "-Mode",
    "table",
    "-TableId",
    JOBINDSATS_OPEN_POSITIONS_TABLE,
    "-OutputDir",
    IMPORT_OUTPUT_DIR,
    "-OutputName",
    metadataOutputName,
  ]);

  const metadataPath = path.join(IMPORT_OUTPUT_DIR, `${metadataOutputName}.json`);
  const metadata = readJsonFile<JobindsatsTableDetail>(metadataPath);

  if (periodArg) {
    return periodArg;
  }

  const latestPeriod = getLatestMonthlyJobindsatsPeriod(metadata.Period ?? []);

  if (!latestPeriod) {
    throw new Error(`Could not resolve latest monthly period from ${JOBINDSATS_OPEN_POSITIONS_TABLE}.`);
  }

  return latestPeriod;
}

function fetchMunicipalityTotals(period: string, municipality: MunicipalityScopeRow) {
  const outputName = `total-${municipality.slug}`;

  runDiscoveryCommand([
    "-Mode",
    "data",
    "-TableId",
    JOBINDSATS_OPEN_POSITIONS_TABLE,
    "-Period",
    period,
    "-Area",
    municipality.name,
    "-Esco",
    "Stillingsbetegnelse i alt",
    "-OutputDir",
    IMPORT_OUTPUT_DIR,
    "-OutputName",
    outputName,
  ]);

  return readJsonFile<JobindsatsDataResponse>(path.join(IMPORT_OUTPUT_DIR, `${outputName}.json`));
}

function fetchMunicipalityTitles(period: string, municipality: MunicipalityScopeRow) {
  const outputName = `titles-${municipality.slug}`;

  runDiscoveryCommand([
    "-Mode",
    "data",
    "-TableId",
    JOBINDSATS_OPEN_POSITIONS_TABLE,
    "-Period",
    period,
    "-Area",
    municipality.name,
    "-Esco",
    "*",
    "-OutputDir",
    IMPORT_OUTPUT_DIR,
    "-OutputName",
    outputName,
  ]);

  return readJsonFile<JobindsatsDataResponse>(path.join(IMPORT_OUTPUT_DIR, `${outputName}.json`));
}

function buildMunicipalityPayload(
  municipality: MunicipalityScopeRow,
  period: string,
  totalResponse: JobindsatsDataResponse,
  titleResponse: JobindsatsDataResponse,
  topTitleLimit: number,
  industryMap: Map<string, string>,
): MunicipalityImportPayload {
  const totalRows = parseDataRows(totalResponse);
  const totalRow = totalRows.find((row) => row.area === municipality.name && row.period === period);

  if (!totalRow) {
    throw new Error(`No total row found for ${municipality.name} (${period}).`);
  }

  const titleRows = parseDataRows(titleResponse)
    .filter((row) => row.area === municipality.name && row.period === period)
    .filter((row) => row.titleLabel && row.titleLabel !== "Stillingsbetegnelse i alt")
    .filter((row) => row.totalOpenPositions > 0)
    .sort((left, right) => {
      if (left.totalOpenPositions !== right.totalOpenPositions) {
        return right.totalOpenPositions - left.totalOpenPositions;
      }

      return (left.titleLabel ?? "").localeCompare(right.titleLabel ?? "", "da");
    })
    .slice(0, topTitleLimit)
    .map((row, index) => ({
      rank: index + 1,
      titleKey: createTitleKey(row.titleLabel ?? ""),
      titleLabel: row.titleLabel ?? "",
      openPositions: row.totalOpenPositions,
    }));

  const categoryTotals = new Map<ProductIndustryCode, number>();

  for (const row of parseDataRows(titleResponse)) {
    if (row.area !== municipality.name || row.period !== period || !row.titleLabel) {
      continue;
    }

    if (row.titleLabel === "Stillingsbetegnelse i alt" || row.totalOpenPositions <= 0) {
      continue;
    }

    const industryCode = mapJobindsatsTitleToIndustryCode(row.titleLabel);

    if (!industryCode) {
      continue;
    }

    categoryTotals.set(industryCode, (categoryTotals.get(industryCode) ?? 0) + row.totalOpenPositions);
  }

  const categoryCounts = [...categoryTotals.entries()]
    .map(([industryCode, openPositions]) => ({
      industryCode,
      industryId: industryMap.get(industryCode) ?? null,
      openPositions,
    }))
    .filter((entry): entry is { industryCode: ProductIndustryCode; industryId: string; openPositions: number } => Boolean(entry.industryId))
    .sort((left, right) => {
      if (left.openPositions !== right.openPositions) {
        return right.openPositions - left.openPositions;
      }

      return left.industryCode.localeCompare(right.industryCode, "en");
    })
    .slice(0, 10)
    .map((entry, index) => ({
      industryId: entry.industryId,
      rank: index + 1,
      openPositions: entry.openPositions,
    }));

  return {
    municipalityId: municipality.id,
    municipalitySlug: municipality.slug,
    municipalityName: municipality.name,
    period,
    totalOpenPositions: totalRow.totalOpenPositions,
    dailyAverageOpenPositions: totalRow.dailyAverageOpenPositions,
    newlyPostedPositions: totalRow.newlyPostedPositions,
    topTitles: titleRows,
    categoryCounts,
  };
}

async function persistImport(
  prisma: PrismaClient,
  period: string,
  payloads: MunicipalityImportPayload[],
) {
  const run = await prisma.importRun.create({
    data: {
      source: JOBINDSATS_SOURCE,
      sourceTable: JOBINDSATS_OPEN_POSITIONS_TABLE,
      status: "running",
      period,
      metadata: {
        municipalityCount: payloads.length,
      },
    },
  });

  try {
    for (const payload of payloads) {
      await prisma.municipalityJobSourceSnapshot.upsert({
        where: {
          municipalityId_source_sourceTable_period: {
            municipalityId: payload.municipalityId,
            source: JOBINDSATS_SOURCE,
            sourceTable: JOBINDSATS_OPEN_POSITIONS_TABLE,
            period: payload.period,
          },
        },
        update: {
          importRunId: run.id,
          totalOpenPositions: payload.totalOpenPositions,
          dailyAverageOpenPositions: payload.dailyAverageOpenPositions,
          newlyPostedPositions: payload.newlyPostedPositions,
          fetchedAt: new Date(),
          topTitles: {
            deleteMany: {},
            createMany: {
              data: payload.topTitles.map((title) => ({
                rank: title.rank,
                titleKey: title.titleKey,
                titleLabel: title.titleLabel,
                openPositions: title.openPositions,
              })),
            },
          },
          categories: {
            deleteMany: {},
            createMany: {
              data: payload.categoryCounts.map((entry) => ({
                industryId: entry.industryId,
                rank: entry.rank,
                openPositions: entry.openPositions,
              })),
            },
          },
        },
        create: {
          municipalityId: payload.municipalityId,
          importRunId: run.id,
          source: JOBINDSATS_SOURCE,
          sourceTable: JOBINDSATS_OPEN_POSITIONS_TABLE,
          period: payload.period,
          totalOpenPositions: payload.totalOpenPositions,
          dailyAverageOpenPositions: payload.dailyAverageOpenPositions,
          newlyPostedPositions: payload.newlyPostedPositions,
          fetchedAt: new Date(),
          topTitles: {
            createMany: {
              data: payload.topTitles.map((title) => ({
                rank: title.rank,
                titleKey: title.titleKey,
                titleLabel: title.titleLabel,
                openPositions: title.openPositions,
              })),
            },
          },
          categories: {
            createMany: {
              data: payload.categoryCounts.map((entry) => ({
                industryId: entry.industryId,
                rank: entry.rank,
                openPositions: entry.openPositions,
              })),
            },
          },
        },
      });
    }

    await prisma.importRun.update({
      where: { id: run.id },
      data: {
        status: "completed",
        finishedAt: new Date(),
        metadata: {
          municipalityCount: payloads.length,
          importedSlugs: payloads.map((payload) => payload.municipalitySlug),
        },
      },
    });
  } catch (error) {
    await prisma.importRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown import error.",
      },
    });

    throw error;
  }
}

async function main() {
  const { prisma, pool } = createPrismaClient();

  try {
    const { periodArg, topTitleLimit } = parseArgs();
    const municipalities = await getMunicipalityScope(prisma);
    const industryMap = await getIndustryMap(prisma);

    if (municipalities.length === 0) {
      throw new Error("No active municipalities found. Seed the database before importing Jobindsats data.");
    }

    const period = resolveLatestPeriod(periodArg);
    const payloads: MunicipalityImportPayload[] = [];

    for (const municipality of municipalities) {
      console.log(`Importing ${municipality.name} for ${period}...`);

      const totalResponse = fetchMunicipalityTotals(period, municipality);
      const titleResponse = fetchMunicipalityTitles(period, municipality);

      payloads.push(
        buildMunicipalityPayload(municipality, period, totalResponse, titleResponse, topTitleLimit, industryMap),
      );
    }

    await persistImport(prisma, period, payloads);

    console.log(
      `Jobindsats import completed for ${payloads.length} municipalities (${JOBINDSATS_OPEN_POSITIONS_TABLE}, ${period}).`,
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
