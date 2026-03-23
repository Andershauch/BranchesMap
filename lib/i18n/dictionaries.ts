import type { AppLocale } from "@/lib/i18n/config";

const dictionaries = {
  da: {
    meta: {
      title: "BranchesMap",
      description:
        "POC for et mobilvenligt kort over Sjællands kommuner og brancher.",
    },
    header: {
      appName: "BranchesMap",
      appTagline: "POC med kommunekort, brancher og jobs på tværs af Sjælland.",
      localeLabel: "Sprog",
    },
    locales: {
      da: "Dansk",
      en: "English",
    },
    home: {
      kicker: "BranchesMap POC",
      title: "Kommunekort med rigtige grænser for Sjælland",
      intro:
        "Kortet bruger nu officielle kommunegeometrier fra Dataforsyningen. Hver kommune kan klikkes direkte, og de tre mest repræsenterede brancher vises som ikonbadge oven på fladen.",
      municipalitiesBadge: "kommuner i kortet",
      boundariesBadge: "officielle kommunegrænser",
      geometryBadge: "Geometri fra Dataforsyningen/DAWA",
      utf8Action: "Test UTF-8 API",
      mapTitle: "Kommunekort",
      mapDescription:
        "Dette er POC-versionens rigtige geolag. Bornholm og Lolland-Falster er bevidst udeladt, fordi scope her er selve Sjælland og Amager-kommunerne.",
      mapNote:
        "Næste iteration kan bruge samme struktur til mere præcise labels, søgning, zoom og senere live-data pr. kommune.",
      mapAriaLabel: "Kort over Sjællands kommuner",
    },
    municipality: {
      backToMap: "Tilbage til kortet",
      kicker: "Kommuneprofil",
      pocStatusTitle: "POC-status",
      pocStatusBody:
        "Branchefordeling og jobs er mock-data, men strukturen følger den model, vi senere kan seede til Prisma.",
      municipalityCode: "Kommunekode",
    },
    labels: {
      demoJobs: "demojobs",
      estimatedRoles: "estimerede stillinger i POC-versionen",
      sampleJobsInIndustry: "eksempeljobs i denne branche",
    },
    industries: {
      health: "Sundhed",
      tech: "Teknologi",
      build: "Byggeri",
      logistics: "Logistik",
      education: "Uddannelse",
      tourism: "Turisme",
      food: "Fødevarer",
    },
  },
  en: {
    meta: {
      title: "BranchesMap",
      description:
        "POC for a mobile-friendly map of municipalities and industries across Zealand.",
    },
    header: {
      appName: "BranchesMap",
      appTagline: "POC with municipality map, industries, and jobs across Zealand.",
      localeLabel: "Language",
    },
    locales: {
      da: "Dansk",
      en: "English",
    },
    home: {
      kicker: "BranchesMap POC",
      title: "Municipality map with real Zealand boundaries",
      intro:
        "The map now uses official municipality geometry from Dataforsyningen. Each municipality is directly clickable, and the three most represented industries are shown as icon badges on top of the area.",
      municipalitiesBadge: "municipalities on the map",
      boundariesBadge: "official municipality boundaries",
      geometryBadge: "Geometry from Dataforsyningen/DAWA",
      utf8Action: "Test UTF-8 API",
      mapTitle: "Municipality map",
      mapDescription:
        "This is the real geo layer for the POC. Bornholm and Lolland-Falster are intentionally excluded because the current scope is Zealand and the Amager municipalities.",
      mapNote:
        "The next iteration can use the same structure for more precise labels, search, zoom, and later live data per municipality.",
      mapAriaLabel: "Map of Zealand municipalities",
    },
    municipality: {
      backToMap: "Back to the map",
      kicker: "Municipality profile",
      pocStatusTitle: "POC status",
      pocStatusBody:
        "Industry distribution and jobs are mock data, but the structure follows the model we can later seed into Prisma.",
      municipalityCode: "Municipality code",
    },
    labels: {
      demoJobs: "demo jobs",
      estimatedRoles: "estimated roles in the POC",
      sampleJobsInIndustry: "sample jobs in this industry",
    },
    industries: {
      health: "Health",
      tech: "Technology",
      build: "Construction",
      logistics: "Logistics",
      education: "Education",
      tourism: "Tourism",
      food: "Food",
    },
  },
} as const;

export type Dictionary = (typeof dictionaries)[AppLocale];

export async function getDictionary(locale: AppLocale): Promise<Dictionary> {
  return dictionaries[locale];
}