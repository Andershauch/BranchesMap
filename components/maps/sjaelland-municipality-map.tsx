"use client";

import { geoMercator, geoPath } from "d3-geo";
import { useMemo, useRef, useState, type MouseEvent, type PointerEvent, type WheelEvent } from "react";

import type { MunicipalitySummary } from "@/lib/data/municipalities";
import { sjaellandMunicipalityFeatureCollection } from "@/lib/geo/sjaelland";
import type { AppLocale } from "@/lib/i18n/config";

const width = 900;
const height = 1600;
const aspectRatio = height / width;
const initialViewBox = { x: 0, y: 0, width, height };
const minViewWidth = width / 13;
const zoomStep = 1.22;
const mapLabelFontFamily =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const labelTuning: Record<
  string,
  {
    dx?: number;
    dy?: number;
    iconDy?: number;
    nameDy?: number;
    forceName?: boolean;
    minZoomForName?: number;
  }
> = {
  albertslund: { dx: -12, dy: 2, minZoomForName: 2.3 },
  ballerup: { dx: -10, dy: -8, minZoomForName: 2.2 },
  brondby: { dx: -10, dy: 6, minZoomForName: 2.35 },
  dragor: { dx: 12, dy: 14, nameDy: 1, minZoomForName: 2.15 },
  frederiksberg: { dx: -2, dy: 0, minZoomForName: 2.65 },
  gentofte: { dx: 12, dy: -8, minZoomForName: 2.7 },
  gladsaxe: { dx: 8, dy: -10, minZoomForName: 2.55 },
  glostrup: { dx: -6, dy: -6, minZoomForName: 2.45 },
  herlev: { dx: -2, dy: -10, minZoomForName: 2.55 },
  helsingor: { dx: 10, dy: -10 },
  hillerod: { dx: 0, dy: 4 },
  holbaek: { dx: 0, dy: 4 },
  horsholm: { dx: 10, dy: -10, minZoomForName: 2.55 },
  hvidovre: { dx: -8, dy: 10, minZoomForName: 2.45 },
  ishoj: { dx: -8, dy: 10, minZoomForName: 2.45 },
  kobenhavn: { dx: 10, dy: -4, iconDy: -1, forceName: true },
  koge: { dx: 8, dy: 10 },
  kalundborg: { dx: -8, dy: 6 },
  "lyngby-taarbaek": { dx: 8, dy: -12, minZoomForName: 2.7 },
  naestved: { dx: 0, dy: 12 },
  greve: { dx: 10, dy: 14 },
  "hoje-taastrup": { dx: -12, dy: 14, forceName: true },
  rodovre: { dx: -10, dy: -4, minZoomForName: 2.45 },
  ringsted: { dx: 0, dy: 4 },
  roskilde: { dx: -8, dy: -4 },
  soro: { dx: -8, dy: 0 },
  slagelse: { dx: -8, dy: 8 },
  stevns: { dx: 12, dy: 10 },
  taarnby: { dx: 8, dy: 10, minZoomForName: 2.55 },
  vallensbaek: { dx: -12, dy: 8, minZoomForName: 2.6 },
  vordingborg: { dx: 0, dy: -10, forceName: true },
};

const uiCopy: Record<
  AppLocale,
  {
    zoomIn: string;
    zoomOut: string;
    reset: string;
    header: string;
    hint: string;
  }
> = {
  da: {
    zoomIn: "Zoom ind",
    zoomOut: "Zoom ud",
    reset: "Nulstil",
    header: "Hovedkort",
    hint: "Brug fingre eller mus til at panorere og zoome. Tryk én gang for fokus. Tryk igen på samme kommune for at vise data.",
  },
  en: {
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    reset: "Reset",
    header: "Home map",
    hint: "Use touch or mouse to pan and zoom. Tap once to focus. Tap the same municipality again to show data.",
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

type LabelMode = "hidden" | "name-only" | "compact" | "full";

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

function splitMunicipalityName(name: string) {
  if (name.length <= 12) {
    return [name];
  }

  if (name.includes("-")) {
    return name.split("-");
  }

  if (name.includes(" ")) {
    return name.split(" ");
  }

  return [name];
}

function getNameFontSize(bounds: MapFeature["bounds"], lineLength: number, mode: LabelMode) {
  const maxSize = mode === "full" ? 12.5 : mode === "compact" ? 11.25 : 10.5;

  return clamp(
    Math.min(bounds.width / Math.max(lineLength * 0.92, 1), bounds.height / 4.8),
    7,
    maxSize,
  );
}

function getIconFontSize(bounds: MapFeature["bounds"], mode: LabelMode) {
  const maxSize = mode === "full" ? 13.5 : 11.5;
  return clamp(Math.min(bounds.width / 6.8, bounds.height / 4.5), 8, maxSize);
}

function getLabelScale(zoomLevel: number) {
  return clamp(1 / Math.pow(zoomLevel, 0.18), 0.78, 1);
}

function getLabelMode(
  bounds: MapFeature["bounds"],
  zoomLevel: number,
  isFeatured: boolean,
  isFocused: boolean,
  tuning?: { forceName?: boolean; minZoomForName?: number },
): LabelMode {
  const minZoomForName = tuning?.minZoomForName ?? 2.3;

  if (isFocused) {
    if (zoomLevel >= 2.5) return "full";
    if (zoomLevel >= 1.5) return "compact";
    return "name-only";
  }

  if (isFeatured) {
    if (zoomLevel >= 2.6 && bounds.area >= 2200) return "full";
    if (zoomLevel >= 1.7 && bounds.area >= 1800) return "compact";
    return "name-only";
  }

  if (zoomLevel >= 3.1 && bounds.area >= 2600) {
    return "compact";
  }

  if (zoomLevel >= minZoomForName && bounds.area >= 1500) {
    return "name-only";
  }

  return tuning?.forceName && zoomLevel >= 1.5 ? "name-only" : "hidden";
}

function getVisibleIndustries(
  industries: MunicipalitySummary["topIndustries"],
  zoomLevel: number,
  mode: LabelMode,
  isFocused: boolean,
) {
  if (zoomLevel < 1.7) {
    return [];
  }

  if (mode === "full") {
    return industries.slice(0, zoomLevel >= 2.8 ? (isFocused ? 3 : 2) : 2);
  }

  if (mode === "compact") {
    return industries.slice(0, 1);
  }

  return [];
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

export function SjaellandMunicipalityMap({
  municipalities,
  locale,
  ariaLabel,
  focusedSlug,
  detailsSlug,
  featuredSlugs,
  onMunicipalityPress,
}: {
  municipalities: MunicipalitySummary[];
  locale: AppLocale;
  ariaLabel: string;
  focusedSlug: string | null;
  detailsSlug: string | null;
  featuredSlugs: string[];
  onMunicipalityPress: (slug: string) => void;
}) {
  const ui = uiCopy[locale];
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gestureRef = useRef<GestureState | null>(null);
  const pointersRef = useRef(new Map<number, PointerSnapshot>());
  const movedDuringGestureRef = useRef(false);
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

  function handleMunicipalityClick(event: MouseEvent<SVGGElement | SVGPathElement>, feature: MapFeature) {
    event.preventDefault();
    event.stopPropagation();

    if (movedDuringGestureRef.current) {
      movedDuringGestureRef.current = false;
      return;
    }

    if (focusedSlug !== feature.municipality.slug) {
      setViewBox(createFeatureViewBox(feature.bounds));
    }

    onMunicipalityPress(feature.municipality.slug);
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

  function beginDrag(pointerId: number, snapshot: PointerSnapshot) {
    gestureRef.current = {
      type: "drag",
      pointerId,
      startClientX: snapshot.clientX,
      startClientY: snapshot.clientY,
      startViewBox: viewBox,
    };
    setIsDragging(true);
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

    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    movedDuringGestureRef.current = false;

    const entries = [...pointersRef.current.entries()];
    if (entries.length === 1) {
      beginDrag(event.pointerId, entries[0][1]);
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
      const rect = svg.getBoundingClientRect();
      const deltaX = ((event.clientX - gesture.startClientX) / rect.width) * gesture.startViewBox.width;
      const deltaY = ((event.clientY - gesture.startClientY) / rect.height) * gesture.startViewBox.height;

      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        movedDuringGestureRef.current = true;
      }

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

  function endPointerInteraction(event: PointerEvent<SVGSVGElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    pointersRef.current.delete(event.pointerId);
    const remaining = [...pointersRef.current.entries()];

    if (remaining.length === 0) {
      gestureRef.current = null;
      setIsDragging(false);
      return;
    }

    if (remaining.length === 1) {
      beginDrag(remaining[0][0], remaining[0][1]);
      return;
    }

    const svg = svgRef.current;
    if (svg) {
      beginPinch(svg, remaining.slice(0, 2) as [number, PointerSnapshot][]);
    }
  }

  return (
    <div className="absolute inset-0 overflow-hidden rounded-[1.75rem] bg-[radial-gradient(circle_at_top,#d9efe8_0%,#bfd8ce_36%,#9abdaf_100%)]">
      <div className="absolute left-3 top-3 z-10 rounded-full bg-white/85 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-800 shadow-[0_10px_30px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/10 backdrop-blur sm:left-4 sm:top-4">
        {ui.header}
      </div>

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

      <div className="absolute bottom-3 left-3 right-3 z-10 rounded-[1rem] bg-white/82 px-4 py-3 text-xs leading-5 text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/10 backdrop-blur sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-sm">
        {ui.hint}
      </div>

      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        className={`absolute inset-0 h-full w-full ${isDragging ? "cursor-grabbing" : zoomLevel > 1.02 ? "cursor-grab" : "cursor-default"}`}
        aria-label={ariaLabel}
        role="img"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointerInteraction}
        onPointerCancel={endPointerInteraction}
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
              onClick={(event) => handleMunicipalityClick(event, feature)}
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
            const labelMode = getLabelMode(bounds, zoomLevel, isFeatured, isFocused, tuning);
            const visibleIndustries = getVisibleIndustries(
              municipality.topIndustries,
              zoomLevel,
              labelMode,
              isFocused,
            );
            const showName = labelMode !== "hidden";
            const showIcons = visibleIndustries.length > 0;

            if (!showName && !showIcons) {
              return null;
            }

            const nameLines = splitMunicipalityName(municipality.name);
            const longestLine = nameLines.reduce((longest, line) => Math.max(longest, line.length), 0);
            const labelScale = getLabelScale(zoomLevel);
            const nameFontSize = getNameFontSize(bounds, longestLine, labelMode);
            const iconFontSize = getIconFontSize(bounds, labelMode);
            const iconGap = Math.max(10, iconFontSize * 0.86);
            const iconStartX = -((visibleIndustries.length - 1) * iconGap) / 2;
            const iconY = showIcons && showName ? -8 + (tuning.iconDy ?? 0) : 0;
            const nameBaseY = (showIcons ? iconY + iconFontSize * 0.95 : 0) + 8 + (tuning.nameDy ?? 0);

            return (
              <g
                key={municipality.slug + "-label"}
                transform={`translate(${marker.x}, ${marker.y}) scale(${labelScale})`}
                onClick={(event) => handleMunicipalityClick(event, feature)}
                onMouseEnter={() => setHoveredSlug(municipality.slug)}
                onMouseLeave={() =>
                  setHoveredSlug((current) => (current === municipality.slug ? null : current))
                }
                className="cursor-pointer"
              >
                {showIcons
                  ? visibleIndustries.map((industry, index) => (
                      <text
                        key={municipality.slug + "-" + industry.slug + "-icon"}
                        x={iconStartX + index * iconGap}
                        y={iconY}
                        fontSize={iconFontSize}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        opacity={0.95}
                      >
                        {industry.icon}
                      </text>
                    ))
                  : null}
                {showName ? (
                  <text
                    x="0"
                    y={nameBaseY}
                    textAnchor="middle"
                    fontFamily={mapLabelFontFamily}
                    fontSize={nameFontSize}
                    fontWeight="600"
                    letterSpacing="-0.08"
                    fill={isFocused ? municipality.topIndustries[0]?.accentColor ?? "#0f766e" : "#0f172a"}
                    stroke="rgba(255,255,255,0.88)"
                    strokeWidth={1.35}
                    strokeLinejoin="round"
                    paintOrder="stroke"
                  >
                    {nameLines.map((line, index) => (
                      <tspan
                        key={municipality.slug + "-label-" + line}
                        x="0"
                        dy={index === 0 ? 0 : nameFontSize * 0.96}
                      >
                        {line}
                      </tspan>
                    ))}
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