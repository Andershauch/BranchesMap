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

export function buildMunicipalityTeaser(
  locale: AppLocale,
  dictionary: Dictionary,
  municipalityName: string,
  industryNames: string[],
) {
  if (industryNames.length < 3) {
    return municipalityName;
  }

  if (locale === "en") {
    return `${municipalityName} is strongest in ${industryNames[0].toLowerCase()}, ${industryNames[1].toLowerCase()}, and ${industryNames[2].toLowerCase()} in this POC.`;
  }

  return `${municipalityName} er i denne POC stærkest repræsenteret inden for ${industryNames[0].toLowerCase()}, ${industryNames[1].toLowerCase()} og ${industryNames[2].toLowerCase()}.`;
}

export function formatDemoJobsLabel(
  locale: AppLocale,
  dictionary: Dictionary,
  count: number,
) {
  return `${formatNumber(locale, count)} ${dictionary.labels.demoJobs}`;
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