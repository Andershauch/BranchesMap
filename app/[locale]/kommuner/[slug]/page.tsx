import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getMunicipalityBySlug,
  getMunicipalitySummaries,
} from "@/lib/data/municipalities";
import {
  buildMunicipalityTeaser,
  formatEstimatedRolesLabel,
  formatSampleJobsLabel,
  getIndustryLabel,
  getLocalizedText,
} from "@/lib/i18n/format";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isValidLocale, locales, type AppLocale } from "@/lib/i18n/config";
import { getCurrentUser } from "@/lib/server/auth";
import { getMunicipalitySearchStateForUser } from "@/lib/server/search-follows";

type MunicipalityPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateStaticParams() {
  const municipalities = await getMunicipalitySummaries();

  return locales.flatMap((locale) =>
    municipalities.map((municipality) => ({
      locale,
      slug: municipality.slug,
    })),
  );
}

function getStringParam(value: string | string[] | undefined) {
  return typeof value === "string" && value ? value : null;
}

export default async function MunicipalityPage({ params, searchParams }: MunicipalityPageProps) {
  const { locale, slug } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const [municipality, dictionary, search, searchState] = await Promise.all([
    getMunicipalityBySlug(slug),
    getDictionary(locale),
    searchParams,
    currentUser
      ? getMunicipalitySearchStateForUser({ userId: currentUser.id, municipalitySlug: slug })
      : Promise.resolve({ isSaved: false, isFollowing: false }),
  ]);

  if (!municipality) {
    notFound();
  }

  const activeLocale = locale as AppLocale;
  const topIndustryNames = municipality.topIndustries.map((industry) =>
    getIndustryLabel(dictionary, industry.code, industry.name),
  );
  const followButtonLabel = searchState.isFollowing
    ? activeLocale === "da"
      ? "F\u00f8lger"
      : "Following"
    : activeLocale === "da"
      ? "F\u00f8lg kommune"
      : "Follow municipality";
  const followsLabel = activeLocale === "da" ? "Se f\u00f8lger" : "View following";
  const followedState = getStringParam(search.followed);
  const followStatusMessage =
    followedState === "created"
      ? activeLocale === "da"
        ? "Du f\u00f8lger nu denne kommune. N\u00e6ste skridt er notifikationer, n\u00e5r data \u00e6ndrer sig."
        : "You are now following this municipality. The next step is notifications when data changes."
      : followedState === "exists"
        ? activeLocale === "da"
          ? "Du f\u00f8lger allerede denne kommune."
          : "You are already following this municipality."
        : followedState === "error"
          ? activeLocale === "da"
            ? "Kommunen kunne ikke f\u00f8lges. Pr\u00f8v igen."
            : "The municipality could not be followed. Please try again."
          : null;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f5ef_0%,#eef4f3_100%)] px-6 py-12 text-slate-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="rounded-[2rem] border border-slate-900/10 bg-white/90 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
          <Link
            href={`/${locale}`}
            className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
          >
            {dictionary.municipality.backToMap}
          </Link>
          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">
                {dictionary.municipality.kicker}
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                {municipality.name}
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-700">
                {buildMunicipalityTeaser(
                  activeLocale,
                  dictionary,
                  municipality.name,
                  topIndustryNames,
                )}
              </p>
              {followStatusMessage ? (
                <div className={`mt-5 rounded-[1.2rem] border px-4 py-3 text-sm font-medium ${followedState === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-sky-200 bg-sky-50 text-sky-800"}`}>
                  {followStatusMessage}
                </div>
              ) : null}
              <div className="mt-6 flex flex-wrap gap-3">
                <form action="/api/follows" method="post">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="intent" value="follow-municipality" />
                  <input type="hidden" name="municipalitySlug" value={municipality.slug} />
                  <input type="hidden" name="returnTo" value={`/${locale}/kommuner/${municipality.slug}`} />
                  <button
                    type="submit"
                    disabled={searchState.isFollowing}
                    className={`inline-flex rounded-full px-4 py-2.5 text-sm font-semibold transition ${searchState.isFollowing ? "cursor-default bg-sky-100 text-sky-700" : "bg-slate-900 text-white hover:bg-slate-700"}`}
                  >
                    {followButtonLabel}
                  </button>
                </form>
                <Link
                  href={`/${locale}/follows`}
                  className="inline-flex rounded-full border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
                >
                  {followsLabel}
                </Link>
              </div>
            </div>
            <div className="rounded-[1.5rem] bg-slate-950 px-5 py-4 text-slate-100">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {dictionary.municipality.pocStatusTitle}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {dictionary.municipality.pocStatusBody}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {municipality.topIndustries.map((industry) => (
            <article
              key={`${municipality.slug}-${industry.slug}`}
              className="rounded-[1.5rem] border border-slate-900/10 bg-white/85 p-5"
            >
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full text-xl text-white"
                  style={{ backgroundColor: industry.accentColor }}
                >
                  {industry.icon}
                </span>
                <div>
                  <h2 className="text-lg font-semibold">
                    {getIndustryLabel(dictionary, industry.code, industry.name)}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {formatEstimatedRolesLabel(activeLocale, dictionary, industry.jobCount)}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-6">
          {municipality.jobsByIndustry.map(({ industry, jobs }) => (
            <article
              key={`${municipality.slug}-${industry.slug}-jobs`}
              className="rounded-[1.75rem] border border-slate-900/10 bg-white/90 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)]"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full text-xl text-white"
                    style={{ backgroundColor: industry.accentColor }}
                  >
                    {industry.icon}
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold">
                      {getIndustryLabel(dictionary, industry.code, industry.name)}
                    </h2>
                    <p className="text-sm text-slate-600">
                      {formatSampleJobsLabel(activeLocale, dictionary, jobs.length)}
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700">
                  {dictionary.municipality.municipalityCode}: {municipality.code}
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {jobs.map((job) => (
                  <article
                    key={job.id}
                    className="rounded-[1.25rem] border border-slate-900/10 bg-slate-50 p-4"
                  >
                    <h3 className="text-base font-semibold text-slate-900">
                      {getLocalizedText(job.title, activeLocale)}
                    </h3>
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      {getLocalizedText(job.employerName, activeLocale)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {getLocalizedText(job.summary, activeLocale)}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="rounded-full border border-slate-300 px-3 py-1">
                        {getLocalizedText(job.locationLabel, activeLocale)}
                      </span>
                      <span className="rounded-full border border-slate-300 px-3 py-1">
                        {activeLocale.toUpperCase()}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}