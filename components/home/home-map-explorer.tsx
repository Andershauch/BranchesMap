"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SjaellandMunicipalityMap } from "@/components/maps/sjaelland-municipality-map";
import { defaultHomeMapSelectionSlug } from "@/lib/config/home-map-display";
import type { MunicipalitySummary } from "@/lib/data/municipalities";
import type { AppLocale } from "@/lib/i18n/config";

const explorerCopy = {
  da: {
    eyebrow: "Kurateret hovedkort",
    title: "Udvalgte kommuner viser navn og brancheprofil direkte på kortet",
    body:
      "Hovedkortet viser kun de kommuner, du som admin har valgt skal være synlige. Alle øvrige kommuner kan stadig vælges i listen nedenfor.",
    featuredBadge: "kommuner vist på hovedkortet",
    panelEyebrow: "Valgt kommune",
    panelEmpty: "Vælg en kommune på kortet eller i listen for at se brancheprofilen.",
    industriesTitle: "Største brancher i denne POC",
    allMunicipalitiesTitle: "Alle kommuner",
    allMunicipalitiesHint: "Brug listen til de små eller skjulte kommuner.",
    featuredShortcutsTitle: "Hurtigvalg på hovedkortet",
    openMunicipality: "Åbn kommuneside",
    jobsSuffix: "jobs i POC",
  },
  en: {
    eyebrow: "Curated home map",
    title: "Selected municipalities show names and industry signals directly on the map",
    body:
      "The home map only shows municipalities that you as an admin have chosen to feature. All other municipalities can still be selected from the list below.",
    featuredBadge: "municipalities shown on the home map",
    panelEyebrow: "Selected municipality",
    panelEmpty: "Choose a municipality on the map or from the list to see its industry profile.",
    industriesTitle: "Largest industries in this POC",
    allMunicipalitiesTitle: "All municipalities",
    allMunicipalitiesHint: "Use the list for the small or hidden municipalities.",
    featuredShortcutsTitle: "Home map shortcuts",
    openMunicipality: "Open municipality page",
    jobsSuffix: "jobs in the POC",
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
  const primaryMunicipalities = sortedMunicipalities.filter((municipality) => municipality.homeMap.isPrimary);
  const fallbackMunicipality =
    sortedMunicipalities.find((municipality) => municipality.slug === defaultHomeMapSelectionSlug) ??
    primaryMunicipalities[0] ??
    sortedMunicipalities[0] ??
    null;
  const [selectedSlug, setSelectedSlug] = useState<string>(fallbackMunicipality?.slug ?? "");
  const selectedMunicipality =
    sortedMunicipalities.find((municipality) => municipality.slug === selectedSlug) ?? fallbackMunicipality;
  const copy = explorerCopy[locale];

  if (!selectedMunicipality) {
    return null;
  }

  const panel = (
    <div className="rounded-[1.75rem] border border-slate-900/10 bg-white/94 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-700">{copy.panelEyebrow}</p>
      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight text-slate-900">{selectedMunicipality.name}</h3>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {formatCount(locale, selectedMunicipality.totalJobs)} {copy.jobsSuffix}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.industriesTitle}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedMunicipality.topIndustries.map((industry) => (
            <span
              key={selectedMunicipality.slug + "-industry-" + industry.slug}
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

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.featuredShortcutsTitle}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {primaryMunicipalities.map((municipality) => {
            const isActive = municipality.slug === selectedMunicipality.slug;

            return (
              <button
                key={municipality.slug + "-shortcut"}
                type="button"
                onClick={() => setSelectedSlug(municipality.slug)}
                className={
                  isActive
                    ? "rounded-full bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                    : "rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                }
              >
                {municipality.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.allMunicipalitiesTitle}</p>
          <p className="text-xs text-slate-500">{copy.allMunicipalitiesHint}</p>
        </div>
        <div className="mt-3 rounded-[1rem] border border-slate-200 bg-slate-50/80 p-3">
          <select
            value={selectedMunicipality.slug}
            onChange={(event) => setSelectedSlug(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-500"
          >
            {sortedMunicipalities.map((municipality) => (
              <option key={municipality.slug + "-option"} value={municipality.slug}>
                {municipality.name}{municipality.homeMap.isPrimary ? (locale === "da" ? " - hovedkort" : " - home map") : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Link
        href={`/${locale}/kommuner/${selectedMunicipality.slug}`}
        className="mt-6 inline-flex items-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
      >
        {copy.openMunicipality}
      </Link>
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.18fr)_minmax(320px,430px)] lg:items-start">
      <section className="rounded-[2rem] border border-slate-900/10 bg-white/88 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.06)] sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-700">{copy.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{copy.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{copy.body}</p>
          </div>
          <span className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
            {formatCount(locale, primaryMunicipalities.length)} {copy.featuredBadge}
          </span>
        </div>

        <div className="relative overflow-hidden rounded-[1.75rem] aspect-[9/16] sm:aspect-[4/5] lg:h-[760px] lg:aspect-auto">
          <SjaellandMunicipalityMap
            municipalities={sortedMunicipalities}
            locale={locale}
            ariaLabel={ariaLabel}
            selectedSlug={selectedMunicipality.slug}
            onSelect={setSelectedSlug}
          />
        </div>

        <div className="relative z-10 -mt-8 px-1 lg:hidden">
          {panel}
        </div>
      </section>

      <aside className="hidden lg:block lg:sticky lg:top-6">{panel}</aside>
    </div>
  );
}
