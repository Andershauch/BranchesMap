import { notFound } from "next/navigation";

import { HomeMapExplorer } from "@/components/home/home-map-explorer";
import { getMunicipalitySummaries } from "@/lib/data/municipalities";
import { isValidLocale, locales, type AppLocale } from "@/lib/i18n/config";

type LocalizedHomePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocalizedHomePage({ params }: LocalizedHomePageProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const municipalities = await getMunicipalitySummaries();

  return (
    <main className="min-h-[calc(100vh-4.75rem)] bg-[linear-gradient(180deg,#f7f5ef_0%,#eef4f3_100%)] px-2 py-2 text-slate-900 sm:px-3 sm:py-3">
      <HomeMapExplorer
        municipalities={municipalities}
        locale={locale as AppLocale}
        ariaLabel={locale === "da" ? "Kort over Sj\u00e6llands kommuner" : "Map of Zealand municipalities"}
      />
    </main>
  );
}