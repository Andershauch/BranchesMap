"use client";

import { geoMercator, geoPath } from "d3-geo";
import { useMemo } from "react";

import type { MunicipalitySummary } from "@/lib/data/municipalities";
import { sjaellandMunicipalityFeatureCollection } from "@/lib/geo/sjaelland";
import type { AppLocale } from "@/lib/i18n/config";

const width = 900;
const height = 1400;
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
  helsingor: { dx: 8, dy: -6 },
  hillerod: { dx: 0, dy: 2 },
  holbaek: { dx: 0, dy: 4 },
  roskilde: { dx: 0, dy: -2 },
  "hoje-taastrup": { dx: -10, dy: 12 },
  greve: { dx: 8, dy: 14 },
  koge: { dx: 8, dy: 8 },
  ringsted: { dx: 0, dy: 4 },
  soro: { dx: -6, dy: 0 },
  naestved: { dx: 0, dy: 10 },
  slagelse: { dx: -6, dy: 6 },
  kalundborg: { dx: -6, dy: 4 },
  stevns: { dx: 10, dy: 8 },
  vordingborg: { dx: 0, dy: -8 },
};

const projection = geoMercator().fitExtent(
  [
    [42, 42],
    [width - 42, height - 42],
  ],
  sjaellandMunicipalityFeatureCollection as never,
);

const path = geoPath(projection);

type MapFeature = {
  municipality: MunicipalitySummary;
  pathData: string;
  marker: {
    x: number;
    y: number;
  };
};

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
  selectedSlug,
  onSelect,
}: {
  municipalities: MunicipalitySummary[];
  locale: AppLocale;
  ariaLabel: string;
  selectedSlug: string;
  onSelect: (slug: string) => void;
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
        const tuning = labelTuning[municipality.slug] ?? {};

        return {
          municipality,
          pathData,
          marker: {
            x: centroidX + (tuning.dx ?? 0),
            y: centroidY + (tuning.dy ?? 0),
          },
        } satisfies MapFeature;
      })
      .filter((value): value is NonNullable<typeof value> => Boolean(value));
  }, [municipalities]);

  const primaryFeatures = features.filter((feature) => feature.municipality.homeMap.isPrimary);

  return (
    <div className="absolute inset-0 overflow-hidden rounded-[1.75rem] bg-[radial-gradient(circle_at_top,#d9efe8_0%,#bfd8ce_36%,#9abdaf_100%)]">
      <div className="absolute left-3 top-3 z-10 rounded-full bg-white/85 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-800 shadow-[0_10px_30px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/10 backdrop-blur sm:left-4 sm:top-4">
        {locale === "da" ? "Hovedkort" : "Home map"}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        aria-label={ariaLabel}
        role="img"
      >
        <rect width={width} height={height} fill="transparent" />

        {features.map((feature) => {
          const { municipality, pathData } = feature;
          const isSelected = municipality.slug === selectedSlug;
          const isPrimary = municipality.homeMap.isPrimary;
          const fillColor = isSelected
            ? municipality.topIndustries[0]?.accentColor ?? "#0f766e"
            : isPrimary
              ? municipality.topIndustries[0]?.accentColor ?? "#94a3b8"
              : "#d7dfdc";

          return (
            <path
              key={municipality.slug}
              d={pathData}
              fill={fillColor}
              fillOpacity={isSelected ? 0.3 : isPrimary ? 0.18 : 0.12}
              stroke={isSelected ? "#0f172a" : "#475569"}
              strokeOpacity={isSelected ? 0.8 : 0.35}
              strokeWidth={isSelected ? 2.2 : 1.35}
              className="cursor-pointer transition"
              onClick={() => onSelect(municipality.slug)}
            />
          );
        })}

        {primaryFeatures.map((feature) => {
          const { municipality, marker } = feature;
          const isSelected = municipality.slug === selectedSlug;
          const nameLines = splitMunicipalityName(municipality.name);
          const labelColor = isSelected ? municipality.topIndustries[0]?.accentColor ?? "#0f766e" : "#0f172a";
          const visibleIndustries = municipality.topIndustries.slice(0, 3);
          const iconGap = 26;
          const iconStartX = -((visibleIndustries.length - 1) * iconGap) / 2;
          const iconY = -18 + ((labelTuning[municipality.slug] ?? {}).iconDy ?? 0);
          const nameY = 8 + ((labelTuning[municipality.slug] ?? {}).nameDy ?? 0);

          return (
            <g
              key={municipality.slug + "-label"}
              transform={`translate(${marker.x}, ${marker.y})`}
              onClick={() => onSelect(municipality.slug)}
              className="cursor-pointer"
            >
              {visibleIndustries.map((industry, index) => (
                <text
                  key={municipality.slug + "-" + industry.slug}
                  x={iconStartX + index * iconGap}
                  y={iconY}
                  fontSize={18}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {industry.icon}
                </text>
              ))}

              <text
                x="0"
                y={nameY}
                textAnchor="middle"
                fontFamily={mapLabelFontFamily}
                fontSize={isSelected ? 22 : 18}
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
