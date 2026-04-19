import type { LocalizedText } from "@/lib/data/municipalities";
import { intlLocaleMap, type AppLocale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function formatNumber(locale: AppLocale, value: number) {
  return new Intl.NumberFormat(intlLocaleMap[locale]).format(value);
}

export function getIndustryLabel(
  dictionary: Dictionary,
  code: string,
  fallback: string,
) {
  return dictionary.industries[code as keyof Dictionary["industries"]] ?? fallback;
}

export function getLocalizedText(text: LocalizedText, locale: AppLocale) {
  return text[locale] ?? text.en ?? text.da;
}

export function buildMunicipalityTeaser(
  locale: AppLocale,
  dictionary: Dictionary,
  municipalityName: string,
  industryNames: string[],
) {
  if (industryNames.length < 3) {
    return municipalityName;
  }

  if (locale !== "da") {
    return `${municipalityName} is strongest in ${industryNames[0].toLowerCase()}, ${industryNames[1].toLowerCase()}, and ${industryNames[2].toLowerCase()} right now.`;
  }

  return `${municipalityName} er lige nu stærkest repræsenteret inden for ${industryNames[0].toLowerCase()}, ${industryNames[1].toLowerCase()} og ${industryNames[2].toLowerCase()}.`;
}

export function formatEstimatedRolesLabel(
  locale: AppLocale,
  dictionary: Dictionary,
  count: number,
) {
  return `${formatNumber(locale, count)} ${dictionary.labels.estimatedRoles}`;
}

export function formatSampleJobsLabel(
  locale: AppLocale,
  dictionary: Dictionary,
  count: number,
) {
  return `${formatNumber(locale, count)} ${dictionary.labels.sampleJobsInIndustry}`;
}
