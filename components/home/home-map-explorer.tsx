"use client";

import { useMemo, useState } from "react";

import { SjaellandMunicipalityMap } from "@/components/maps/sjaelland-municipality-map";
import type { MunicipalitySummary } from "@/lib/data/municipalities";
import type { AppLocale } from "@/lib/i18n/config";

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
      : null;

  const [focusedSlug, setFocusedSlug] = useState<string | null>(safeInitialFocusedSlug);
  const [detailsSlug, setDetailsSlug] = useState<string | null>(safeInitialFocusedSlug);

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
    <section className="mx-auto h-[calc(100vh-4.75rem)] w-full max-w-6xl">
      <div className="h-full rounded-[2rem] border border-slate-900/10 bg-white/62 p-2 shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur sm:p-3">
        <div className="relative h-full overflow-hidden rounded-[1.8rem] bg-slate-100">
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
    </section>
  );
}