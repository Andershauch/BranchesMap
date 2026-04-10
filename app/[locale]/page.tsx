import { notFound } from "next/navigation";

import { HomeMapExplorer } from "@/components/home/home-map-explorer";
import { getMunicipalitySummaries } from "@/lib/data/municipalities";
import { isValidLocale, locales, type AppLocale } from "@/lib/i18n/config";
import { getCurrentUser } from "@/lib/server/auth";
import { listFollowedMunicipalitySlugsForUser } from "@/lib/server/search-follows";

export const dynamic = "force-dynamic";

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

  const currentUser = await getCurrentUser();
  const [municipalities, search, followedMunicipalitySlugs] = await Promise.all([
    getMunicipalitySummaries(),
    searchParams,
    currentUser ? listFollowedMunicipalitySlugsForUser(currentUser.id) : Promise.resolve([]),
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
        ariaLabel={locale === "da" ? "Kort over Sj\u00e6llands kommuner" : "Map of Zealand municipalities"}
        initialFocusedSlug={initialFocusedSlug}
        followedMunicipalitySlugs={followedMunicipalitySlugs}
      />
    </main>
  );
}
