"use client";

import { useSearchParams } from "next/navigation";
import { geoMercator, geoPath } from "d3-geo";
import { useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react";

import type { MunicipalitySummary } from "@/lib/data/municipalities";
import { sjaellandMunicipalityFeatureCollection } from "@/lib/geo/sjaelland";
import { type AppLocale } from "@/lib/i18n/config";

const width = 900;
const height = 980;
const aspectRatio = height / width;
const initialViewBox = { x: 0, y: 0, width, height };
const minViewWidth = width / 3.6;
const zoomStep = 1.22;

const labelTuning: Record<
  string,
  {
    dx?: number;
    dy?: number;
    iconDy?: number;
    nameDy?: number;
    forceName?: boolean;
    hideNameUntilZoom?: boolean;
  }
> = {
  albertslund: { dx: -12, dy: 2, hideNameUntilZoom: true },
  ballerup: { dx: -10, dy: -8, hideNameUntilZoom: true },
  brondby: { dx: -10, dy: 6, hideNameUntilZoom: true },
  dragor: { dx: 10, dy: 14, nameDy: 2 },
  frederiksberg: { dx: -3, dy: 0, hideNameUntilZoom: true },
  fredrikstad: {},
  gentofte: { dx: 12, dy: -10, hideNameUntilZoom: true },
  gladsaxe: { dx: 8, dy: -10, hideNameUntilZoom: true },
  glostrup: { dx: -6, dy: -6, hideNameUntilZoom: true },
  herlev: { dx: -2, dy: -10, hideNameUntilZoom: true },
  hvidovre: { dx: -8, dy: 10, hideNameUntilZoom: true },
  "hoje-taastrup": { dx: -10, dy: 6, nameDy: 2 },
  horsholm: { dx: 10, dy: -10, hideNameUntilZoom: true },
  ishoj: { dx: -8, dy: 10, hideNameUntilZoom: true },
  kobenhavn: { dx: 10, dy: -4, iconDy: -2, forceName: true },
  "lyngby-taarbaek": { dx: 6, dy: -12, hideNameUntilZoom: true },
  rodovre: { dx: -10, dy: -4, hideNameUntilZoom: true },
  taarnby: { dx: 8, dy: 8, hideNameUntilZoom: true },
  vallensbaek: { dx: -12, dy: 8, hideNameUntilZoom: true },
};

const uiCopy: Record<
  AppLocale,
  {
    zoomIn: string;
    zoomOut: string;
    reset: string;
    hint: string;
    debugBadge: string;
    debugHint: string;
    debugFocusLabel: string;
    debugAllLabel: string;
  }
> = {
  da: {
    zoomIn: "Zoom ind",
    zoomOut: "Zoom ud",
    reset: "Nulstil",
    hint: "Brug knapperne eller musehjulet til at zoome. Når du er zoomet ind, kan du trække kortet rundt.",
    debugBadge: "Kort-debug aktiv",
    debugHint: "Debug viser centroid, bounding box og gør det muligt at isolere én kommune via URL-parametre.",
    debugFocusLabel: "Fokus",
    debugAllLabel: "Alle kommuner",
  },
  en: {
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    reset: "Reset",
    hint: "Use the buttons or your mouse wheel to zoom. Once zoomed in, you can drag the map around.",
    debugBadge: "Map debug enabled",
    debugHint: "Debug shows centroids, bounding boxes, and lets us isolate a municipality through URL params.",
    debugFocusLabel: "Focus",
    debugAllLabel: "All municipalities",
  },
};

const projection = geoMercator().fitExtent(
  [
    [24, 24],
    [width - 24, height - 24],
  ],
  sjaellandMunicipalityFeatureCollection as never,
);

const path = geoPath(projection);

type ViewBox = typeof initialViewBox;

type Point = {
  x: number;
  y: number;
};

type DragState = {
  pointerId: number;
  clientX: number;
  clientY: number;
  viewBox: ViewBox;
};

type MapFeature = {
  municipality: MunicipalitySummary;
  pathData: string;
  marker: Point;
  centroid: Point;
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

function getSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number, viewBox: ViewBox): Point {
  const rect = svg.getBoundingClientRect();

  return {
    x: viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.width,
    y: viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.height,
  };
}

function formatDebugNumber(value: number) {
  return value.toFixed(1);
}

function isDebugEnabled(value: string | null) {
  return value === "1" || value === "true" || value === "yes";
}

function getNameFontSize(bounds: MapFeature["bounds"], lineLength: number, mode: LabelMode) {
  const maxSize = mode === "full" ? 16 : mode === "compact" ? 14 : 12;

  return clamp(
    Math.min(bounds.width / Math.max(lineLength * 0.66, 1), bounds.height / 3.2),
    8,
    maxSize,
  );
}

function getIconFontSize(bounds: MapFeature["bounds"], mode: LabelMode) {
  const base = mode === "full" ? 17 : mode === "compact" ? 15 : 12;
  return clamp(Math.min(bounds.width / 4.8, bounds.height / 2.8), 10, base);
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

function getLabelMode(
  bounds: MapFeature["bounds"],
  zoomLevel: number,
  isHighlighted: boolean,
  hasFocusedFeature: boolean,
  tuning?: { forceName?: boolean; hideNameUntilZoom?: boolean },
): LabelMode {
  if (isHighlighted || hasFocusedFeature) {
    return bounds.area >= 2600 ? "full" : "compact";
  }

  if (zoomLevel >= 2.8) {
    return bounds.area >= 2200 ? "full" : "compact";
  }

  if (zoomLevel >= 1.9) {
    if (bounds.area >= 5200) return "full";
    if (bounds.area >= 1800) return "compact";
    return tuning?.forceName ? "name-only" : "hidden";
  }

  if (zoomLevel >= 1.35) {
    if (bounds.area >= 8500) return "full";
    if (bounds.area >= 4200) return "compact";
    if (bounds.area >= 2200 && !tuning?.hideNameUntilZoom) return "name-only";
    return tuning?.forceName ? "name-only" : "hidden";
  }

  if (bounds.area >= 12000) return "full";
  if (bounds.area >= 5200) return "compact";
  if (bounds.area >= 3000 && !tuning?.hideNameUntilZoom) return "name-only";
  return tuning?.forceName ? "name-only" : "hidden";
}

function getVisibleIndustries(
  industries: MunicipalitySummary["topIndustries"],
  mode: LabelMode,
) {
  if (mode === "full") {
    return industries.slice(0, 3);
  }

  if (mode === "compact") {
    return industries.slice(0, 1);
  }

  return [];
}

export function SjaellandMunicipalityMap({
  municipalities,
  locale,
  ariaLabel,
}: {
  municipalities: MunicipalitySummary[];
  locale: AppLocale;
  ariaLabel: string;
}) {
  const searchParams = useSearchParams();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [viewBox, setViewBox] = useState(initialViewBox);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const zoomLevel = width / viewBox.width;
  const ui = uiCopy[locale];
  const debugMode = isDebugEnabled(searchParams.get("mapDebug"));
  const normalizedDebugSlug = searchParams.get("debugMunicipality")?.trim().toLowerCase() ?? null;

  const features = useMemo(() => {
    const municipalityMap = new Map(
      municipalities.map((municipality) => [municipality.code, municipality]),
    );

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
          centroid: {
            x: centroidX,
            y: centroidY,
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

  const focusedFeature = normalizedDebugSlug
    ? features.find((feature) => feature.municipality.slug === normalizedDebugSlug) ?? null
    : null;

  function zoomAtCenter(factor: number) {
    setViewBox((current) =>
      scaleViewBox(current, factor, {
        x: current.x + current.width / 2,
        y: current.y + current.height / 2,
      }),
    );
  }

  function resetView() {
    setViewBox(initialViewBox);
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

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    if (zoomLevel <= 1.02 || event.pointerType === "touch") {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      viewBox,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const dragState = dragStateRef.current;
    const svg = svgRef.current;

    if (!dragState || !svg || dragState.pointerId !== event.pointerId) {
      return;
    }

    const rect = svg.getBoundingClientRect();
    const deltaX = ((event.clientX - dragState.clientX) / rect.width) * dragState.viewBox.width;
    const deltaY = ((event.clientY - dragState.clientY) / rect.height) * dragState.viewBox.height;

    setViewBox(
      clampViewBox({
        ...dragState.viewBox,
        x: dragState.viewBox.x - deltaX,
        y: dragState.viewBox.y - deltaY,
      }),
    );
  }

  function endPointerInteraction(event?: PointerEvent<SVGSVGElement>) {
    if (event && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragStateRef.current = null;
    setIsDragging(false);
  }

  return (
    <div className="relative aspect-[9/10] overflow-hidden rounded-[1.75rem] bg-[radial-gradient(circle_at_top,#d9efe8_0%,#bfd8ce_34%,#9abdaf_100%)] sm:aspect-[9/8]">
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

      {debugMode ? (
        <div className="absolute left-3 top-3 z-10 max-w-sm rounded-[1rem] bg-slate-950/88 px-4 py-3 text-xs leading-5 text-white shadow-[0_10px_30px_rgba(15,23,42,0.22)] ring-1 ring-white/10 backdrop-blur sm:left-4 sm:top-4">
          <p className="font-semibold text-emerald-300">{ui.debugBadge}</p>
          <p className="mt-1 text-white/80">{ui.debugHint}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full bg-white/10 px-3 py-1">features: {features.length}</span>
            <span className="rounded-full bg-white/10 px-3 py-1">zoom: x{zoomLevel.toFixed(1)}</span>
            <span className="rounded-full bg-white/10 px-3 py-1">
              {ui.debugFocusLabel}: {focusedFeature?.municipality.name ?? ui.debugAllLabel}
            </span>
          </div>
          {focusedFeature ? (
            <div className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-[11px] text-white/85">
              <div>{focusedFeature.municipality.name}</div>
              <div>
                centroid: {formatDebugNumber(focusedFeature.centroid.x)}, {formatDebugNumber(focusedFeature.centroid.y)}
              </div>
              <div>
                bounds: {formatDebugNumber(focusedFeature.bounds.width)} x {formatDebugNumber(focusedFeature.bounds.height)}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

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
        style={{ touchAction: zoomLevel > 1.02 ? "none" : "pan-y" }}
      >
        <rect width={width} height={height} fill="transparent" />
        <defs>
          {features.map(({ municipality, pathData }) => (
            <clipPath
              key={`${municipality.slug}-clip`}
              id={`municipality-clip-${municipality.slug}`}
            >
              <path d={pathData} />
            </clipPath>
          ))}
        </defs>

        {features.map((feature) => {
          const { municipality, pathData, marker, centroid, bounds } = feature;
          const tuning = labelTuning[municipality.slug] ?? {};
          const isFocused = !focusedFeature || focusedFeature.municipality.slug === municipality.slug;
          const isHighlighted =
            hoveredSlug === municipality.slug || focusedFeature?.municipality.slug === municipality.slug;
          const labelMode = getLabelMode(
            bounds,
            zoomLevel,
            isHighlighted,
            Boolean(focusedFeature),
            tuning,
          );
          const visibleIndustries = getVisibleIndustries(
            municipality.topIndustries,
            labelMode,
          );
          const showName = labelMode !== "hidden";
          const showIcons = visibleIndustries.length > 0;
          const nameLines = splitMunicipalityName(municipality.name);
          const longestLine = nameLines.reduce(
            (longest, line) => Math.max(longest, line.length),
            0,
          );
          const nameFontSize = getNameFontSize(bounds, longestLine, labelMode);
          const iconFontSize = getIconFontSize(bounds, labelMode);
          const iconGap = Math.max(12, iconFontSize * 0.88);
          const iconStartX = -((visibleIndustries.length - 1) * iconGap) / 2;
          const iconY =
            showIcons && showName
              ? -(nameLines.length === 1 ? 7 : 10) + (tuning.iconDy ?? 0)
              : (tuning.iconDy ?? 0);
          const nameBaseY =
            (showIcons ? iconY + iconFontSize * 1.05 : 0) + (tuning.nameDy ?? 0);

          return (
            <a
              key={municipality.slug}
              href={`/${locale}/kommuner/${municipality.slug}`}
              onMouseEnter={() => setHoveredSlug(municipality.slug)}
              onMouseLeave={() =>
                setHoveredSlug((current) => (current === municipality.slug ? null : current))
              }
              onFocus={() => setHoveredSlug(municipality.slug)}
              onBlur={() =>
                setHoveredSlug((current) => (current === municipality.slug ? null : current))
              }
            >
              <title>{municipality.name}</title>
              <path
                d={pathData}
                fill={isFocused ? municipality.topIndustries[0]?.accentColor ?? "#94a3b8" : "#cbd5e1"}
                fillOpacity={isHighlighted ? 0.4 : isFocused ? 0.22 : 0.08}
                stroke="#0f172a"
                strokeOpacity={isHighlighted ? 0.44 : isFocused ? 0.28 : 0.12}
                strokeWidth={isHighlighted ? 1.6 : 1.2}
              />
              {debugMode ? (
                <g style={{ pointerEvents: "none" }}>
                  <rect
                    x={bounds.x}
                    y={bounds.y}
                    width={bounds.width}
                    height={bounds.height}
                    fill="none"
                    stroke={isFocused ? "#06b6d4" : "#94a3b8"}
                    strokeDasharray="6 4"
                    strokeOpacity={isFocused ? 0.75 : 0.35}
                    strokeWidth="1"
                  />
                  <circle
                    cx={centroid.x}
                    cy={centroid.y}
                    r={4}
                    fill={isFocused ? "#ef4444" : "#94a3b8"}
                    fillOpacity={0.85}
                  />
                </g>
              ) : null}
              <g
                clipPath={`url(#municipality-clip-${municipality.slug})`}
                style={{ pointerEvents: "none" }}
              >
                <g transform={`translate(${marker.x}, ${marker.y})`}>
                  {showIcons
                    ? visibleIndustries.map((industry, index) => (
                        <text
                          key={`${municipality.slug}-${industry.slug}-icon`}
                          x={iconStartX + index * iconGap}
                          y={iconY}
                          fontSize={iconFontSize}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          {industry.icon}
                        </text>
                      ))
                    : null}
                  {showName ? (
                    <>
                      <text
                        x="0"
                        y={nameBaseY}
                        textAnchor="middle"
                        fontSize={nameFontSize}
                        fontWeight="700"
                        fill="#0f172a"
                        stroke="rgba(247,245,239,0.92)"
                        strokeWidth={showIcons ? 3.2 : 2.8}
                        strokeLinejoin="round"
                        paintOrder="stroke"
                      >
                        {nameLines.map((line, index) => (
                          <tspan
                            key={`${municipality.slug}-label-shadow-${line}`}
                            x="0"
                            dy={index === 0 ? 0 : nameFontSize + 1.2}
                          >
                            {line}
                          </tspan>
                        ))}
                      </text>
                      <text
                        x="0"
                        y={nameBaseY}
                        textAnchor="middle"
                        fontSize={nameFontSize}
                        fontWeight="700"
                        fill="#0f172a"
                      >
                        {nameLines.map((line, index) => (
                          <tspan
                            key={`${municipality.slug}-label-fill-${line}`}
                            x="0"
                            dy={index === 0 ? 0 : nameFontSize + 1.2}
                          >
                            {line}
                          </tspan>
                        ))}
                      </text>
                    </>
                  ) : null}
                </g>
              </g>
            </a>
          );
        })}
      </svg>
    </div>
  );
}