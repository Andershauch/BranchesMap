"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type TouchEvent } from "react";

import { useDictionary } from "@/components/i18n/dictionary-provider";
import { MunicipalityTravelEstimate } from "@/components/home/municipality-travel-estimate";
import type { MunicipalitySummary } from "@/lib/data/municipalities";
import type { TravelDestination } from "@/lib/geo/municipality-centers";
import { isRtlLocale, type AppLocale } from "@/lib/i18n/config";
import { buildJobnetIndustrySearchUrl } from "@/lib/municipality-presentation";

type SheetMode = "closed" | "preview" | "expanded";
const sheetEnterDelayMs = 16;

function formatCount(locale: AppLocale, value: number) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatMunicipalityName(locale: AppLocale, value: string) {
  return value.toLocaleUpperCase(locale);
}

export function MunicipalitySheet({
  locale,
  municipality,
  isFollowing,
  kioskMode = false,
  kioskTravelOrigin = null,
  travelDestination,
  mode,
  onExpand,
  onCollapse,
  onClose,
}: {
  locale: AppLocale;
  municipality: MunicipalitySummary;
  isFollowing: boolean;
  kioskMode?: boolean;
  kioskTravelOrigin?: { latitude: number; longitude: number } | null;
  travelDestination: TravelDestination | null;
  mode: SheetMode;
  onExpand: () => void;
  onCollapse: () => void;
  onClose: () => void;
}) {
  const dictionary = useDictionary();
  const copy = dictionary.sheet;
  const isRtl = isRtlLocale(locale);
  const touchStartYRef = useRef<number | null>(null);
  const [isEntered, setIsEntered] = useState(false);
  const isExpanded = mode === "expanded";
  const visualMode = mode === "closed" ? "closed" : isEntered ? mode : "closed";
  const isVisible = visualMode !== "closed";
  const accentColor = municipality.topIndustries[0]?.accentColor ?? "#0f766e";
  const visibleIndustries = isExpanded
    ? municipality.topIndustries
    : municipality.topIndustries.slice(0, 3);
  const panelHeight = "min(30.5rem, calc(100dvh - var(--app-header-height) - var(--sheet-panel-gap)))";
  const previewPeek = "var(--sheet-preview-peek)";

  useEffect(() => {
    if (mode === "closed") {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsEntered(true);
    }, sheetEnterDelayMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [mode, municipality.slug]);

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const startY = touchStartYRef.current;
    const endY = event.changedTouches[0]?.clientY ?? null;
    touchStartYRef.current = null;

    if (startY === null || endY === null) {
      return;
    }

    const deltaY = endY - startY;

    if (deltaY <= -48 && !isExpanded) {
      onExpand();
      return;
    }

    if (deltaY >= 70) {
      if (isExpanded) {
        onCollapse();
      } else {
        onClose();
      }
    }
  }

  const translateY =
    visualMode === "expanded"
      ? "0%"
      : visualMode === "preview"
        ? `calc(100% - ${previewPeek})`
        : "calc(100% - 0.35rem)";

  if (kioskMode) {
    return (
      <section className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
        <div className="pointer-events-auto border-t border-white/72 bg-[color:rgba(255,255,255,0.84)] shadow-[0_-18px_48px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
          <div className="mx-auto flex w-full max-w-none flex-col gap-3 px-4 pb-[calc(max(var(--safe-bottom),0px)+0.9rem)] pt-3">
            <div className="flex flex-wrap items-center gap-2 text-start">
              <h2 className="text-[1.65rem] font-semibold tracking-tight text-slate-950">
                {formatMunicipalityName(locale, municipality.name)}
              </h2>
              <span
                dir="auto"
                className="rounded-full bg-white/88 px-3 py-1.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-900/6"
              >
                ca. {formatCount(locale, municipality.totalJobs)} {copy.jobsSuffix}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {municipality.topIndustries.slice(0, 3).map((industry) => (
                <a
                  key={municipality.slug + "-kiosk-" + industry.slug}
                  href={buildJobnetIndustrySearchUrl(municipality.name, industry.name)}
                  target="_blank"
                  rel="noreferrer"
                  title={dictionary.municipalityPage.relatedJobnetSearchHint}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full px-4 py-2.5 text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-1"
                  style={{ backgroundColor: industry.accentColor }}
                >
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full text-[15px] leading-none">
                    {industry.icon}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-center">
                    <span dir="auto">{industry.name}</span>
                  </span>
                </a>
              ))}
            </div>

            <MunicipalityTravelEstimate
              locale={locale}
              destination={travelDestination}
              kioskMode
              fixedOrigin={kioskTravelOrigin}
            />
          </div>
        </div>
      </section>
    );
  }

  const actionButtons = (
    <div className={`grid gap-2 ${isExpanded ? "grid-cols-2" : ""}`}>
      {isExpanded ? (
        <Link
          href={`/${locale}/kommuner/${municipality.slug}`}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-300 bg-white/88 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:ring-offset-2"
        >
          {copy.openProfile}
        </Link>
      ) : null}

      <form action="/api/follows" method="post">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="intent" value="follow-municipality" />
        <input type="hidden" name="municipalitySlug" value={municipality.slug} />
        <input type="hidden" name="returnTo" value={`/${locale}?focus=${municipality.slug}`} />
        <button
          type="submit"
          disabled={isFollowing}
          className={`inline-flex min-h-10 w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold shadow-[0_14px_24px_rgba(15,23,42,0.16)] transition ${
            isFollowing
              ? "cursor-default bg-slate-200 text-slate-700 shadow-none"
              : "bg-slate-950 text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:ring-offset-2"
          }`}
        >
          {isFollowing ? copy.following : copy.follow}
        </button>
      </form>
    </div>
  );

  return (
    <>
      {isVisible ? (
        <button
          type="button"
          aria-label={copy.close}
          onClick={onClose}
          className={`absolute inset-0 z-20 transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isExpanded ? "pointer-events-auto bg-slate-950/18 opacity-100" : "pointer-events-none bg-slate-950/0 opacity-0"
          }`}
        />
      ) : null}

      <section className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
        <div
          dir={isRtl ? "rtl" : "ltr"}
          className={`pointer-events-auto w-full overflow-hidden rounded-t-[1.8rem] rounded-b-none border-x-0 border-b-0 border-t border-white/72 bg-[color:rgba(255,255,255,0.88)] backdrop-blur-2xl transition-[transform,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
            isExpanded
              ? "shadow-[0_-22px_72px_rgba(15,23,42,0.18),0_-2px_0_rgba(255,255,255,0.44)]"
              : "shadow-[0_-12px_40px_rgba(15,23,42,0.12),0_-2px_0_rgba(255,255,255,0.36)]"
          }`}
          style={{
            height: panelHeight,
            transform: `translateY(${translateY})`,
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="relative flex h-full flex-col overscroll-contain pb-[max(var(--safe-bottom),0px)]">
            <div
              className="absolute inset-x-0 top-0 h-24 opacity-90"
              style={{
                background: `linear-gradient(180deg, color-mix(in srgb, ${accentColor} 18%, white) 0%, rgba(255,255,255,0.16) 64%, rgba(255,255,255,0) 100%)`,
              }}
            />

            <div
              role="button"
              tabIndex={0}
              onClick={isExpanded ? onCollapse : onExpand}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  if (isExpanded) {
                    onCollapse();
                  } else {
                    onExpand();
                  }
                }
              }}
              className="relative flex cursor-pointer flex-col px-5 pb-2 pt-2.5 outline-none"
              aria-label={isExpanded ? copy.collapse : copy.expand}
            >
              <div className="mx-auto flex flex-col items-center">
                <div
                  className={`h-2 w-16 rounded-full bg-slate-400/95 shadow-[0_4px_10px_rgba(15,23,42,0.16)] ring-1 ring-white/75 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isExpanded ? "scale-110" : "scale-100"
                  }`}
                />
                {!isExpanded ? (
                  <div className="mt-1 h-1 w-7 rounded-full bg-slate-300/90" />
                ) : null}
              </div>

              <div className={`flex items-start justify-between gap-3 ${kioskMode ? "mt-2" : "mt-3"}`}>
                <div className="min-w-0 flex-1 text-start">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className={`truncate font-semibold tracking-tight text-slate-950 ${kioskMode ? "text-[1.6rem]" : "text-[1.45rem]"}`}>
                      {formatMunicipalityName(locale, municipality.name)}
                    </h2>
                    <span
                      dir="auto"
                      className={`rounded-full bg-white/82 font-semibold text-slate-600 ring-1 ring-slate-900/6 ${kioskMode ? "px-3 py-1.5 text-[11px]" : "px-2.5 py-1 text-[10px]"}`}
                    >
                      ca. {formatCount(locale, municipality.totalJobs)} {copy.jobsSuffix}
                    </span>
                  </div>

                  {!isExpanded ? (
                    <p className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {copy.swipeHint}
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (isExpanded) {
                      onCollapse();
                    } else {
                      onClose();
                    }
                  }}
                  className="inline-flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full bg-white/90 text-[12px] font-semibold text-slate-700 shadow-[0_6px_16px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/8 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:ring-offset-1"
                  aria-label={isExpanded ? copy.collapse : copy.close}
                >
                  {isExpanded ? "\u2212" : "\u00d7"}
                </button>
              </div>
            </div>

            <div
              className={
                isExpanded
                  ? kioskMode
                    ? "flex-1 overflow-y-auto px-5 pb-1"
                    : "flex-1 overflow-y-auto px-5 pb-2"
                  : "px-5 pb-2.5"
              }
            >
              <div className="grid grid-cols-3 gap-1.5">
                {visibleIndustries.map((industry) => (
                  <a
                    key={municipality.slug + "-sheet-" + industry.slug}
                    href={buildJobnetIndustrySearchUrl(municipality.name, industry.name)}
                    target="_blank"
                    rel="noreferrer"
                    title={dictionary.municipalityPage.relatedJobnetSearchHint}
                    className={`inline-flex items-center rounded-full font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)] ${
                      kioskMode
                        ? isExpanded
                          ? "min-h-12 w-full justify-center gap-2.5 px-4 py-2.5 text-[15px]"
                          : "min-h-10 w-full justify-center gap-2 px-3 py-1.75 text-[11px]"
                        : isExpanded
                          ? "w-full justify-center gap-1.5 px-2 py-1.75 text-[10px]"
                          : "w-full justify-center gap-1.5 px-2 py-1.5 text-[9px]"
                    } transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-1`}
                    style={{ backgroundColor: industry.accentColor }}
                  >
                    <span
                      className={`inline-flex shrink-0 aspect-square items-center justify-center overflow-hidden rounded-full leading-none ${
                        kioskMode
                          ? isExpanded
                            ? "h-6 w-6 text-[15px]"
                            : "h-5 w-5 text-[12px]"
                          : isExpanded
                            ? "h-4 w-4 text-[10px]"
                            : "h-3.5 w-3.5 text-[9px]"
                      }`}
                    >
                      {industry.icon}
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate text-center ${
                        isExpanded ? "max-w-[4.6rem]" : "max-w-[4.2rem]"
                      }`}
                    >
                      <span dir="auto">{industry.name}</span>
                    </span>
                  </a>
                ))}
              </div>

              {isExpanded ? (
                <>
                  <MunicipalityTravelEstimate
                    locale={locale}
                    destination={travelDestination}
                    kioskMode={kioskMode}
                    fixedOrigin={kioskTravelOrigin}
                  />
                </>
              ) : null}
            </div>

            <div className={`px-5 ${isExpanded ? "mt-4 pb-2.5" : "mt-4 pb-1"}`}>
              {actionButtons}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
