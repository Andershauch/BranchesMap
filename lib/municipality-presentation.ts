import type { AppLocale } from "@/lib/i18n/config";
import { getDictionarySync } from "@/lib/i18n/dictionaries";
import type { Dictionary } from "@/lib/i18n/schema";

export type PresentedIndustry = {
  code: string;
  name: string;
  jobCount: number;
};

export type PresentedSources = {
  totalJobs: string;
  topIndustries: string;
};

function formatList(locale: AppLocale, items: string[]) {
  if (items.length === 0) {
    return "";
  }

  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return locale === "da" ? `${items[0]} og ${items[1]}` : `${items[0]} and ${items[1]}`;
  }

  const head = items.slice(0, -1).join(", ");
  const tail = items.at(-1);
  return locale === "da" ? `${head} og ${tail}` : `${head}, and ${tail}`;
}

function replaceToken(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template,
  );
}

export function buildMunicipalitySheetProfile(
  locale: AppLocale,
  municipalityName: string,
  industries: PresentedIndustry[],
  dictionaryOverride?: Dictionary,
) {
  const dictionary = dictionaryOverride ?? getDictionarySync(locale);
  const names = industries.slice(0, 3).map((industry) => industry.name);

  if (names.length === 0) {
    return replaceToken(dictionary.municipalityPage.sheetProfileEmpty, {
      municipality: municipalityName,
    });
  }

  return replaceToken(dictionary.municipalityPage.sheetProfileSummary, {
    municipality: municipalityName,
    industries: formatList(locale, names),
  });
}

export function buildMunicipalityTopIndustriesHeading(
  locale: AppLocale,
  municipalityName: string,
  dictionaryOverride?: Dictionary,
) {
  return replaceToken((dictionaryOverride ?? getDictionarySync(locale)).municipalityPage.topIndustriesHeading, {
    municipality: municipalityName,
  });
}

export function buildMunicipalityAdditionalIndustriesHeading(
  locale: AppLocale,
  municipalityName: string,
  dictionaryOverride?: Dictionary,
) {
  return replaceToken((dictionaryOverride ?? getDictionarySync(locale)).municipalityPage.additionalIndustriesHeading, {
    municipality: municipalityName,
  });
}

export function buildMunicipalityPocStatus(
  locale: AppLocale,
  sources: PresentedSources,
  dictionaryOverride?: Dictionary,
) {
  const dictionary = dictionaryOverride ?? getDictionarySync(locale);
  if (
    sources.totalJobs === "jobindsats_y25i07_import" &&
    sources.topIndustries === "jobindsats_y25i07_category_mapping"
  ) {
    return dictionary.municipalityPage.pocStatusImportedFull;
  }

  if (sources.totalJobs === "jobindsats_y25i07_import") {
    return dictionary.municipalityPage.pocStatusImportedTotalOnly;
  }

  return dictionary.municipalityPage.pocStatusFallback;
}

export function buildJobnetIndustrySearchUrl(
  municipalityName: string,
  industryName: string,
  titleName?: string | null,
) {
  const normalizedMunicipality = municipalityName.trim();
  const searchTerms = [
    normalizedMunicipality.toLocaleLowerCase("da-DK"),
    titleName?.trim(),
    industryName.trim(),
    normalizedMunicipality,
  ]
    .filter(Boolean)
    .join(" ");

  return `https://jobnet.dk/find-job?searchString=${encodeURIComponent(searchTerms)}`;
}
