"use client";

import { useMemo, useState } from "react";

import { SjaellandMunicipalityMap } from "@/components/maps/sjaelland-municipality-map";
import type { MunicipalitySummary } from "@/lib/data/municipalities";
import type { AppLocale } from "@/lib/i18n/config";

const defaultInitialFocusedSlug = "naestved";

function sortMunicipalities(items: MunicipalitySummary[]) {
  return [...items].sort((left, right) => {
    if (left.homeMap.isPrimary !== right.homeMap.isPrimary) {
      return left.homeMap.isPrimary ? -1 : 1;
    }

    if (left.homeMap.priority !== right.homeMap.priority) {
      return left.homeMap.priority - right.homeMap.priority;
    }

    return left.name.localeCompare(right.name, "da");
  });
}

const uiCopy = {
  da: {
    title: "Kort over kommuner",
    body: "Fokuser p\u00e5 en kommune for at se brancher, jobestimat og den aktuelle profil uden at forlade kortet.",
    municipalities: "kommuner",
    focus: "Fokus",
  },
  en: {
    title: "Municipality map",
    body: "Focus a municipality to preview industries, job estimates, and the latest profile details without leaving the map.",
    municipalities: "municipalities",
    focus: "Focus",
  },
} as const;

export function HomeMapExplorer({
  municipalities,
  locale,
  ariaLabel,
  initialFocusedSlug,
}: {
  municipalities: MunicipalitySummary[];
  locale: AppLocale;
  ariaLabel: string;
  initialFocusedSlug?: string | null;
}) {
  const sortedMunicipalities = useMemo(() => sortMunicipalities(municipalities), [municipalities]);
  const featuredSlugs = useMemo(
    () =>
      sortedMunicipalities
        .filter((municipality) => municipality.homeMap.isPrimary)
        .map((municipality) => municipality.slug),
    [sortedMunicipalities],
  );

  const safeInitialFocusedSlug =
    initialFocusedSlug && sortedMunicipalities.some((municipality) => municipality.slug === initialFocusedSlug)
      ? initialFocusedSlug
      : sortedMunicipalities.some((municipality) => municipality.slug === defaultInitialFocusedSlug)
        ? defaultInitialFocusedSlug
        : null;

  const [focusedSlug, setFocusedSlug] = useState<string | null>(safeInitialFocusedSlug);
  const [detailsSlug, setDetailsSlug] = useState<string | null>(safeInitialFocusedSlug);
  const copy = uiCopy[locale];

  const detailsMunicipality = detailsSlug
    ? sortedMunicipalities.find((municipality) => municipality.slug === detailsSlug) ?? null
    : null;

  function handleMunicipalityPress(slug: string) {
    setFocusedSlug(slug);
    setDetailsSlug(slug);
  }

  function handleDismissDetails() {
    setDetailsSlug(null);
  }

  return (
    <section className="mx-auto w-full max-w-7xl">
      <div className="grid gap-4">
        <div className="rounded-[1.75rem] bg-[var(--md-sys-color-surface-container)] px-5 py-5 shadow-[0_1px_3px_var(--md-sys-color-shadow)] sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--md-sys-color-primary)]">
                BranchesMap
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--md-sys-color-on-surface)] sm:text-[2rem]">
                {copy.title}
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--md-sys-color-on-surface-variant)] sm:text-base">
                {copy.body}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[var(--md-sys-color-primary-container)] px-4 py-2 text-sm font-medium text-[var(--md-sys-color-on-primary-container)]">
                {sortedMunicipalities.length} {copy.municipalities}
              </span>
              {detailsMunicipality ? (
                <span className="rounded-full bg-[var(--md-sys-color-surface-container-high)] px-4 py-2 text-sm font-medium text-[var(--md-sys-color-on-surface)]">
                  {copy.focus}: {detailsMunicipality.name}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] p-2 shadow-[0_8px_24px_var(--md-sys-color-shadow)] sm:p-3">
          <div className="relative h-[calc(100dvh-12rem)] min-h-[34rem] overflow-hidden rounded-[1.7rem] bg-[var(--md-sys-color-surface-container-lowest)] sm:h-[calc(100dvh-10.5rem)]">
            <SjaellandMunicipalityMap
              municipalities={sortedMunicipalities}
              locale={locale}
              ariaLabel={ariaLabel}
              focusedSlug={focusedSlug}
              detailsSlug={detailsSlug}
              detailsMunicipality={detailsMunicipality}
              featuredSlugs={featuredSlugs}
              onMunicipalityPress={handleMunicipalityPress}
              onDismissDetails={handleDismissDetails}
            />
          </div>
        </div>
      </div>
    </section>
  );
}