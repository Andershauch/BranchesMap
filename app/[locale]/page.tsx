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
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f5ef_0%,#eef4f3_100%)] px-3 py-3 text-slate-900 sm:px-4 sm:py-4">
      <HomeMapExplorer
        municipalities={municipalities}
        locale={locale as AppLocale}
        ariaLabel={locale === "da" ? "Kort over Sjællands kommuner" : "Map of Zealand municipalities"}
      />
    </main>
  );
}
