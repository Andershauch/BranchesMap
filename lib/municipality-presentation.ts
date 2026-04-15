import type { AppLocale } from "@/lib/i18n/config";

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

export function buildMunicipalitySheetProfile(
  locale: AppLocale,
  municipalityName: string,
  industries: PresentedIndustry[],
) {
  const names = industries.slice(0, 3).map((industry) => industry.name);

  if (names.length === 0) {
    return locale === "da"
      ? `Åbn ${municipalityName} for at få flere detaljer.`
      : `Open ${municipalityName} to view more details.`;
  }

  if (locale === "da") {
    return `I ${municipalityName} er de 3 brancher, hvor der er flest jobs: ${formatList(locale, names)}. Åbn kommunen for at få flere detaljer.`;
  }

  return `In ${municipalityName}, the three industries with the most jobs are ${formatList(locale, names)}. Open the municipality for more details.`;
}

export function buildMunicipalityTopIndustriesHeading(locale: AppLocale, municipalityName: string) {
  return locale === "da"
    ? `${municipalityName} har i øjeblikket flest job indenfor`
    : `${municipalityName} currently has the most jobs within`;
}

export function buildMunicipalityAdditionalIndustriesHeading(locale: AppLocale, municipalityName: string) {
  return locale === "da"
    ? `Der er desuden jobs i ${municipalityName} i disse brancher i øjeblikket:`
    : `There are also jobs in ${municipalityName} in these industries right now:`;
}

export function buildMunicipalityPocStatus(locale: AppLocale, sources: PresentedSources) {
  if (
    sources.totalJobs === "jobindsats_y25i07_import" &&
    sources.topIndustries === "jobindsats_y25i07_category_mapping"
  ) {
    return locale === "da"
      ? "Samlet jobtal og branchefordeling opdateres nu fra den daglige Jobindsats-import. De konkrete jobkort længere nede er stadig POC-data, indtil et egentligt jobfeed er koblet på."
      : "Total job counts and industry distribution now come from the daily Jobindsats import. The concrete job cards below are still POC data until a real job feed is connected.";
  }

  if (sources.totalJobs === "jobindsats_y25i07_import") {
    return locale === "da"
      ? "Samlet jobtal opdateres fra Jobindsats-importen. Branchefordeling og jobkort er stadig delvist POC-data."
      : "Total job counts are updated from the Jobindsats import. Industry distribution and job cards are still partly POC data.";
  }

  return locale === "da"
    ? "Branchefordeling og jobs er stadig POC-data, men strukturen er klar til at blive koblet til de næste datakilder."
    : "Industry distribution and jobs are still POC data, but the structure is ready for the next data sources.";
}

export function buildJobnetIndustrySearchUrl(municipalityName: string, industryName: string) {
  const query = `${industryName} ${municipalityName}`;
  return `https://job.jobnet.dk/CV/FindWork?q=${encodeURIComponent(query)}`;
}
