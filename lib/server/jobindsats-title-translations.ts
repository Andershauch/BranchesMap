import { unstable_cache as cache } from "next/cache";

import type { AppLocale } from "@/lib/i18n/config";
import {
  arJobindsatsTitleTranslations,
  deJobindsatsTitleTranslations,
  enJobindsatsTitleTranslations,
  faJobindsatsTitleTranslations,
  plJobindsatsTitleTranslations,
  ukJobindsatsTitleTranslations,
  urJobindsatsTitleTranslations,
} from "@/lib/i18n/generated/jobindsats-title-translations";
import { normalizeJobindsatsRepresentativeTitle } from "@/lib/server/jobindsats-category-mapping";
import { prisma } from "@/lib/server/prisma";

const seededTranslations = Object.entries(enJobindsatsTitleTranslations).map(([daKey, en]) => ({
  daKey,
  en,
  uk: (ukJobindsatsTitleTranslations as Partial<Record<string, string>>)[daKey] ?? null,
  ar: (arJobindsatsTitleTranslations as Partial<Record<string, string>>)[daKey] ?? null,
  fa: (faJobindsatsTitleTranslations as Partial<Record<string, string>>)[daKey] ?? null,
  ur: (urJobindsatsTitleTranslations as Partial<Record<string, string>>)[daKey] ?? null,
  pl: (plJobindsatsTitleTranslations as Partial<Record<string, string>>)[daKey] ?? null,
  de: (deJobindsatsTitleTranslations as Partial<Record<string, string>>)[daKey] ?? null,
}));

type JobindsatsTranslationRow = {
  daKey: string;
  en: string;
  uk: string | null;
  ar: string | null;
  fa: string | null;
  ur: string | null;
  pl: string | null;
  de: string | null;
};

type LocaleColumn = Exclude<AppLocale, "da">;

const localeColumns: LocaleColumn[] = ["en", "uk", "ar", "fa", "ur", "pl", "de"];

async function ensureSeeded() {
  await prisma.jobindsatsTitleTranslation.createMany({
    data: seededTranslations,
    skipDuplicates: true,
  });
}

const getCachedRows = cache(
  async () => {
    await ensureSeeded();
    return prisma.jobindsatsTitleTranslation.findMany({
      orderBy: { daKey: "asc" },
    });
  },
  ["jobindsats-title-translation-rows"],
  { tags: ["jobindsats-title-translations"] },
);

function normalizeValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function makeIndex(rows: JobindsatsTranslationRow[], locale: LocaleColumn) {
  return Object.fromEntries(
    rows
      .map((row) => [normalizeJobindsatsRepresentativeTitle(row.daKey), normalizeValue(row[locale]) ?? row.en] as const)
      .filter((entry) => entry[0]),
  );
}

export async function listJobindsatsTitleTranslations(options?: {
  query?: string;
  page?: number;
  pageSize?: number;
}) {
  await ensureSeeded();

  const pageSize = Math.max(1, Math.min(options?.pageSize ?? 25, 100));
  const page = Math.max(1, options?.page ?? 1);
  const query = options?.query?.trim() ?? "";

  const where = query
    ? {
        OR: [
          { daKey: { contains: query, mode: "insensitive" as const } },
          { en: { contains: query, mode: "insensitive" as const } },
          { uk: { contains: query, mode: "insensitive" as const } },
          { ar: { contains: query, mode: "insensitive" as const } },
          { fa: { contains: query, mode: "insensitive" as const } },
          { ur: { contains: query, mode: "insensitive" as const } },
          { pl: { contains: query, mode: "insensitive" as const } },
          { de: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const [total, rows] = await Promise.all([
    prisma.jobindsatsTitleTranslation.count({ where }),
    prisma.jobindsatsTitleTranslation.findMany({
      where,
      orderBy: { daKey: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    rows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    query,
  };
}

export async function updateJobindsatsTitleTranslation(input: {
  daKey: string;
  locale: LocaleColumn;
  value: string;
}) {
  await ensureSeeded();

  const daKey = input.daKey.trim();
  if (!daKey) {
    throw new Error("Danish source title is required.");
  }

  await prisma.jobindsatsTitleTranslation.update({
    where: { daKey },
    data: {
      [input.locale]: normalizeValue(input.value),
    },
  });
}

export async function getJobindsatsTitleTranslator() {
  const rows = await getCachedRows();
  const enIndex = makeIndex(rows, "en");
  const localeIndexes = Object.fromEntries(
    localeColumns.map((locale) => [locale, makeIndex(rows, locale)]),
  ) as Record<LocaleColumn, Record<string, string>>;

  return (locale: AppLocale, title: string) => {
    const normalizedTitle = normalizeJobindsatsRepresentativeTitle(title);

    if (!normalizedTitle || locale === "da") {
      return normalizedTitle || title;
    }

    const targetLocale = locale as LocaleColumn;
    return localeIndexes[targetLocale][normalizedTitle] ?? enIndex[normalizedTitle] ?? normalizedTitle;
  };
}
