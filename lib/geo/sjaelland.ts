import sjaellandMunicipalities from "@/data/geo/sjaelland-municipalities.json";

type Position = [number, number];
type PolygonCoordinates = Position[][];
type MultiPolygonCoordinates = Position[][][];

const minRingArea = 0.000001;

export type MunicipalityGeometry = {
  type: "Polygon" | "MultiPolygon";
  coordinates: PolygonCoordinates | MultiPolygonCoordinates;
};

export type MunicipalityFeature = {
  type: "Feature";
  properties: {
    code: string;
    name: string;
    regionCode: string;
    regionName: string;
    slug: string;
  };
  geometry: MunicipalityGeometry;
};

export type MunicipalityFeatureCollection = {
  type: "FeatureCollection";
  source: string;
  scope: string;
  generatedAt: string;
  features: MunicipalityFeature[];
};

function ringArea(ring: Position[]) {
  let sum = 0;

  for (let index = 0; index < ring.length - 1; index += 1) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[index + 1];
    sum += x1 * y2 - x2 * y1;
  }

  return sum / 2;
}

function reverseRing(ring: Position[]) {
  return [...ring].reverse();
}

function normalizePolygonRings(rings: PolygonCoordinates): PolygonCoordinates | null {
  const [outerRing, ...holeRings] = rings;

  if (!outerRing || Math.abs(ringArea(outerRing)) <= minRingArea) {
    return null;
  }

  const normalizedOuterRing = ringArea(outerRing) > 0 ? reverseRing(outerRing) : outerRing;
  const normalizedHoleRings = holeRings
    .filter((ring) => Math.abs(ringArea(ring)) > minRingArea)
    .map((ring) => (ringArea(ring) < 0 ? reverseRing(ring) : ring));

  return [normalizedOuterRing, ...normalizedHoleRings];
}

function normalizeGeometry(geometry: MunicipalityGeometry): MunicipalityGeometry | null {
  // The simplified GeoJSON contains some near-zero-area island fragments around
  // coastal municipalities. D3 can interpret those as globe-sized polygons, so
  // we drop degenerate rings and orient outer rings/holes independently.
  if (geometry.type === "Polygon") {
    const normalizedRings = normalizePolygonRings(geometry.coordinates as PolygonCoordinates);
    return normalizedRings ? { type: "Polygon", coordinates: normalizedRings } : null;
  }

  const normalizedPolygons = (geometry.coordinates as MultiPolygonCoordinates)
    .map((polygon) => normalizePolygonRings(polygon))
    .filter((polygon): polygon is PolygonCoordinates => Boolean(polygon));

  return normalizedPolygons.length
    ? { type: "MultiPolygon", coordinates: normalizedPolygons }
    : null;
}

const rawFeatureCollection = sjaellandMunicipalities as MunicipalityFeatureCollection;

export const sjaellandMunicipalityFeatureCollection = {
  ...rawFeatureCollection,
  features: rawFeatureCollection.features
    .map((feature) => {
      const geometry = normalizeGeometry(feature.geometry);

      if (!geometry) {
        return null;
      }

      return {
        ...feature,
        geometry,
      };
    })
    .filter((feature): feature is MunicipalityFeature => Boolean(feature)),
} satisfies MunicipalityFeatureCollection;

export const sjaellandMunicipalityProperties =
  sjaellandMunicipalityFeatureCollection.features.map(({ properties }) => properties);