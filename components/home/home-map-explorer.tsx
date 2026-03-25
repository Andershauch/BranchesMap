"use client";

import { useEffect, useMemo, useState } from "react";

import { SjaellandMunicipalityMap } from "@/components/maps/sjaelland-municipality-map";
import { defaultHomeMapSelectionSlug } from "@/lib/config/home-map-display";
import type { MunicipalitySummary } from "@/lib/data/municipalities";
import type { AppLocale } from "@/lib/i18n/config";

const STORAGE_KEY = "branches-map-home-featured-municipalities";

const explorerCopy = {
  da: {
    adminToggle: "Adminvisning",
    adminTitle: "Vælg kommuner til hovedkortet",
    adminBody:
      "Til- og fravælg hvilke kommuner der skal have navn og brancheikoner direkte på hovedkortet.",
    focusedEyebrow: "Fokuseret kommune",
    focusedHint: "Tryk p\u00e5 den samme kommune igen for at vise data. Tryk p\u00e5 en anden kommune for at skifte fokus.",
    showData: "Vis kommunedata",
    selectedEyebrow: "Kommunedata",
    industriesTitle: "Brancher med flest jobs i POC'en",
    jobsSuffix: "jobs i POC",
    allMunicipalitiesTitle: "Alle kommuner",
    allMunicipalitiesHint: "Brug listen til sm\u00e5 eller skjulte kommuner.",
    hideOnMap: "Skjul p\u00e5 kort",
    showOnMap: "Vis p\u00e5 kort",
  },
  en: {
    adminToggle: "Admin mode",
    adminTitle: "Choose municipalities for the home map",
    adminBody:
      "Toggle which municipalities should show a name and industry icons directly on the home map.",
    focusedEyebrow: "Focused municipality",
    focusedHint: "Tap the same municipality again to show its data. Tap another municipality to switch focus.",
    showData: "Show municipality data",
    selectedEyebrow: "Municipality data",
    industriesTitle: "Industries with the most jobs in the POC",
    jobsSuffix: "jobs in the POC",
    allMunicipalitiesTitle: "All municipalities",
    allMunicipalitiesHint: "Use the list for small or hidden municipalities.",
    hideOnMap: "Hide on map",
    showOnMap: "Show on map",
  },
} as const;

function formatCount(locale: AppLocale, value: number) {
  return new Intl.NumberFormat(locale).format(value);
}

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

export function HomeMapExplorer({
  municipalities,
  locale,
  ariaLabel,
}: {
  municipalities: MunicipalitySummary[];
  locale: AppLocale;
  ariaLabel: string;
}) {
  const sortedMunicipalities = useMemo(() => sortMunicipalities(municipalities), [municipalities]);
  const defaultFeaturedSlugs = useMemo(
    () => sortedMunicipalities.filter((municipality) => municipality.homeMap.isPrimary).map((municipality) => municipality.slug),
    [sortedMunicipalities],
  );
  const fallbackMunicipality =
    sortedMunicipalities.find((municipality) => municipality.slug === defaultHomeMapSelectionSlug) ??
    sortedMunicipalities[0] ??
    null;

  const [featuredSlugs, setFeaturedSlugs] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return defaultFeaturedSlugs;
    }

    try {
      const rawValue = window.localStorage.getItem(STORAGE_KEY);
      if (!rawValue) {
        return defaultFeaturedSlugs;
      }

      const parsed = JSON.parse(rawValue);
      if (!Array.isArray(parsed)) {
        return defaultFeaturedSlugs;
      }

      const validSlugs = new Set(sortedMunicipalities.map((municipality) => municipality.slug));
      const nextFeatured = parsed.filter((value): value is string => typeof value === "string" && validSlugs.has(value));
      return nextFeatured.length > 0 ? nextFeatured : defaultFeaturedSlugs;
    } catch {
      return defaultFeaturedSlugs;
    }
  });
  const [focusedSlug, setFocusedSlug] = useState<string>(() => fallbackMunicipality?.slug ?? "");
  const [detailsSlug, setDetailsSlug] = useState<string | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const copy = explorerCopy[locale];

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(featuredSlugs));
  }, [featuredSlugs]);

  const focusedMunicipality =
    sortedMunicipalities.find((municipality) => municipality.slug === focusedSlug) ?? fallbackMunicipality;
  const detailsMunicipality =
    detailsSlug ? sortedMunicipalities.find((municipality) => municipality.slug === detailsSlug) ?? null : null;

  if (!focusedMunicipality) {
    return null;
  }

  function handleMunicipalityPress(slug: string) {
    if (focusedSlug === slug) {
      setDetailsSlug(slug);
      return;
    }

    setFocusedSlug(slug);
    setDetailsSlug(null);
  }

  function handleMunicipalitySelectFromList(slug: string) {
    setFocusedSlug(slug);
    setDetailsSlug(slug);
  }

  function toggleFeaturedMunicipality(slug: string) {
    setFeaturedSlugs((current) => {
      if (current.includes(slug)) {
        const next = current.filter((value) => value !== slug);
        return next.length > 0 ? next : current;
      }

      return [...current, slug];
    });
  }

  const panel = detailsMunicipality ? (
    <div className="rounded-[1.6rem] border border-slate-900/10 bg-white/96 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.12)] backdrop-blur sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-700">{copy.selectedEyebrow}</p>
      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{detailsMunicipality.name}</h2>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {formatCount(locale, detailsMunicipality.totalJobs)} {copy.jobsSuffix}
        </span>
      </div>
      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.industriesTitle}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {detailsMunicipality.topIndustries.map((industry) => (
            <span
              key={detailsMunicipality.slug + "-industry-" + industry.slug}
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-white"
              style={{ backgroundColor: industry.accentColor }}
            >
              <span>{industry.icon}</span>
              <span>{industry.name}</span>
              <span className="text-white/80">{formatCount(locale, industry.jobCount)}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  ) : (
    <div className="rounded-[1.6rem] border border-slate-900/10 bg-white/96 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.12)] backdrop-blur sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-700">{copy.focusedEyebrow}</p>
      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{focusedMunicipality.name}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{copy.focusedHint}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setDetailsSlug(focusedMunicipality.slug)}
        className="mt-5 inline-flex items-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
      >
        {copy.showData}
      </button>
    </div>
  );

  return (
    <section className="mx-auto w-full max-w-6xl">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,420px)] lg:items-start">
        <div className="rounded-[2rem] border border-slate-900/10 bg-white/88 p-3 shadow-[0_20px_80px_rgba(15,23,42,0.06)] sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-700">BranchesMap</p>
              <h1 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                {locale === "da" ? "Kommunekort og kommunedata" : "Municipality map and municipality data"}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setIsAdminOpen((current) => !current)}
              className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              {copy.adminToggle}
            </button>
          </div>

          {isAdminOpen ? (
            <div className="mb-3 rounded-[1.4rem] border border-slate-200 bg-slate-50/90 p-3 sm:p-4">
              <h2 className="text-sm font-semibold text-slate-900">{copy.adminTitle}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{copy.adminBody}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {sortedMunicipalities.map((municipality) => {
                  const isVisible = featuredSlugs.includes(municipality.slug);

                  return (
                    <label
                      key={municipality.slug + "-admin"}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3"
                    >
                      <span className="text-sm font-medium text-slate-800">{municipality.name}</span>
                      <button
                        type="button"
                        onClick={() => toggleFeaturedMunicipality(municipality.slug)}
                        className={
                          isVisible
                            ? "rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                            : "rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700"
                        }
                      >
                        {isVisible ? copy.hideOnMap : copy.showOnMap}
                      </button>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="relative overflow-hidden rounded-[1.7rem] aspect-[9/16] bg-slate-100">
            <SjaellandMunicipalityMap
              municipalities={sortedMunicipalities}
              locale={locale}
              ariaLabel={ariaLabel}
              focusedSlug={focusedMunicipality.slug}
              detailsSlug={detailsMunicipality?.slug ?? null}
              featuredSlugs={featuredSlugs}
              onMunicipalityPress={handleMunicipalityPress}
            />
          </div>

          <div className="relative z-10 -mt-8 px-1 lg:hidden">
            {panel}
            <div className="mt-3 rounded-[1.4rem] border border-slate-900/10 bg-white/94 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.allMunicipalitiesTitle}</p>
                <p className="text-xs text-slate-500">{copy.allMunicipalitiesHint}</p>
              </div>
              <select
                value={focusedMunicipality.slug}
                onChange={(event) => handleMunicipalitySelectFromList(event.target.value)}
                className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-500"
              >
                {sortedMunicipalities.map((municipality) => (
                  <option key={municipality.slug + "-option-mobile"} value={municipality.slug}>
                    {municipality.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <aside className="hidden lg:block lg:sticky lg:top-4">
          {panel}
          <div className="mt-4 rounded-[1.6rem] border border-slate-900/10 bg-white/96 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.allMunicipalitiesTitle}</p>
              <p className="text-xs text-slate-500">{copy.allMunicipalitiesHint}</p>
            </div>
            <select
              value={focusedMunicipality.slug}
              onChange={(event) => handleMunicipalitySelectFromList(event.target.value)}
              className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-500"
            >
              {sortedMunicipalities.map((municipality) => (
                <option key={municipality.slug + "-option-desktop"} value={municipality.slug}>
                  {municipality.name}
                </option>
              ))}
            </select>
          </div>
        </aside>
      </div>
    </section>
  );
}
