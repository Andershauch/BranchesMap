"use client";

import { geoMercator, geoPath } from "d3-geo";
import { useRef, useState, type PointerEvent, type WheelEvent } from "react";

import type { MunicipalitySummary } from "@/lib/data/municipalities";
import { sjaellandMunicipalityFeatureCollection } from "@/lib/geo/sjaelland";
import { type AppLocale } from "@/lib/i18n/config";

const width = 900;
const height = 980;
const aspectRatio = height / width;
const initialViewBox = { x: 0, y: 0, width, height };
const minViewWidth = width / 3.6;
const zoomStep = 1.22;

const markerOffsets: Record<string, { dx: number; dy: number }> = {
  albertslund: { dx: -18, dy: 4 },
  ballerup: { dx: -14, dy: -10 },
  brondby: { dx: -15, dy: 8 },
  dragor: { dx: 18, dy: 18 },
  frederiksberg: { dx: -10, dy: -2 },
  gentofte: { dx: 16, dy: -12 },
  gladsaxe: { dx: 8, dy: -14 },
  glostrup: { dx: -10, dy: -10 },
  herlev: { dx: -2, dy: -14 },
  hvidovre: { dx: -6, dy: 10 },
  "hoje-taastrup": { dx: -14, dy: 8 },
  horsholm: { dx: 12, dy: -10 },
  ishoj: { dx: -10, dy: 12 },
  kobenhavn: { dx: 16, dy: -6 },
  "lyngby-taarbaek": { dx: 8, dy: -16 },
  rodovre: { dx: -14, dy: -8 },
  taarnby: { dx: 14, dy: 10 },
  vallensbaek: { dx: -18, dy: 12 },
};

const uiCopy: Record<
  AppLocale,
  {
    zoomIn: string;
    zoomOut: string;
    reset: string;
    hint: string;
  }
> = {
  da: {
    zoomIn: "Zoom ind",
    zoomOut: "Zoom ud",
    reset: "Nulstil",
    hint: "Brug knapperne eller musehjulet til at zoome. Når du er zoomet ind, kan du trække kortet rundt.",
  },
  en: {
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    reset: "Reset",
    hint: "Use the buttons or your mouse wheel to zoom. Once zoomed in, you can drag the map around.",
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

export function SjaellandMunicipalityMap({
  municipalities,
  locale,
  ariaLabel,
}: {
  municipalities: MunicipalitySummary[];
  locale: AppLocale;
  ariaLabel: string;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [viewBox, setViewBox] = useState(initialViewBox);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const municipalityMap = new Map(
    municipalities.map((municipality) => [municipality.code, municipality]),
  );
  const zoomLevel = width / viewBox.width;
  const ui = uiCopy[locale];

  const features = sjaellandMunicipalityFeatureCollection.features
    .map((feature) => {
      const municipality = municipalityMap.get(feature.properties.code);
      const pathData = path(feature as never);

      if (!municipality || !pathData) {
        return null;
      }

      const [cx, cy] = path.centroid(feature as never);
      const offset = markerOffsets[municipality.slug] ?? { dx: 0, dy: 0 };

      return {
        municipality,
        pathData,
        marker: {
          x: cx + offset.dx,
          y: cy + offset.dy,
        },
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

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

        {features.map(({ municipality, pathData, marker }) => {
          const isHighlighted = hoveredSlug === municipality.slug;
          const showName = isHighlighted || zoomLevel >= 1.8;
          const iconCount = municipality.topIndustries.length;
          const badgeWidth = showName
            ? Math.max(86, municipality.name.length * 7.4 + 28)
            : Math.max(52, iconCount * 16 + 18);
          const badgeHeight = showName ? 38 : 24;
          const iconY = showName ? -4 : 4;
          const iconStartX = -((iconCount - 1) * 14) / 2;

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
                fill={municipality.topIndustries[0]?.accentColor ?? "#94a3b8"}
                fillOpacity={isHighlighted ? 0.38 : 0.22}
                stroke="#0f172a"
                strokeOpacity={isHighlighted ? 0.44 : 0.28}
                strokeWidth={isHighlighted ? 1.6 : 1.2}
              />
              <g transform={`translate(${marker.x}, ${marker.y})`} style={{ pointerEvents: "none" }}>
                <rect
                  x={-badgeWidth / 2}
                  y={showName ? -18 : -12}
                  width={badgeWidth}
                  height={badgeHeight}
                  rx={badgeHeight / 2}
                  fill="rgba(255,255,255,0.94)"
                  stroke="rgba(15,23,42,0.14)"
                  strokeWidth="1"
                />
                {municipality.topIndustries.map((industry, index) => (
                  <text
                    key={`${municipality.slug}-${industry.slug}-icon`}
                    x={iconStartX + index * 14}
                    y={iconY}
                    fontSize="12"
                    textAnchor="middle"
                  >
                    {industry.icon}
                  </text>
                ))}
                {showName ? (
                  <text
                    x="0"
                    y="12"
                    textAnchor="middle"
                    fontSize="10.5"
                    fontWeight="600"
                    fill="#0f172a"
                  >
                    {municipality.name}
                  </text>
                ) : null}
              </g>
            </a>
          );
        })}
      </svg>
    </div>
  );
}