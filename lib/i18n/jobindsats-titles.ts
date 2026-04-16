import type { AppLocale } from "@/lib/i18n/config";
import { normalizeJobindsatsRepresentativeTitle } from "@/lib/server/jobindsats-category-mapping";

import arJobindsatsTitleTranslations from "@/lib/i18n/jobindsats-titles/ar";
import deJobindsatsTitleTranslations from "@/lib/i18n/jobindsats-titles/de";
import enJobindsatsTitleTranslations from "@/lib/i18n/jobindsats-titles/en";
import faJobindsatsTitleTranslations from "@/lib/i18n/jobindsats-titles/fa";
import plJobindsatsTitleTranslations from "@/lib/i18n/jobindsats-titles/pl";
import ukJobindsatsTitleTranslations from "@/lib/i18n/jobindsats-titles/uk";
import urJobindsatsTitleTranslations from "@/lib/i18n/jobindsats-titles/ur";

type JobindsatsTranslationMap = Partial<Record<string, string>>;

const jobindsatsTitleTranslationsByLocale: Record<AppLocale, JobindsatsTranslationMap> = {
  da: {},
  en: enJobindsatsTitleTranslations,
  uk: ukJobindsatsTitleTranslations,
  ar: arJobindsatsTitleTranslations,
  fa: faJobindsatsTitleTranslations,
  ur: urJobindsatsTitleTranslations,
  pl: plJobindsatsTitleTranslations,
  de: deJobindsatsTitleTranslations,
};

function createNormalizedTranslationIndex(translations: JobindsatsTranslationMap) {
  return Object.fromEntries(
    Object.entries(translations)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .map(([title, translatedTitle]) => [normalizeJobindsatsRepresentativeTitle(title), translatedTitle]),
  );
}

const normalizedEnJobindsatsTitleTranslations = createNormalizedTranslationIndex(enJobindsatsTitleTranslations);
const normalizedJobindsatsTitleTranslationsByLocale = Object.fromEntries(
  Object.entries(jobindsatsTitleTranslationsByLocale).map(([locale, translations]) => [
    locale,
    createNormalizedTranslationIndex(translations),
  ]),
) as Record<AppLocale, Record<string, string>>;

export function translateJobindsatsRepresentativeTitle(locale: AppLocale, title: string) {
  const normalizedTitle = normalizeJobindsatsRepresentativeTitle(title);

  if (!normalizedTitle || locale === "da") {
    return normalizedTitle || title;
  }

  return (
    normalizedJobindsatsTitleTranslationsByLocale[locale][normalizedTitle] ??
    normalizedEnJobindsatsTitleTranslations[normalizedTitle] ??
    normalizedTitle
  );
}
