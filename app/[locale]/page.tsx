import { notFound } from "next/navigation";

import { HomeMapExplorer } from "@/components/home/home-map-explorer";
import { getMunicipalitySummaries } from "@/lib/data/municipalities";
import { isValidLocale, locales, type AppLocale } from "@/lib/i18n/config";

type LocalizedHomePageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

function getStringParam(value: string | string[] | undefined) {
  return typeof value === "string" && value ? value : null;
}

export default async function LocalizedHomePage({ params, searchParams }: LocalizedHomePageProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const [municipalities, search] = await Promise.all([getMunicipalitySummaries(), searchParams]);
  const requestedFocusSlug = getStringParam(search.focus);
  const initialFocusedSlug = municipalities.some((municipality) => municipality.slug === requestedFocusSlug)
    ? requestedFocusSlug
    : null;

  return (
    <main className="min-h-[calc(100vh-4.75rem)] bg-[linear-gradient(180deg,#f7f5ef_0%,#eef4f3_100%)] px-2 py-2 text-slate-900 sm:px-3 sm:py-3">
      <HomeMapExplorer
        municipalities={municipalities}
        locale={locale as AppLocale}
        ariaLabel={locale === "da" ? "Kort over Sjællands kommuner" : "Map of Zealand municipalities"}
        initialFocusedSlug={initialFocusedSlug}
      />
    </main>
  );
}