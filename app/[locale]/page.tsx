import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SjaellandMunicipalityMap } from "@/components/maps/sjaelland-municipality-map";
import { getMunicipalitySummaries } from "@/lib/data/municipalities";
import { sjaellandMunicipalityFeatureCollection } from "@/lib/geo/sjaelland";
import {
  buildMunicipalityTeaser,
  formatDemoJobsLabel,
  formatNumber,
  getIndustryLabel,
} from "@/lib/i18n/format";
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

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f5ef_0%,#eef4f3_100%)] px-6 py-12 text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-900/10 bg-white/90 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">
            {dictionary.home.kicker}
          </p>
          <div className="mt-4 max-w-4xl">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {dictionary.home.title}
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-700">
              {dictionary.home.intro}
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-700">
            <span className="rounded-full border border-slate-300 px-4 py-2">
              {formatNumber(locale, municipalities.length)} {dictionary.home.municipalitiesBadge}
            </span>
            <span className="rounded-full border border-slate-300 px-4 py-2">
              {formatNumber(locale, sjaellandMunicipalityFeatureCollection.features.length)} {dictionary.home.boundariesBadge}
            </span>
            <span className="rounded-full border border-slate-300 px-4 py-2">
              {dictionary.home.geometryBadge}
            </span>
            <Link
              href="/api/utf8"
              className="rounded-full bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-700"
            >
              {dictionary.home.utf8Action}
            </Link>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-900/10 bg-white/90 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.06)] sm:p-8">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">{dictionary.home.mapTitle}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {dictionary.home.mapDescription}
              </p>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate-600">
              {dictionary.home.mapNote}
            </p>
          </div>

          <Suspense
            fallback={
              <div className="aspect-[9/10] rounded-[1.75rem] bg-[radial-gradient(circle_at_top,#d9efe8_0%,#bfd8ce_34%,#9abdaf_100%)] sm:aspect-[9/8]" />
            }
          >
            <SjaellandMunicipalityMap
              municipalities={municipalities}
              locale={locale as AppLocale}
              ariaLabel={dictionary.home.mapAriaLabel}
            />
          </Suspense>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {municipalities.map((municipality) => {
            const industryNames = municipality.topIndustries.map((industry) =>
              getIndustryLabel(dictionary, industry.code, industry.name),
            );
            const teaser = buildMunicipalityTeaser(
              locale as AppLocale,
              dictionary,
              municipality.name,
              industryNames,
            );

            return (
              <Link
                key={municipality.slug}
                href={`/${locale}/kommuner/${municipality.slug}`}
                className="rounded-[1.5rem] border border-slate-900/10 bg-white/85 p-5 transition hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(15,23,42,0.08)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">{municipality.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{teaser}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {formatDemoJobsLabel(locale as AppLocale, dictionary, municipality.totalJobs)}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {municipality.topIndustries.map((industry) => (
                    <span
                      key={`${municipality.slug}-${industry.slug}-badge`}
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium text-white"
                      style={{ backgroundColor: industry.accentColor }}
                    >
                      <span>{industry.icon}</span>
                      <span>{getIndustryLabel(dictionary, industry.code, industry.name)}</span>
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}