import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";

import { getMunicipalityBySlug, getMunicipalitySummaries } from "@/lib/data/municipalities";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { formatNumber, getIndustryLabel } from "@/lib/i18n/format";
import { isRtlLocale, isValidLocale, locales, type AppLocale } from "@/lib/i18n/config";
import {
  buildJobnetIndustrySearchUrl,
  buildMunicipalityAdditionalIndustriesHeading,
  buildMunicipalityPocStatus,
  buildMunicipalityTopIndustriesHeading,
} from "@/lib/municipality-presentation";
import { getCurrentUser } from "@/lib/server/auth";
import { getMunicipalitySearchStateForUser, markMunicipalityFollowUpdatesSeen } from "@/lib/server/search-follows";

export const dynamic = "force-dynamic";

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

  const currentUserPromise = getCurrentUser();
  const [municipality, dictionary, search, currentUser] = await Promise.all([
    getMunicipalityBySlug(slug),
    getDictionary(locale),
    searchParams,
    currentUserPromise,
  ]);

  if (!municipality) {
    notFound();
  }

  const searchState = currentUser
    ? (
        await Promise.all([
          markMunicipalityFollowUpdatesSeen({ userId: currentUser.id, municipalitySlug: slug }),
          getMunicipalitySearchStateForUser({ userId: currentUser.id, municipalitySlug: slug }),
        ])
      )[1]
    : { isSaved: false, isFollowing: false };

  const activeLocale = locale as AppLocale;
  const isRtl = isRtlLocale(activeLocale);
  const industryOverview = municipality.industryOverview.map((industry) => ({
    ...industry,
    label: getIndustryLabel(dictionary, industry.code, industry.name),
    jobnetUrl: buildJobnetIndustrySearchUrl(municipality.name, industry.name),
  }));
  const additionalIndustryOverview = industryOverview.slice(3, 10);
  const followButtonLabel = searchState.isFollowing
    ? dictionary.municipalityPage.following
    : dictionary.municipalityPage.followMunicipality;
  const followsLabel = dictionary.municipalityPage.viewFollowing;
  const followedState = getStringParam(search.followed);
  const followStatusMessage =
    followedState === "created"
      ? dictionary.municipalityPage.followCreated
      : followedState === "exists"
        ? dictionary.municipalityPage.followExists
        : followedState === "error"
          ? dictionary.municipalityPage.followError
          : null;

  return (
    <main
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-[calc(100dvh-4rem)] px-4 py-4 text-[var(--md-sys-color-on-surface)] sm:px-6 sm:py-6"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-6">
        <section className="rounded-[1.75rem] bg-[var(--md-sys-color-surface-container)] px-5 py-5 shadow-[0_1px_3px_var(--md-sys-color-shadow)] sm:px-6">
          <Link
            href={`/${locale}`}
            className="inline-flex rounded-full bg-[var(--md-sys-color-surface-container-high)] px-4 py-2 text-sm font-medium text-[var(--md-sys-color-on-surface)] transition hover:bg-[var(--md-sys-color-surface-container-highest)]"
          >
            {dictionary.municipality.backToMap}
          </Link>

          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl text-start">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--md-sys-color-primary)]">
                {dictionary.municipality.kicker}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--md-sys-color-on-surface)] sm:text-5xl">
                {municipality.name}
              </h1>

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

            <div className="w-full max-w-sm rounded-[1.5rem] bg-[var(--md-sys-color-primary-container)] p-5 text-start text-[var(--md-sys-color-on-primary-container)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
                {dictionary.municipality.pocStatusTitle}
              </p>
              <p className="mt-3 text-sm leading-6 sm:text-base">
                {buildMunicipalityPocStatus(activeLocale, municipality.sources)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] bg-[var(--md-sys-color-surface-container)] px-5 py-5 shadow-[0_1px_3px_var(--md-sys-color-shadow)] sm:px-6">
          <h2 className="text-start text-lg font-semibold text-[var(--md-sys-color-on-surface)] sm:text-xl">
            {buildMunicipalityTopIndustriesHeading(activeLocale, municipality.name)}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {municipality.topIndustries.map((industry) => {
              const industryLabel = getIndustryLabel(dictionary, industry.code, industry.name);
              const jobnetUrl = buildJobnetIndustrySearchUrl(municipality.name, industry.name);

              return (
                <article
                  key={`${municipality.slug}-${industry.slug}`}
                  className="rounded-[1.5rem] bg-[var(--md-sys-color-surface-container)] p-5 shadow-[0_1px_3px_var(--md-sys-color-shadow)]"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="inline-flex h-12 w-12 shrink-0 aspect-square items-center justify-center overflow-hidden rounded-full text-xl leading-none text-white"
                      style={{ backgroundColor: industry.accentColor }}
                    >
                      {industry.icon}
                    </span>
                    <div className="min-w-0 text-start">
                      <h2 className="text-lg font-semibold text-[var(--md-sys-color-on-surface)]">
                        <a
                          href={jobnetUrl}
                          target="_blank"
                          rel="noreferrer"
                          dir="auto"
                          className="transition hover:text-[var(--md-sys-color-primary)]"
                        >
                          {industryLabel}
                        </a>
                      </h2>
                      <p className="text-sm text-[var(--md-sys-color-on-surface-variant)]">
                        <strong className="font-semibold text-[var(--md-sys-color-on-surface)]">
                          {formatNumber(activeLocale, industry.jobCount)}
                        </strong>{" "}
                        {dictionary.labels.estimatedRoles}
                      </p>
                      {industry.representativeTitles && industry.representativeTitles.length > 0 ? (
                        <p className="mt-2 text-sm leading-6 text-[var(--md-sys-color-on-surface-variant)]">
                          {dictionary.municipalityPage.representativeTitlesPrefix}{" "}
                          {industry.representativeTitles.map((title, index) => (
                            <Fragment key={`${industry.slug}-${title}`}>
                              {index > 0 ? ", " : null}
                              <a
                                href={buildJobnetIndustrySearchUrl(municipality.name, industry.name, title)}
                                target="_blank"
                                rel="noreferrer"
                                dir="auto"
                                className="font-semibold text-[var(--md-sys-color-on-surface)] underline decoration-[var(--md-sys-color-outline)] underline-offset-2 transition hover:text-[var(--md-sys-color-primary)]"
                              >
                                {title}
                              </a>
                            </Fragment>
                          ))}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {additionalIndustryOverview.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-start text-base font-semibold text-[var(--md-sys-color-on-surface)] sm:text-lg">
                {buildMunicipalityAdditionalIndustriesHeading(activeLocale, municipality.name)}
              </h3>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {additionalIndustryOverview.map((industry) => (
                  <a
                    key={`${municipality.slug}-more-${industry.slug}`}
                    href={industry.jobnetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--md-sys-color-surface-container-high)] px-3 py-2 text-sm font-medium text-[var(--md-sys-color-on-surface)] transition hover:bg-[var(--md-sys-color-surface-container-highest)]"
                  >
                    <span
                      className="inline-flex h-6 w-6 shrink-0 aspect-square items-center justify-center overflow-hidden rounded-full text-xs leading-none text-white"
                      style={{ backgroundColor: industry.accentColor }}
                    >
                      {industry.icon}
                    </span>
                    <span dir="auto">{industry.label}</span>
                    <span dir="auto" className="text-[var(--md-sys-color-on-surface-variant)]">
                      {formatNumber(activeLocale, industry.jobCount)}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
