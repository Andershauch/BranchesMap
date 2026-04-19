import "server-only";

import { unstable_cache } from "next/cache";

import { baseDictionaries } from "@/lib/i18n/base-dictionaries";
import { locales, type AppLocale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/schema";
import { prisma } from "@/lib/server/prisma";

type EditableLocale = AppLocale;
type AdminFilter = "all" | "missing" | "overridden";

type FlatDictionary = Record<string, string>;

type AppTextTranslationRow = {
  key: string;
  group: string;
  da: string;
  en: string;
  uk: string;
  ar: string;
  fa: string;
  ur: string;
  pl: string;
  de: string;
};

const editableAppTextGroups = [
  "home",
  "municipality",
  "municipalityPage",
  "labels",
  "industries",
  "menu",
  "authStatus",
  "mapControls",
  "pwa",
  "sheet",
  "travel",
  "followsPage",
  "loginPage",
  "registerPage",
  "savedSearchesPage",
] as const;

const editableAppTextGroupSet = new Set<string>(editableAppTextGroups);

function flattenDictionary(
  value: Record<string, unknown>,
  prefix = "",
  output: FlatDictionary = {},
): FlatDictionary {
  for (const [key, nestedValue] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (typeof nestedValue === "string") {
      output[path] = nestedValue;
      continue;
    }

    if (nestedValue && typeof nestedValue === "object" && !Array.isArray(nestedValue)) {
      flattenDictionary(nestedValue as Record<string, unknown>, path, output);
    }
  }

  return output;
}

function cloneDictionary<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function setNestedValue(target: Record<string, unknown>, path: string, value: string) {
  const parts = path.split(".");
  let current: Record<string, unknown> = target;

  for (const part of parts.slice(0, -1)) {
    const next = current[part];

    if (!next || typeof next !== "object" || Array.isArray(next)) {
      current[part] = {};
    }

    current = current[part] as Record<string, unknown>;
  }

  current[parts.at(-1) as string] = value;
}

const baseFlatDictionaries = Object.fromEntries(
  locales.map((locale) => [locale, flattenDictionary(baseDictionaries[locale])]),
) as Record<AppLocale, FlatDictionary>;

const seededTranslations = Object.keys(baseFlatDictionaries.da)
  .sort((left, right) => left.localeCompare(right))
  .map((key) => ({
    key,
    group: key.split(".")[0] ?? "misc",
    da: baseFlatDictionaries.da[key] ?? "",
    en: baseFlatDictionaries.en[key] ?? "",
    uk: baseFlatDictionaries.uk[key] ?? "",
    ar: baseFlatDictionaries.ar[key] ?? "",
    fa: baseFlatDictionaries.fa[key] ?? "",
    ur: baseFlatDictionaries.ur[key] ?? "",
    pl: baseFlatDictionaries.pl[key] ?? "",
    de: baseFlatDictionaries.de[key] ?? "",
  }));

function isEditableAppTextKey(key: string) {
  const group = key.split(".")[0] ?? "";
  return editableAppTextGroupSet.has(group);
}

function getPlaceholders(value: string) {
  return Array.from(new Set(value.match(/\{[a-zA-Z0-9_]+\}/g) ?? [])).sort();
}

function validatePlaceholderCompatibility(key: string, locale: EditableLocale, value: string) {
  const baseValue = getAppTextBaseValue(locale, key);
  const expected = getPlaceholders(baseValue);
  const received = getPlaceholders(value);

  if (expected.length !== received.length) {
    throw new Error("Placeholder mismatch: count differs from base text.");
  }

  for (let index = 0; index < expected.length; index += 1) {
    if (expected[index] !== received[index]) {
      throw new Error("Placeholder mismatch: placeholders must match the base text.");
    }
  }
}

async function ensureSeeded() {
  await prisma.appTextTranslation.createMany({
    data: seededTranslations,
    skipDuplicates: true,
  });
}

async function listAllAppTextTranslationsUncached() {
  await ensureSeeded();
  return prisma.appTextTranslation.findMany({
    orderBy: [{ group: "asc" }, { key: "asc" }],
  });
}

const listAllAppTextTranslationsCached = unstable_cache(
  async () => listAllAppTextTranslationsUncached(),
  ["app-text-translations-all"],
  {
    tags: ["app-text-translations"],
  },
);

async function loadAllAppTextTranslations() {
  if (process.env.NODE_ENV !== "production") {
    return listAllAppTextTranslationsUncached();
  }

  return listAllAppTextTranslationsCached();
}

export function getAppTextBaseValue(locale: EditableLocale, key: string) {
  return baseFlatDictionaries[locale][key] ?? "";
}

export async function listAppTextTranslations(options?: {
  query?: string;
  page?: number;
  pageSize?: number;
  locale?: EditableLocale;
  filter?: AdminFilter;
  group?: string;
}) {
  const pageSize = Math.max(1, Math.min(options?.pageSize ?? 25, 100));
  const page = Math.max(1, options?.page ?? 1);
  const query = options?.query?.trim().toLowerCase() ?? "";
  const locale = options?.locale ?? "da";
  const filter = options?.filter ?? "all";
  const selectedGroup = options?.group?.trim() ?? "";
  const rows = ((await loadAllAppTextTranslations()) as AppTextTranslationRow[]).filter((row) =>
    isEditableAppTextKey(row.key),
  );

  const groupCounts = Object.fromEntries(
    editableAppTextGroups.map((group) => [
      group,
      rows.filter((row) => row.group === group).length,
    ]),
  ) as Record<(typeof editableAppTextGroups)[number], number>;

  const filteredRows = rows.filter((row) => {
    const baseValue = getAppTextBaseValue(locale, row.key);
    const targetValue = row[locale];

     if (selectedGroup && row.group !== selectedGroup) {
      return false;
    }

    if (query) {
      const haystacks = [row.key, row.group, row.da, row.en, row.uk, row.ar, row.fa, row.ur, row.pl, row.de]
        .filter(Boolean)
        .map((value) => value.toLowerCase());

      if (!haystacks.some((value) => value.includes(query))) {
        return false;
      }
    }

    if (filter === "missing") {
      return !targetValue.trim();
    }

    if (filter === "overridden") {
      return targetValue !== baseValue;
    }

    return true;
  });

  const total = filteredRows.length;
  const pagedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  return {
    rows: pagedRows.map((row) => ({
      ...row,
      baseValue: getAppTextBaseValue(locale, row.key),
      isMissing: !row[locale].trim(),
      isOverridden: row[locale] !== getAppTextBaseValue(locale, row.key),
      placeholders: getPlaceholders(getAppTextBaseValue(locale, row.key)),
    })),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    query,
    filter,
    locale,
    group: selectedGroup,
    availableGroups: editableAppTextGroups.map((group) => ({
      key: group,
      count: groupCounts[group],
    })),
  };
}

export async function updateAppTextTranslation(input: {
  key: string;
  locale: EditableLocale;
  value: string;
}) {
  await ensureSeeded();

  const key = input.key.trim();
  if (!key) {
    throw new Error("Translation key is required.");
  }

  if (!isEditableAppTextKey(key)) {
    throw new Error("This text key is not editable in admin.");
  }

  validatePlaceholderCompatibility(key, input.locale, input.value);

  const existing = await prisma.appTextTranslation.findUnique({
    where: { key },
  });

  if (!existing) {
    throw new Error("Translation key was not found.");
  }

  const nextValue = input.value.trim();

  await prisma.appTextTranslation.update({
    where: { key },
    data: {
      [input.locale]: nextValue,
    },
  });

  return {
    key,
    group: existing.group,
    locale: input.locale,
    previousValue: existing[input.locale],
    nextValue,
  };
}

export async function resetAppTextTranslation(input: {
  key: string;
  locale: EditableLocale;
}) {
  const baseValue = getAppTextBaseValue(input.locale, input.key);

  return updateAppTextTranslation({
    key: input.key,
    locale: input.locale,
    value: baseValue,
  });
}

export async function getRuntimeDictionary(locale: AppLocale): Promise<Dictionary> {
  const baseDictionary = cloneDictionary(baseDictionaries[locale]);
  const rows = (await loadAllAppTextTranslations()) as AppTextTranslationRow[];

  for (const row of rows) {
    if (!isEditableAppTextKey(row.key)) {
      continue;
    }

    const value = row[locale];
    if (!value) {
      continue;
    }

    setNestedValue(baseDictionary as unknown as Record<string, unknown>, row.key, value);
  }

  return baseDictionary;
}

export function getEditableAppTextGroups() {
  return [...editableAppTextGroups];
}
