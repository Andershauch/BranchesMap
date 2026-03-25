"use client";

import { geoMercator, geoPath } from "d3-geo";
import { useMemo } from "react";

import type { MunicipalitySummary } from "@/lib/data/municipalities";
import { sjaellandMunicipalityFeatureCollection } from "@/lib/geo/sjaelland";
import type { AppLocale } from "@/lib/i18n/config";

const width = 900;
const height = 1600;
const initialViewBox = { x: 0, y: 0, width, height };
const minViewWidth = width / 10.5;
const aspectRatio = height / width;
const mapLabelFontFamily =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const labelTuning: Record<
  string,
  {
    dx?: number;
    dy?: number;
    iconDy?: number;
    nameDy?: number;
  }
> = {
  helsingor: { dx: 10, dy: -10 },
  hillerod: { dx: 0, dy: 4 },
  holbaek: { dx: 0, dy: 4 },
  roskilde: { dx: -8, dy: -4 },
  "hoje-taastrup": { dx: -12, dy: 14 },
  greve: { dx: 10, dy: 14 },
  koge: { dx: 8, dy: 10 },
  ringsted: { dx: 0, dy: 4 },
  soro: { dx: -8, dy: 0 },
  naestved: { dx: 0, dy: 12 },
  slagelse: { dx: -8, dy: 8 },
  kalundborg: { dx: -8, dy: 6 },
  stevns: { dx: 12, dy: 10 },
  vordingborg: { dx: 0, dy: -10 },
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

type MapFeature = {
  municipality: MunicipalitySummary;
  pathData: string;
  marker: {
    x: number;
    y: number;
  };
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
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

function createFeatureViewBox(bounds: MapFeature["bounds"]): ViewBox {
  const longestSide = Math.max(bounds.width, bounds.height);
  const zoomBias =
    longestSide < 42 ? 0.42 : longestSide < 60 ? 0.52 : longestSide < 90 ? 0.64 : 0.82;
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
  focusedSlug: string;
  detailsSlug: string | null;
  featuredSlugs: string[];
  onMunicipalityPress: (slug: string) => void;
}) {
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
          bounds: {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
          },
        } satisfies MapFeature;
      })
      .filter((value): value is NonNullable<typeof value> => Boolean(value));
  }, [municipalities]);

  const featuredSlugSet = useMemo(() => new Set(featuredSlugs), [featuredSlugs]);
  const focusedFeature = features.find((feature) => feature.municipality.slug === focusedSlug) ?? null;
  const viewBox = focusedFeature ? createFeatureViewBox(focusedFeature.bounds) : initialViewBox;
  const labelFeatures = features.filter(
    (feature) => featuredSlugSet.has(feature.municipality.slug) || feature.municipality.slug === focusedSlug,
  );

  return (
    <div className="absolute inset-0 overflow-hidden rounded-[1.75rem] bg-[radial-gradient(circle_at_top,#d9efe8_0%,#bfd8ce_36%,#9abdaf_100%)]">
      <div className="absolute left-3 top-3 z-10 rounded-full bg-white/85 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-800 shadow-[0_10px_30px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/10 backdrop-blur sm:left-4 sm:top-4">
        {locale === "da" ? "Hovedkort" : "Home map"}
      </div>

      <svg
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        className="h-full w-full transition-[viewBox] duration-500 ease-out"
        aria-label={ariaLabel}
        role="img"
      >
        <rect width={width} height={height} fill="transparent" />

        {features.map((feature) => {
          const { municipality, pathData } = feature;
          const isFocused = municipality.slug === focusedSlug;
          const isDetailed = municipality.slug === detailsSlug;
          const isFeatured = featuredSlugSet.has(municipality.slug);
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
              fillOpacity={isDetailed ? 0.36 : isFocused ? 0.28 : isFeatured ? 0.17 : 0.11}
              stroke={isFocused ? "#0f172a" : "#475569"}
              strokeOpacity={isFocused ? 0.82 : 0.35}
              strokeWidth={isFocused ? 2.2 : 1.35}
              className="cursor-pointer transition"
              onClick={() => onMunicipalityPress(municipality.slug)}
            />
          );
        })}

        {labelFeatures.map((feature) => {
          const { municipality, marker } = feature;
          const isFocused = municipality.slug === focusedSlug;
          const isDetailed = municipality.slug === detailsSlug;
          const nameLines = splitMunicipalityName(municipality.name);
          const labelColor = isFocused ? municipality.topIndustries[0]?.accentColor ?? "#0f766e" : "#0f172a";
          const visibleIndustries = municipality.topIndustries.slice(0, isFocused ? 3 : 2);
          const iconGap = 26;
          const iconStartX = -((visibleIndustries.length - 1) * iconGap) / 2;
          const iconY = -18 + ((labelTuning[municipality.slug] ?? {}).iconDy ?? 0);
          const nameY = 8 + ((labelTuning[municipality.slug] ?? {}).nameDy ?? 0);

          return (
            <g
              key={municipality.slug + "-label"}
              transform={`translate(${marker.x}, ${marker.y})`}
              onClick={() => onMunicipalityPress(municipality.slug)}
              className="cursor-pointer"
            >
              {visibleIndustries.map((industry, index) => (
                <text
                  key={municipality.slug + "-" + industry.slug}
                  x={iconStartX + index * iconGap}
                  y={iconY}
                  fontSize={isFocused ? 20 : 18}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  opacity={isDetailed ? 1 : 0.96}
                >
                  {industry.icon}
                </text>
              ))}

              <text
                x="0"
                y={nameY}
                textAnchor="middle"
                fontFamily={mapLabelFontFamily}
                fontSize={isFocused ? 24 : 18}
                fontWeight="700"
                fill={labelColor}
                stroke="rgba(248,250,252,0.98)"
                strokeWidth={3}
                strokeLinejoin="round"
                paintOrder="stroke"
              >
                {nameLines.map((line, index) => (
                  <tspan
                    key={municipality.slug + "-label-" + line}
                    x="0"
                    dy={index === 0 ? 0 : 18}
                  >
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
