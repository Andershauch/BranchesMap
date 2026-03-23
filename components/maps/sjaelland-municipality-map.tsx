import { geoMercator, geoPath } from "d3-geo";

import { sjaellandMunicipalityFeatureCollection } from "@/lib/geo/sjaelland";
import type { MunicipalitySummary } from "@/lib/data/municipalities";

const width = 900;
const height = 980;

const labelOffsets: Record<string, { dx: number; dy: number }> = {
  albertslund: { dx: -34, dy: 10 },
  ballerup: { dx: -26, dy: -18 },
  brondby: { dx: -30, dy: 12 },
  dragor: { dx: 30, dy: 28 },
  frederiksberg: { dx: -18, dy: -4 },
  gentofte: { dx: 30, dy: -20 },
  gladsaxe: { dx: 10, dy: -24 },
  glostrup: { dx: -18, dy: -16 },
  herlev: { dx: -6, dy: -24 },
  hvidovre: { dx: -8, dy: 20 },
  "hoje-taastrup": { dx: -30, dy: 14 },
  horsholm: { dx: 18, dy: -18 },
  ishoj: { dx: -18, dy: 24 },
  kobenhavn: { dx: 34, dy: -10 },
  "lyngby-taarbaek": { dx: 10, dy: -30 },
  rodovre: { dx: -24, dy: -10 },
  taarnby: { dx: 22, dy: 14 },
  vallensbaek: { dx: -36, dy: 22 },
};

const projection = geoMercator().fitExtent(
  [
    [24, 24],
    [width - 24, height - 24],
  ],
  sjaellandMunicipalityFeatureCollection as never,
);

const path = geoPath(projection);

export function SjaellandMunicipalityMap({
  municipalities,
}: {
  municipalities: MunicipalitySummary[];
}) {
  const municipalityMap = new Map(
    municipalities.map((municipality) => [municipality.code, municipality]),
  );

  const features = sjaellandMunicipalityFeatureCollection.features
    .map((feature) => {
      const municipality = municipalityMap.get(feature.properties.code);
      const pathData = path(feature as never);

      if (!municipality || !pathData) {
        return null;
      }

      const [cx, cy] = path.centroid(feature as never);
      const offset = labelOffsets[municipality.slug] ?? { dx: 0, dy: 0 };
      const labelX = cx + offset.dx;
      const labelY = cy + offset.dy;

      return {
        municipality,
        pathData,
        centroid: { x: cx, y: cy },
        label: { x: labelX, y: labelY },
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  return (
    <div className="relative aspect-[9/10] overflow-hidden rounded-[1.75rem] bg-[radial-gradient(circle_at_top,#d9efe8_0%,#bfd8ce_34%,#9abdaf_100%)] sm:aspect-[9/8]">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 h-full w-full"
        aria-label="Kort over Sjællands kommuner"
        role="img"
      >
        <rect width={width} height={height} fill="transparent" />
        {features.map(({ centroid, label, municipality }) => {
          if (centroid.x === label.x && centroid.y === label.y) {
            return null;
          }

          return (
            <line
              key={`${municipality.slug}-leader`}
              x1={centroid.x}
              y1={centroid.y}
              x2={label.x}
              y2={label.y}
              stroke="#0f172a"
              strokeOpacity="0.22"
              strokeWidth="1"
            />
          );
        })}
        {features.map(({ pathData, municipality }) => (
          <a key={municipality.slug} href={`/kommuner/${municipality.slug}`}>
            <title>{municipality.name}</title>
            <path
              d={pathData}
              fill={municipality.topIndustries[0]?.accentColor ?? "#94a3b8"}
              fillOpacity="0.22"
              stroke="#0f172a"
              strokeOpacity="0.28"
              strokeWidth="1.2"
            />
          </a>
        ))}
      </svg>

      {features.map(({ municipality, label }) => (
        <a
          key={`${municipality.slug}-badge`}
          href={`/kommuner/${municipality.slug}`}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/92 px-2 py-1 text-[10px] font-medium text-slate-800 shadow-[0_8px_22px_rgba(15,23,42,0.15)] ring-1 ring-slate-900/10 transition hover:-translate-y-[52%] sm:px-3 sm:py-1.5 sm:text-xs"
          style={{
            left: `${(label.x / width) * 100}%`,
            top: `${(label.y / height) * 100}%`,
          }}
        >
          <span className="flex items-center gap-1">
            {municipality.topIndustries.map((industry) => (
              <span key={`${municipality.slug}-${industry.slug}-icon`}>
                {industry.icon}
              </span>
            ))}
            <span className="hidden sm:inline">{municipality.name}</span>
          </span>
        </a>
      ))}
    </div>
  );
}