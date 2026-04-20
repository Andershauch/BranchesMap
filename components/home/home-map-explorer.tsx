"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MunicipalitySheet } from "@/components/home/municipality-sheet";
import { SjaellandMunicipalityMap } from "@/components/maps/sjaelland-municipality-map";
import type { MunicipalitySummary } from "@/lib/data/municipalities";
import { municipalityTravelDestinations } from "@/lib/geo/municipality-centers";
import type { AppLocale } from "@/lib/i18n/config";

type KioskTravelOrigin = {
  latitude: number;
  longitude: number;
  source: "env" | "default-naestved-center";
};

const defaultInitialFocusedSlug = "naestved";
const kioskIdleTimeoutMs = 75 * 1000;
const kioskAttractLoopStepMs = 10 * 1000;
const kioskAttractMunicipalityCount = 5;

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
  kioskModeEnabled,
  kioskTravelOrigin,
  handoffUrl,
  handoffQrDataUrl,
  handoffTitle,
  handoffScanLabel,
}: {
  municipalities: MunicipalitySummary[];
  locale: AppLocale;
  ariaLabel: string;
  initialFocusedSlug?: string | null;
  kioskModeEnabled: boolean;
  kioskTravelOrigin: KioskTravelOrigin | null;
  handoffUrl: string;
  handoffQrDataUrl: string | null;
  handoffTitle: string;
  handoffScanLabel: string;
}) {
  const sortedMunicipalities = useMemo(() => sortMunicipalities(municipalities), [municipalities]);
  const featuredSlugs = useMemo(
    () =>
      sortedMunicipalities
        .filter((municipality) => municipality.homeMap.isPrimary)
        .map((municipality) => municipality.slug),
    [sortedMunicipalities],
  );
  const kioskAttractSlugs = useMemo(() => {
    const attractSlugs = sortedMunicipalities
      .filter((municipality) => municipality.homeMap.useInAttractMode)
      .map((municipality) => municipality.slug);
    const primarySlugs = sortedMunicipalities
      .filter((municipality) => municipality.homeMap.isPrimary)
      .map((municipality) => municipality.slug);
    const fallbackSlugs = sortedMunicipalities.map((municipality) => municipality.slug);

    return [...new Set([...attractSlugs, ...primarySlugs, ...fallbackSlugs])].slice(0, kioskAttractMunicipalityCount);
  }, [sortedMunicipalities]);

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
  const [mapFocusToken, setMapFocusToken] = useState(0);
  const [isKioskIdleMode, setKioskIdleMode] = useState(false);
  const [kioskAttractIndex, setKioskAttractIndex] = useState(0);
  const [followedMunicipalitySlugs, setFollowedMunicipalitySlugs] = useState<string[]>([]);
  const [updatedMunicipalitySlugs, setUpdatedMunicipalitySlugs] = useState<string[]>([]);
  const closeTimeoutRef = useRef<number | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const attractTimerRef = useRef<number | null>(null);
  const isKioskIdleModeRef = useRef(false);
  const detailsMunicipality = renderedDetailsSlug
    ? sortedMunicipalities.find((municipality) => municipality.slug === renderedDetailsSlug) ?? null
    : null;
  const kioskModeActive = kioskModeEnabled;
  const effectiveKioskIdleMode = kioskModeActive && isKioskIdleMode;
  const visibleFollowedMunicipalitySlugs = effectiveKioskIdleMode ? [] : followedMunicipalitySlugs;
  const visibleUpdatedMunicipalitySlugs = effectiveKioskIdleMode ? [] : updatedMunicipalitySlugs;

  function clearCloseTimeout() {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }

  function clearIdleTimers() {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    if (attractTimerRef.current) {
      window.clearTimeout(attractTimerRef.current);
      attractTimerRef.current = null;
    }
  }

  function resetInteractiveState() {
    clearCloseTimeout();
    setKioskAttractIndex(0);
    setFocusedSlug(safeInitialFocusedSlug);
    setDetailsSlug(safeInitialFocusedSlug);
    setRenderedDetailsSlug(safeInitialFocusedSlug);
    setSheetMode(safeInitialFocusedSlug ? "preview" : "closed");
    setMapFocusToken((current) => current + 1);
  }

  const scheduleIdleMode = useCallback(() => {
    clearIdleTimers();

    if (!kioskModeActive || kioskAttractSlugs.length === 0) {
      return;
    }

    idleTimerRef.current = window.setTimeout(() => {
      setKioskIdleMode(true);
      setKioskAttractIndex(0);
    }, kioskIdleTimeoutMs);
  }, [kioskAttractSlugs.length, kioskModeActive]);

  function wakeFromIdleMode() {
    if (!kioskModeActive) {
      return;
    }

    setKioskIdleMode(false);
    resetInteractiveState();
    scheduleIdleMode();
  }

  useEffect(() => {
    isKioskIdleModeRef.current = effectiveKioskIdleMode;
  }, [effectiveKioskIdleMode]);

  useEffect(() => {
    return () => {
      clearCloseTimeout();
      clearIdleTimers();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHomeState() {
      try {
        const response = await fetch("/api/home-state", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          ok?: boolean;
          followedMunicipalitySlugs?: string[];
          updatedMunicipalitySlugs?: string[];
        };

        if (!payload.ok) {
          return;
        }

        setFollowedMunicipalitySlugs(payload.followedMunicipalitySlugs ?? []);
        setUpdatedMunicipalitySlugs(payload.updatedMunicipalitySlugs ?? []);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
      }
    }

    loadHomeState();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!kioskModeActive) {
      clearIdleTimers();
      return;
    }

    scheduleIdleMode();

    function handleActivity() {
      if (isKioskIdleModeRef.current) {
        return;
      }

      scheduleIdleMode();
    }

    window.addEventListener("pointerdown", handleActivity, { passive: true });
    window.addEventListener("pointermove", handleActivity, { passive: true });
    window.addEventListener("wheel", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity);

    return () => {
      window.removeEventListener("pointerdown", handleActivity);
      window.removeEventListener("pointermove", handleActivity);
      window.removeEventListener("wheel", handleActivity);
      window.removeEventListener("keydown", handleActivity);
    };
  }, [kioskModeActive, scheduleIdleMode]);

  useEffect(() => {
    if (!effectiveKioskIdleMode) {
      if (attractTimerRef.current) {
        window.clearTimeout(attractTimerRef.current);
        attractTimerRef.current = null;
      }

      return;
    }

    const slug = kioskAttractSlugs[kioskAttractIndex];
    if (!slug) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      clearCloseTimeout();
      setSheetSession((current) => current + 1);
      setFocusedSlug(slug);
      setDetailsSlug(slug);
      setRenderedDetailsSlug(slug);
      setSheetMode("expanded");
      setMapFocusToken((current) => current + 1);
    });

    attractTimerRef.current = window.setTimeout(() => {
      setKioskAttractIndex((current) => (current + 1) % kioskAttractSlugs.length);
    }, kioskAttractLoopStepMs);

    return () => {
      window.cancelAnimationFrame(frame);

      if (attractTimerRef.current) {
        window.clearTimeout(attractTimerRef.current);
        attractTimerRef.current = null;
      }
    };
  }, [effectiveKioskIdleMode, kioskAttractIndex, kioskAttractSlugs]);

  function handleMunicipalityPress(slug: string) {
    if (effectiveKioskIdleMode) {
      return;
    }

    clearCloseTimeout();
    scheduleIdleMode();

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
    scheduleIdleMode();
    setSheetMode("closed");
    clearCloseTimeout();

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
          focusViewportToken={mapFocusToken}
          focusViewportAnimationMode={effectiveKioskIdleMode ? "smooth" : "instant"}
          featuredSlugs={featuredSlugs}
          followedMunicipalitySlugs={visibleFollowedMunicipalitySlugs}
          updatedMunicipalitySlugs={visibleUpdatedMunicipalitySlugs}
          onMunicipalityPress={handleMunicipalityPress}
        />
      </div>

      {kioskModeActive && handoffQrDataUrl ? (
        <aside className="pointer-events-none absolute left-3 top-[calc(var(--app-header-height)+0.75rem)] z-30 max-w-[9.25rem] sm:left-4 sm:max-w-[9.75rem]">
          <div className="pointer-events-auto rounded-[1.4rem] border border-white/70 bg-white/80 p-2.5 shadow-[0_16px_34px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--md-sys-color-primary)]">
              {handoffScanLabel}
            </p>
            <h2 className="mt-1.5 text-[13px] font-semibold leading-5 text-slate-950">{handoffTitle}</h2>

            <div className="mt-2.5 rounded-[1rem] bg-white p-1.5 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]">
              <Image
                src={handoffQrDataUrl}
                alt={handoffScanLabel}
                width={220}
                height={220}
                unoptimized
                className="block h-auto w-full rounded-[0.8rem]"
              />
            </div>

            <p className="mt-1.5 truncate text-[10px] font-medium text-slate-500">
              {handoffUrl.replace(/^https?:\/\//, "")}
            </p>
          </div>
        </aside>
      ) : null}

      {effectiveKioskIdleMode ? (
        <button
          type="button"
          aria-label="Wake kiosk and return to the interactive map"
          onPointerDown={(event) => {
            event.preventDefault();
            wakeFromIdleMode();
          }}
          onClick={(event) => {
            event.preventDefault();
            wakeFromIdleMode();
          }}
          className="absolute inset-0 z-40 bg-transparent"
        />
      ) : null}

      {detailsMunicipality ? (
        <MunicipalitySheet
          key={`${renderedDetailsSlug ?? "sheet"}-${sheetSession}`}
          locale={locale}
          municipality={detailsMunicipality}
          kioskMode={kioskModeActive}
          isFollowing={
            !effectiveKioskIdleMode &&
            followedMunicipalitySlugs.includes(detailsMunicipality.slug)
          }
          kioskTravelOrigin={kioskModeActive ? kioskTravelOrigin : null}
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
