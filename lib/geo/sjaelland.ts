import sjaellandMunicipalities from "@/data/geo/sjaelland-municipalities.json";

type Position = [number, number];
type PolygonCoordinates = Position[][];
type MultiPolygonCoordinates = Position[][][];

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

function rewindRing(ring: Position[]) {
  return [...ring].reverse();
}

function normalizeGeometry(geometry: MunicipalityGeometry): MunicipalityGeometry {
  // D3's spherical path projection expects the opposite winding from the
  // RFC7946 GeoJSON we store, otherwise each municipality is interpreted as
  // almost the whole globe with a tiny hole in it.
  if (geometry.type === "Polygon") {
    return {
      ...geometry,
      coordinates: (geometry.coordinates as PolygonCoordinates).map(rewindRing),
    };
  }

  return {
    ...geometry,
    coordinates: (geometry.coordinates as MultiPolygonCoordinates).map((polygon) =>
      polygon.map(rewindRing),
    ),
  };
}

export const sjaellandMunicipalityFeatureCollection = {
  ...(sjaellandMunicipalities as MunicipalityFeatureCollection),
  features: (sjaellandMunicipalities as MunicipalityFeatureCollection).features.map((feature) => ({
    ...feature,
    geometry: normalizeGeometry(feature.geometry),
  })),
} satisfies MunicipalityFeatureCollection;

export const sjaellandMunicipalityProperties =
  sjaellandMunicipalityFeatureCollection.features.map(({ properties }) => properties);
