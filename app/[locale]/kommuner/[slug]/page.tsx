import Link from "next/link";
import { notFound } from "next/navigation";

import { getMunicipalityBySlug, getMunicipalitySummaries } from "@/lib/data/municipalities";
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
      ? "Følger"
      : "Following"
    : activeLocale === "da"
      ? "Følg kommune"
      : "Follow municipality";
  const followsLabel = activeLocale === "da" ? "Se følger" : "View following";
  const followedState = getStringParam(search.followed);
  const followStatusMessage =
    followedState === "created"
      ? activeLocale === "da"
        ? "Du følger nu denne kommune. Næste skridt er notifikationer, når data ændrer sig."
        : "You are now following this municipality. The next step is notifications when data changes."
      : followedState === "exists"
        ? activeLocale === "da"
          ? "Du følger allerede denne kommune."
          : "You are already following this municipality."
        : followedState === "error"
          ? activeLocale === "da"
            ? "Kommunen kunne ikke følges. Prøv igen."
            : "The municipality could not be followed. Please try again."
          : null;

  return (
    <main className="min-h-[calc(100dvh-4rem)] px-4 py-4 text-[var(--md-sys-color-on-surface)] sm:px-6 sm:py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-6">
        <section className="rounded-[1.75rem] bg-[var(--md-sys-color-surface-container)] px-5 py-5 shadow-[0_1px_3px_var(--md-sys-color-shadow)] sm:px-6">
          <Link
            href={`/${locale}`}
            className="inline-flex rounded-full bg-[var(--md-sys-color-surface-container-high)] px-4 py-2 text-sm font-medium text-[var(--md-sys-color-on-surface)] transition hover:bg-[var(--md-sys-color-surface-container-highest)]"
          >
            {dictionary.municipality.backToMap}
          </Link>

          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--md-sys-color-primary)]">
                {dictionary.municipality.kicker}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--md-sys-color-on-surface)] sm:text-5xl">
                {municipality.name}
              </h1>
              <p className="mt-4 text-base leading-7 text-[var(--md-sys-color-on-surface-variant)] sm:text-lg">
                {buildMunicipalityTeaser(activeLocale, dictionary, municipality.name, topIndustryNames)}
              </p>

              {followStatusMessage ? (
                <div
                  className={`mt-5 rounded-[1.25rem] px-4 py-3 text-sm font-medium ${
                    followedState === "error"
                      ? "bg-rose-50 text-rose-700"
                      : "bg-sky-50 text-sky-800"
                  }`}
                >
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
                    className={`inline-flex rounded-full px-4 py-3 text-sm font-semibold transition ${
                      searchState.isFollowing
                        ? "bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-surface)]"
                        : "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] hover:opacity-95"
                    }`}
                  >
                    {followButtonLabel}
                  </button>
                </form>
                <Link
                  href={`/${locale}/follows`}
                  className="inline-flex rounded-full bg-[var(--md-sys-color-surface-container-high)] px-4 py-3 text-sm font-medium text-[var(--md-sys-color-on-surface)] transition hover:bg-[var(--md-sys-color-surface-container-highest)]"
                >
                  {followsLabel}
                </Link>
              </div>
            </div>

            <div className="w-full max-w-sm rounded-[1.5rem] bg-[var(--md-sys-color-primary-container)] p-5 text-[var(--md-sys-color-on-primary-container)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
                {dictionary.municipality.pocStatusTitle}
              </p>
              <p className="mt-3 text-sm leading-6 sm:text-base">
                {dictionary.municipality.pocStatusBody}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {municipality.topIndustries.map((industry) => (
            <article
              key={`${municipality.slug}-${industry.slug}`}
              className="rounded-[1.5rem] bg-[var(--md-sys-color-surface-container)] p-5 shadow-[0_1px_3px_var(--md-sys-color-shadow)]"
            >
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full text-xl text-white"
                  style={{ backgroundColor: industry.accentColor }}
                >
                  {industry.icon}
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--md-sys-color-on-surface)]">
                    {getIndustryLabel(dictionary, industry.code, industry.name)}
                  </h2>
                  <p className="text-sm text-[var(--md-sys-color-on-surface-variant)]">
                    {formatEstimatedRolesLabel(activeLocale, dictionary, industry.jobCount)}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-4 sm:gap-5">
          {municipality.jobsByIndustry.map(({ industry, jobs }) => (
            <article
              key={`${municipality.slug}-${industry.slug}-jobs`}
              className="rounded-[1.75rem] bg-[var(--md-sys-color-surface-container)] p-5 shadow-[0_4px_16px_var(--md-sys-color-shadow)] sm:p-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full text-xl text-white"
                    style={{ backgroundColor: industry.accentColor }}
                  >
                    {industry.icon}
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--md-sys-color-on-surface)]">
                      {getIndustryLabel(dictionary, industry.code, industry.name)}
                    </h2>
                    <p className="text-sm text-[var(--md-sys-color-on-surface-variant)]">
                      {formatSampleJobsLabel(activeLocale, dictionary, jobs.length)}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-[var(--md-sys-color-surface-container-high)] px-3 py-1.5 text-sm text-[var(--md-sys-color-on-surface-variant)]">
                  {dictionary.municipality.municipalityCode}: {municipality.code}
                </span>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {jobs.map((job) => (
                  <article
                    key={job.id}
                    className="rounded-[1.4rem] bg-[var(--md-sys-color-surface-container-high)] p-4 text-[var(--md-sys-color-on-surface)]"
                  >
                    <h3 className="text-base font-semibold">{getLocalizedText(job.title, activeLocale)}</h3>
                    <p className="mt-2 text-sm font-medium text-[var(--md-sys-color-on-surface-variant)]">
                      {getLocalizedText(job.employerName, activeLocale)}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-[var(--md-sys-color-on-surface-variant)]">
                      {getLocalizedText(job.summary, activeLocale)}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--md-sys-color-on-surface-variant)]">
                      <span className="rounded-full bg-[var(--md-sys-color-surface-container-low)] px-3 py-1.5">
                        {getLocalizedText(job.locationLabel, activeLocale)}
                      </span>
                      <span className="rounded-full bg-[var(--md-sys-color-surface-container-low)] px-3 py-1.5">
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