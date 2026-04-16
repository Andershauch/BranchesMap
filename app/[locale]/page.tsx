import { notFound } from "next/navigation";

import { HomeMapExplorer } from "@/components/home/home-map-explorer";
import { getMunicipalitySummaries } from "@/lib/data/municipalities";
import { getDictionary } from "@/lib/i18n/dictionaries";
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

  const [municipalities, dictionary, search] = await Promise.all([
    getMunicipalitySummaries(),
    getDictionary(locale as AppLocale),
    searchParams,
  ]);
  const requestedFocusSlug = getStringParam(search.focus);
  const initialFocusedSlug = municipalities.some((municipality) => municipality.slug === requestedFocusSlug)
    ? requestedFocusSlug
    : null;

  return (
    <main className="-mt-[var(--app-header-height)] min-h-[100dvh] text-[var(--md-sys-color-on-surface)]">
      <HomeMapExplorer
        municipalities={municipalities}
        locale={locale as AppLocale}
        ariaLabel={dictionary.home.mapAriaLabel}
        initialFocusedSlug={initialFocusedSlug}
      />
    </main>
  );
}
