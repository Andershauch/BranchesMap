"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { MunicipalitySheet } from "@/components/home/municipality-sheet";
import { SjaellandMunicipalityMap } from "@/components/maps/sjaelland-municipality-map";
import type { MunicipalitySummary } from "@/lib/data/municipalities";
import { municipalityTravelDestinations } from "@/lib/geo/municipality-centers";
import type { AppLocale } from "@/lib/i18n/config";

const defaultInitialFocusedSlug = "naestved";
type SheetMode = "closed" | "preview" | "expanded";

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
  followedMunicipalitySlugs,
  updatedMunicipalitySlugs,
}: {
  municipalities: MunicipalitySummary[];
  locale: AppLocale;
  ariaLabel: string;
  initialFocusedSlug?: string | null;
  followedMunicipalitySlugs: string[];
  updatedMunicipalitySlugs: string[];
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
  const [renderedDetailsSlug, setRenderedDetailsSlug] = useState<string | null>(safeInitialFocusedSlug);
  const [sheetSession, setSheetSession] = useState(0);
  const [sheetMode, setSheetMode] = useState<SheetMode>(safeInitialFocusedSlug ? "preview" : "closed");
  const closeTimeoutRef = useRef<number | null>(null);
  const detailsMunicipality = renderedDetailsSlug
    ? sortedMunicipalities.find((municipality) => municipality.slug === renderedDetailsSlug) ?? null
    : null;

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  function handleMunicipalityPress(slug: string) {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    if (sheetMode === "closed") {
      setSheetSession((current) => current + 1);
    }

    setFocusedSlug(slug);
    setDetailsSlug(slug);
    setRenderedDetailsSlug(slug);

    if (detailsSlug === slug) {
      setSheetMode((current) => (current === "preview" ? "expanded" : current === "closed" ? "preview" : current));
      return;
    }

    setSheetMode("preview");
  }

  function handleDismissDetails() {
    setSheetMode("closed");

    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
    }

    closeTimeoutRef.current = window.setTimeout(() => {
      setDetailsSlug(null);
      setRenderedDetailsSlug(null);
      closeTimeoutRef.current = null;
    }, 460);
  }

  return (
    <section className="relative isolate h-[100dvh] overflow-hidden bg-[var(--md-sys-color-surface-container-lowest)]">
      <div className="absolute inset-0">
        <SjaellandMunicipalityMap
          municipalities={sortedMunicipalities}
          ariaLabel={ariaLabel}
          focusedSlug={focusedSlug}
          detailsSlug={detailsSlug}
          featuredSlugs={featuredSlugs}
          updatedMunicipalitySlugs={updatedMunicipalitySlugs}
          onMunicipalityPress={handleMunicipalityPress}
        />
      </div>

      {detailsMunicipality ? (
        <MunicipalitySheet
          key={`${renderedDetailsSlug ?? "sheet"}-${sheetSession}`}
          locale={locale}
          municipality={detailsMunicipality}
          isFollowing={followedMunicipalitySlugs.includes(detailsMunicipality.slug)}
          travelDestination={municipalityTravelDestinations.get(detailsMunicipality.slug) ?? null}
          mode={sheetMode === "expanded" ? "expanded" : sheetMode === "preview" ? "preview" : "closed"}
          onExpand={() => setSheetMode("expanded")}
          onCollapse={() => setSheetMode("preview")}
          onClose={handleDismissDetails}
        />
      ) : null}
    </section>
  );
}
