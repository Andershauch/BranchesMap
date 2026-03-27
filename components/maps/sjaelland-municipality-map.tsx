"use client";

import Link from "next/link";
import { geoMercator, geoPath } from "d3-geo";
import {
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type TouchEvent,
  type WheelEvent,
} from "react";

import type { MunicipalitySummary } from "@/lib/data/municipalities";
import { sjaellandMunicipalityFeatureCollection } from "@/lib/geo/sjaelland";
import type { AppLocale } from "@/lib/i18n/config";

const width = 900;
const height = 1600;
const aspectRatio = height / width;
const initialViewBox = { x: 0, y: 0, width, height };
const minViewWidth = width / 13;
const zoomStep = 1.22;
const dragActivationPx = 10;

const labelTuning: Record<
  string,
  {
    dx?: number;
    dy?: number;
    iconDy?: number;
  }
> = {
  albertslund: { dx: -12, dy: 2 },
  ballerup: { dx: -10, dy: -8 },
  brondby: { dx: -10, dy: 6 },
  dragor: { dx: 12, dy: 14 },
  frederiksberg: { dx: -2, dy: 0 },
  gentofte: { dx: 12, dy: -8 },
  gladsaxe: { dx: 8, dy: -10 },
  glostrup: { dx: -6, dy: -6 },
  herlev: { dx: -2, dy: -10 },
  helsingor: { dx: 10, dy: -10 },
  hillerod: { dx: 0, dy: 4 },
  holbaek: { dx: 0, dy: 4 },
  horsholm: { dx: 10, dy: -10 },
  hvidovre: { dx: -8, dy: 10 },
  ishoj: { dx: -8, dy: 10 },
  kobenhavn: { dx: 10, dy: -4, iconDy: -1 },
  koge: { dx: 8, dy: 10 },
  kalundborg: { dx: -8, dy: 6 },
  "lyngby-taarbaek": { dx: 8, dy: -12 },
  naestved: { dx: 0, dy: 12 },
  greve: { dx: 10, dy: 14 },
  "hoje-taastrup": { dx: -12, dy: 14 },
  rodovre: { dx: -10, dy: -4 },
  ringsted: { dx: 0, dy: 4 },
  roskilde: { dx: -8, dy: -4 },
  soro: { dx: -8, dy: 0 },
  slagelse: { dx: -8, dy: 8 },
  stevns: { dx: 12, dy: 10 },
  taarnby: { dx: 8, dy: 10 },
  vallensbaek: { dx: -12, dy: 8 },
  vordingborg: { dx: 0, dy: -10 },
};

const uiCopy: Record<
  AppLocale,
  {
    zoomIn: string;
    zoomOut: string;
    reset: string;
    jobsSuffix: string;
    industriesTitle: string;
    selectedEyebrow: string;
    close: string;
    swipeHint: string;
    openProfile: string;
    follow: string;
  }
> = {
  da: {
    zoomIn: "Zoom ind",
    zoomOut: "Zoom ud",
    reset: "Nulstil",
    jobsSuffix: "jobs i POC",
    industriesTitle: "Brancher i fokus",
    selectedEyebrow: "Kommunedata",
    close: "Luk",
    swipeHint: "Swipe kortet væk eller tryk på X for at lukke.",
    openProfile: "Åbn kommune",
    follow: "Følg",
  },
  en: {
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    reset: "Reset",
    jobsSuffix: "jobs in the POC",
    industriesTitle: "Industries in focus",
    selectedEyebrow: "Municipality data",
    close: "Close",
    swipeHint: "Swipe the card away or tap X to close.",
    openProfile: "Open municipality",
    follow: "Follow",
  },
};

const projection = geoMercator().fitExtent(
  [
    [42, 42],
    [width - 42, height - 42],
  ],
  sjaellandMunicipalityFeatureCollection as never,
);

const path = geoPath(projection);

type ViewBox = typeof initialViewBox;

type Point = {
  x: number;
  y: number;
};

type PointerSnapshot = {
  clientX: number;
  clientY: number;
};

type DragGesture = {
  type: "drag";
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startViewBox: ViewBox;
  hasMoved: boolean;
  startSlug: string | null;
};

type PinchGesture = {
  type: "pinch";
  pointerIds: [number, number];
  startDistance: number;
  startViewBox: ViewBox;
  anchorWorld: Point;
};

type GestureState = DragGesture | PinchGesture;

type MapFeature = {
  municipality: MunicipalitySummary;
  pathData: string;
  marker: Point;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
    area: number;
  };
};

type OverlayPlacement = {
  left: string;
  top: string;
  transform: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampViewBox(viewBox: ViewBox): ViewBox {
  const nextWidth = clamp(viewBox.width, minViewWidth, width);
  const nextHeight = nextWidth * aspectRatio;
  const maxX = width - nextWidth;
  const maxY = height - nextHeight;

  return {
    x: clamp(viewBox.x, 0, maxX),
    y: clamp(viewBox.y, 0, maxY),
    width: nextWidth,
    height: nextHeight,
  };
}

function scaleViewBox(viewBox: ViewBox, factor: number, center: Point): ViewBox {
  const nextWidth = clamp(viewBox.width / factor, minViewWidth, width);
  const nextHeight = nextWidth * aspectRatio;
  const relativeX = (center.x - viewBox.x) / viewBox.width;
  const relativeY = (center.y - viewBox.y) / viewBox.height;

  return clampViewBox({
    x: center.x - relativeX * nextWidth,
    y: center.y - relativeY * nextHeight,
    width: nextWidth,
    height: nextHeight,
  });
}

function createFeatureViewBox(bounds: MapFeature["bounds"]): ViewBox {
  const longestSide = Math.max(bounds.width, bounds.height);
  const zoomBias =
    longestSide < 42 ? 0.48 : longestSide < 60 ? 0.58 : longestSide < 90 ? 0.72 : 0.88;
  const paddingRatio = longestSide < 60 ? 0.08 : longestSide < 110 ? 0.12 : 0.18;
  const padding = clamp(longestSide * paddingRatio, 8, 34);
  const paddedWidth = bounds.width + padding * 2;
  const paddedHeight = bounds.height + padding * 2;
  const fitWidth = Math.max(paddedWidth, paddedHeight / aspectRatio) * zoomBias;
  const nextWidth = clamp(fitWidth, minViewWidth, width);
  const nextHeight = nextWidth * aspectRatio;
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  return clampViewBox({
    x: centerX - nextWidth / 2,
    y: centerY - nextHeight / 2,
    width: nextWidth,
    height: nextHeight,
  });
}

function getSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number, viewBox: ViewBox): Point {
  const rect = svg.getBoundingClientRect();

  return {
    x: viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.width,
    y: viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.height,
  };
}

function getIconFontSize(bounds: MapFeature["bounds"], isFocused: boolean) {
  const maxSize = isFocused ? 14 : 12.5;
  return clamp(Math.min(bounds.width / 6.4, bounds.height / 4.2), 8.5, maxSize);
}

function getLabelFontSize(bounds: MapFeature["bounds"], isFocused: boolean) {
  const maxSize = isFocused ? 24 : 16;
  return clamp(Math.min(bounds.width / 5.7, bounds.height / 5.2), 10, maxSize);
}

function shouldShowLabel(zoomLevel: number, isFeatured: boolean, isFocused: boolean) {
  return isFocused || isFeatured || zoomLevel >= 2.8;
}

function getLabelYOffset(iconCount: number) {
  if (iconCount >= 3) {
    return 16;
  }

  if (iconCount >= 1) {
    return 12;
  }

  return 4;
}

function getVisibleIndustries(
  industries: MunicipalitySummary["topIndustries"],
  zoomLevel: number,
  isFeatured: boolean,
  isFocused: boolean,
) {
  if (isFocused) {
    return industries.slice(0, 3);
  }

  if (isFeatured) {
    return industries.slice(0, zoomLevel >= 1.8 ? 3 : 2);
  }

  if (zoomLevel >= 2.7) {
    return industries.slice(0, 1);
  }

  return [];
}

function getIconPositions(count: number, bounds: MapFeature["bounds"], iconDy = 0) {
  const spreadX = clamp(bounds.width * 0.16, 12, 28);
  const wideSpreadX = spreadX * 1.18;

  if (count <= 1) {
    return [{ x: 0, y: -10 + iconDy }];
  }

  if (count === 2) {
    return [
      { x: -spreadX, y: -10 + iconDy },
      { x: spreadX, y: -10 + iconDy },
    ];
  }

  return [
    { x: -wideSpreadX, y: -6 + iconDy },
    { x: 0, y: -20 + iconDy },
    { x: wideSpreadX, y: -6 + iconDy },
  ];
}

function getDistance(left: PointerSnapshot, right: PointerSnapshot) {
  return Math.hypot(right.clientX - left.clientX, right.clientY - left.clientY);
}

function getCenter(left: PointerSnapshot, right: PointerSnapshot) {
  return {
    x: (left.clientX + right.clientX) / 2,
    y: (left.clientY + right.clientY) / 2,
  };
}

function formatCount(locale: AppLocale, value: number) {
  return new Intl.NumberFormat(locale).format(value);
}

function getOverlayPlacement(marker: Point, viewBox: ViewBox): OverlayPlacement {
  const markerX = ((marker.x - viewBox.x) / viewBox.width) * 100;
  const markerY = ((marker.y - viewBox.y) / viewBox.height) * 100;
  const clampedLeft = clamp(markerX, 18, 82);
  const placeBelow = markerY < 46;
  const clampedTop = clamp(markerY + (placeBelow ? 11 : -11), 16, 84);
  const horizontalTransform = markerX > 60 ? "-100%" : markerX < 40 ? "0" : "-50%";
  const verticalTransform = placeBelow ? "0" : "-100%";

  return {
    left: `${clampedLeft}%`,
    top: `${clampedTop}%`,
    transform: `translate(${horizontalTransform}, ${verticalTransform})`,
  };
}

export function SjaellandMunicipalityMap({
  municipalities,
  locale,
  ariaLabel,
  focusedSlug,
  detailsSlug,
  detailsMunicipality,
  featuredSlugs,
  onMunicipalityPress,
  onDismissDetails,
}: {
  municipalities: MunicipalitySummary[];
  locale: AppLocale;
  ariaLabel: string;
  focusedSlug: string | null;
  detailsSlug: string | null;
  detailsMunicipality: MunicipalitySummary | null;
  featuredSlugs: string[];
  onMunicipalityPress: (slug: string) => void;
  onDismissDetails: () => void;
}) {
  const ui = uiCopy[locale];
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gestureRef = useRef<GestureState | null>(null);
  const pointersRef = useRef(new Map<number, PointerSnapshot>());
  const movedDuringGestureRef = useRef(false);
  const dismissTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [viewBox, setViewBox] = useState(initialViewBox);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const zoomLevel = width / viewBox.width;

  const features = useMemo(() => {
    const municipalityMap = new Map(municipalities.map((municipality) => [municipality.code, municipality]));

    return sjaellandMunicipalityFeatureCollection.features
      .map((feature) => {
        const municipality = municipalityMap.get(feature.properties.code);
        const pathData = path(feature as never);

        if (!municipality || !pathData) {
          return null;
        }

        const [centroidX, centroidY] = path.centroid(feature as never);
        const [[minX, minY], [maxX, maxY]] = path.bounds(feature as never);
        const tuning = labelTuning[municipality.slug] ?? {};

        return {
          municipality,
          pathData,
          marker: {
            x: centroidX + (tuning.dx ?? 0),
            y: centroidY + (tuning.dy ?? 0),
          },
          bounds: {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            area: (maxX - minX) * (maxY - minY),
          },
        } satisfies MapFeature;
      })
      .filter((value): value is NonNullable<typeof value> => Boolean(value));
  }, [municipalities]);

  const featuredSlugSet = useMemo(() => new Set(featuredSlugs), [featuredSlugs]);
  const featureMap = useMemo(
    () => new Map(features.map((feature) => [feature.municipality.slug, feature])),
    [features],
  );
  const detailsFeature = detailsSlug
    ? features.find((feature) => feature.municipality.slug === detailsSlug) ?? null
    : null;
  const detailsPlacement = detailsFeature ? getOverlayPlacement(detailsFeature.marker, viewBox) : null;

  function zoomAtCenter(factor: number) {
    setViewBox((current) =>
      scaleViewBox(current, factor, {
        x: current.x + current.width / 2,
        y: current.y + current.height / 2,
      }),
    );
  }

  function resetView() {
    gestureRef.current = null;
    pointersRef.current.clear();
    movedDuringGestureRef.current = false;
    setIsDragging(false);
    setViewBox(initialViewBox);
  }

  function activateMunicipality(slug: string) {
    const feature = featureMap.get(slug);
    if (!feature) {
      return;
    }

    if (focusedSlug !== slug) {
      setViewBox(createFeatureViewBox(feature.bounds));
    }

    onMunicipalityPress(slug);
  }

  function getMunicipalitySlugAtClientPoint(clientX: number, clientY: number) {
    const hit = document.elementFromPoint(clientX, clientY);
    if (!(hit instanceof Element)) {
      return null;
    }

    return hit.closest("[data-municipality-slug]")?.getAttribute("data-municipality-slug") ?? null;
  }

  function handleWheel(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();

    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const center = getSvgPoint(svg, event.clientX, event.clientY, viewBox);
    const factor = event.deltaY < 0 ? zoomStep : 1 / zoomStep;
    setViewBox((current) => scaleViewBox(current, factor, center));
  }

  function beginDrag(pointerId: number, snapshot: PointerSnapshot, startSlug: string | null) {
    gestureRef.current = {
      type: "drag",
      pointerId,
      startClientX: snapshot.clientX,
      startClientY: snapshot.clientY,
      startViewBox: viewBox,
      hasMoved: false,
      startSlug,
    };
    setIsDragging(false);
  }

  function beginPinch(svg: SVGSVGElement, entries: [number, PointerSnapshot][]) {
    const [leftEntry, rightEntry] = entries;
    const center = getCenter(leftEntry[1], rightEntry[1]);

    gestureRef.current = {
      type: "pinch",
      pointerIds: [leftEntry[0], rightEntry[0]],
      startDistance: getDistance(leftEntry[1], rightEntry[1]),
      startViewBox: viewBox,
      anchorWorld: getSvgPoint(svg, center.x, center.y, viewBox),
    };
    setIsDragging(true);
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const startSlug =
      event.target instanceof Element
        ? event.target.closest("[data-municipality-slug]")?.getAttribute("data-municipality-slug") ?? null
        : null;

    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    movedDuringGestureRef.current = false;

    const entries = [...pointersRef.current.entries()];
    if (entries.length === 1) {
      beginDrag(event.pointerId, entries[0][1], startSlug);
      return;
    }

    if (entries.length >= 2) {
      beginPinch(svg, entries.slice(0, 2) as [number, PointerSnapshot][]);
    }
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || !pointersRef.current.has(event.pointerId)) {
      return;
    }

    pointersRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    const gesture = gestureRef.current;
    const entries = [...pointersRef.current.entries()];

    if (!gesture) {
      return;
    }

    if (gesture.type === "drag") {
      const movedX = event.clientX - gesture.startClientX;
      const movedY = event.clientY - gesture.startClientY;
      const movedDistance = Math.hypot(movedX, movedY);

      if (!gesture.hasMoved && movedDistance < dragActivationPx) {
        return;
      }

      if (!gesture.hasMoved) {
        gesture.hasMoved = true;
        movedDuringGestureRef.current = true;
        setIsDragging(true);
      }

      const rect = svg.getBoundingClientRect();
      const deltaX = ((event.clientX - gesture.startClientX) / rect.width) * gesture.startViewBox.width;
      const deltaY = ((event.clientY - gesture.startClientY) / rect.height) * gesture.startViewBox.height;

      setViewBox(
        clampViewBox({
          ...gesture.startViewBox,
          x: gesture.startViewBox.x - deltaX,
          y: gesture.startViewBox.y - deltaY,
        }),
      );
      return;
    }

    if (entries.length < 2) {
      return;
    }

    const [leftEntry, rightEntry] = entries.slice(0, 2) as [number, PointerSnapshot][];
    const currentDistance = getDistance(leftEntry[1], rightEntry[1]);
    const currentCenter = getCenter(leftEntry[1], rightEntry[1]);
    const rect = svg.getBoundingClientRect();
    const scale = clamp(currentDistance / Math.max(gesture.startDistance, 1), 0.6, 6);
    const nextWidth = clamp(gesture.startViewBox.width / scale, minViewWidth, width);
    const nextHeight = nextWidth * aspectRatio;
    const relativeX = (currentCenter.x - rect.left) / rect.width;
    const relativeY = (currentCenter.y - rect.top) / rect.height;

    movedDuringGestureRef.current = true;

    setViewBox(
      clampViewBox({
        x: gesture.anchorWorld.x - relativeX * nextWidth,
        y: gesture.anchorWorld.y - relativeY * nextHeight,
        width: nextWidth,
        height: nextHeight,
      }),
    );
  }

  function finishPointerInteraction(event: PointerEvent<SVGSVGElement>, shouldActivate: boolean) {
    const gesture = gestureRef.current;
    const didTap =
      shouldActivate &&
      gesture?.type === "drag" &&
      gesture.pointerId === event.pointerId &&
      !gesture.hasMoved;
    const startSlug = gesture?.type === "drag" ? gesture.startSlug : null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    pointersRef.current.delete(event.pointerId);
    const remaining = [...pointersRef.current.entries()];

    if (remaining.length === 0) {
      gestureRef.current = null;
      setIsDragging(false);
      movedDuringGestureRef.current = false;

      if (didTap && startSlug) {
        const slug = getMunicipalitySlugAtClientPoint(event.clientX, event.clientY);
        if (slug && slug === startSlug) {
          activateMunicipality(slug);
        }
      }

      return;
    }

    if (remaining.length === 1) {
      beginDrag(remaining[0][0], remaining[0][1], null);
      return;
    }

    const svg = svgRef.current;
    if (svg) {
      beginPinch(svg, remaining.slice(0, 2) as [number, PointerSnapshot][]);
    }
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    finishPointerInteraction(event, true);
  }

  function handlePointerCancel(event: PointerEvent<SVGSVGElement>) {
    finishPointerInteraction(event, false);
  }

  function handleCardTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    dismissTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleCardTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = dismissTouchStartRef.current;
    const touch = event.changedTouches[0];
    dismissTouchStartRef.current = null;

    if (!start || !touch) {
      return;
    }

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (Math.abs(deltaX) > 70 || deltaY > 70) {
      onDismissDetails();
    }
  }

  return (
    <div className="absolute inset-0 overflow-hidden rounded-[1.75rem] bg-[radial-gradient(circle_at_top,#d9efe8_0%,#bfd8ce_36%,#9abdaf_100%)]">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full bg-white/88 px-2 py-2 shadow-[0_10px_30px_rgba(15,23,42,0.14)] ring-1 ring-slate-900/10 backdrop-blur sm:right-4 sm:top-4">
        <button
          type="button"
          onClick={() => zoomAtCenter(zoomStep)}
          className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
          aria-label={ui.zoomIn}
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomAtCenter(1 / zoomStep)}
          className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-200"
          aria-label={ui.zoomOut}
        >
          -
        </button>
        <button
          type="button"
          onClick={resetView}
          className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-200"
        >
          {ui.reset}
        </button>
        <span className="rounded-full bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800">
          x{zoomLevel.toFixed(1)}
        </span>
      </div>

      {detailsMunicipality && detailsPlacement ? (
        <div
          className="absolute z-20 w-[min(18rem,calc(100%-1.5rem))] rounded-[1.35rem] border border-slate-900/10 bg-white/96 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur sm:w-[20rem]"
          style={detailsPlacement}
          onTouchStart={handleCardTouchStart}
          onTouchEnd={handleCardTouchEnd}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-700">{ui.selectedEyebrow}</p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{detailsMunicipality.name}</h3>
            </div>
            <button
              type="button"
              onClick={onDismissDetails}
              className="rounded-full bg-slate-100 px-2.5 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              aria-label={ui.close}
            >
              ×
            </button>
          </div>

          <div className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {formatCount(locale, detailsMunicipality.totalJobs)} {ui.jobsSuffix}
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{ui.industriesTitle}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {detailsMunicipality.topIndustries.map((industry) => (
                <span
                  key={detailsMunicipality.slug + "-map-industry-" + industry.slug}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-white sm:text-sm"
                  style={{ backgroundColor: industry.accentColor }}
                >
                  <span>{industry.icon}</span>
                  <span>{industry.name}</span>
                  <span className="text-white/80">{formatCount(locale, industry.jobCount)}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <form action="/api/follows" method="post">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="intent" value="follow-municipality" />
              <input type="hidden" name="municipalitySlug" value={detailsMunicipality.slug} />
              <input type="hidden" name="returnTo" value={`/${locale}?focus=${detailsMunicipality.slug}`} />
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                {ui.follow}
              </button>
            </form>
            <Link
              href={`/${locale}/kommuner/${detailsMunicipality.slug}`}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
            >
              {ui.openProfile}
            </Link>
          </div>

          <p className="mt-3 text-[11px] leading-5 text-slate-500">{ui.swipeHint}</p>
        </div>
      ) : null}

      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        className={`absolute inset-0 h-full w-full ${isDragging ? "cursor-grabbing" : zoomLevel > 1.02 ? "cursor-grab" : "cursor-default"}`}
        aria-label={ariaLabel}
        role="img"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{ touchAction: "none" }}
      >
        <rect width={width} height={height} fill="transparent" />

        {features.map((feature) => {
          const { municipality, pathData } = feature;
          const isFocused = municipality.slug === focusedSlug;
          const isDetailed = municipality.slug === detailsSlug;
          const isFeatured = featuredSlugSet.has(municipality.slug);
          const isHovered = municipality.slug === hoveredSlug;
          const fillColor = isFocused
            ? municipality.topIndustries[0]?.accentColor ?? "#0f766e"
            : isFeatured
              ? municipality.topIndustries[0]?.accentColor ?? "#94a3b8"
              : "#d7dfdc";

          return (
            <path
              key={municipality.slug}
              d={pathData}
              fill={fillColor}
              fillOpacity={isDetailed ? 0.34 : isFocused ? 0.26 : isFeatured ? 0.16 : 0.1}
              stroke={isFocused ? "#0f172a" : "#475569"}
              strokeOpacity={isHovered || isFocused ? 0.78 : 0.34}
              strokeWidth={isFocused ? 2.1 : isHovered ? 1.75 : 1.3}
              className="cursor-pointer transition"
              data-municipality-slug={municipality.slug}
              onMouseEnter={() => setHoveredSlug(municipality.slug)}
              onMouseLeave={() =>
                setHoveredSlug((current) => (current === municipality.slug ? null : current))
              }
            />
          );
        })}

        <g>
          {features.map((feature) => {
            const { municipality, marker, bounds } = feature;
            const tuning = labelTuning[municipality.slug] ?? {};
            const isFocused = municipality.slug === focusedSlug;
            const isFeatured = featuredSlugSet.has(municipality.slug);
            const showLabel = shouldShowLabel(zoomLevel, isFeatured, isFocused);
            const visibleIndustries = getVisibleIndustries(
              municipality.topIndustries,
              zoomLevel,
              isFeatured,
              isFocused,
            );

            if (!showLabel && visibleIndustries.length === 0) {
              return null;
            }

            const iconScale = clamp(1 / Math.pow(zoomLevel, 0.14), 0.76, 1);
            const iconFontSize = getIconFontSize(bounds, isFocused);
            const iconPositions = getIconPositions(visibleIndustries.length, bounds, tuning.iconDy ?? 0);
            const labelFontSize = getLabelFontSize(bounds, isFocused);
            const labelY = getLabelYOffset(visibleIndustries.length);

            return (
              <g
                key={municipality.slug + "-overlay"}
                transform={`translate(${marker.x}, ${marker.y}) scale(${iconScale})`}
                data-municipality-slug={municipality.slug}
                onMouseEnter={() => setHoveredSlug(municipality.slug)}
                onMouseLeave={() =>
                  setHoveredSlug((current) => (current === municipality.slug ? null : current))
                }
                className="cursor-pointer"
              >
                {visibleIndustries.map((industry, index) => (
                  <text
                    key={municipality.slug + "-" + industry.slug + "-icon"}
                    x={iconPositions[index]?.x ?? 0}
                    y={iconPositions[index]?.y ?? 0}
                    fontSize={iconFontSize}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    opacity={isFocused ? 1 : 0.94}
                  >
                    {industry.icon}
                  </text>
                ))}

                {showLabel ? (
                  <text
                    y={labelY}
                    fontSize={labelFontSize}
                    fontWeight={isFocused ? 700 : 600}
                    textAnchor="middle"
                    dominantBaseline="hanging"
                    fill="#0f172a"
                    stroke="rgba(255,255,255,0.88)"
                    strokeWidth={2}
                    paintOrder="stroke fill"
                    letterSpacing={0.1}
                  >
                    {municipality.name}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}