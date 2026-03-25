import { notFound } from "next/navigation";

import { HomeMapExplorer } from "@/components/home/home-map-explorer";
import { getMunicipalitySummaries } from "@/lib/data/municipalities";
import { formatNumber } from "@/lib/i18n/format";
import { getDictionary } from "@/lib/i18n/dictionaries";
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

  const [municipalities, dictionary] = await Promise.all([
    getMunicipalitySummaries(),
    getDictionary(locale),
  ]);

  const primaryMunicipalities = municipalities.filter((municipality) => municipality.homeMap.isPrimary);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f5ef_0%,#eef4f3_100%)] px-4 py-6 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 sm:gap-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-900/10 bg-white/90 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)] sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">
            {dictionary.home.kicker}
          </p>
          <div className="mt-4 max-w-4xl">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
              {dictionary.home.title}
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
              {dictionary.home.intro}
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-700">
            <span className="rounded-full border border-slate-300 px-4 py-2">
              {formatNumber(locale as AppLocale, municipalities.length)} {dictionary.home.municipalitiesBadge}
            </span>
            <span className="rounded-full border border-slate-300 px-4 py-2">
              {formatNumber(locale as AppLocale, primaryMunicipalities.length)} {locale === "da" ? "synlige p\u00e5 hovedkortet" : "visible on the home map"}
            </span>
            <span className="rounded-full border border-slate-300 px-4 py-2">
              {locale === "da" ? "Mobile-first kortoplevelse" : "Mobile-first map experience"}
            </span>
          </div>
        </section>

        <HomeMapExplorer
          municipalities={municipalities}
          locale={locale as AppLocale}
          ariaLabel={dictionary.home.mapAriaLabel}
        />
      </div>
    </main>
  );
}
