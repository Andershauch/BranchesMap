import sjaellandProperties from "@/data/geo/sjaelland-properties.json";

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

/**
 * Asynkront fetch af den pre-kalkulerede og normaliserede GeoJSON-fil.
 * Hentes over netværket på klientsiden i stedet for at bundle det ind i JS-koden.
 */
export async function fetchSjaellandGeoJSON(): Promise<MunicipalityFeatureCollection> {
  const response = await fetch("/geo/sjaelland-normalized.json");
  if (!response.ok) {
    throw new Error("Kunne ikke hente Sjællandskort data");
  }
  return response.json();
}

/**
 * Synkront tilgængelige metadata og pre-kalkulerede centerpunkter.
 * Genereret af scripts/prepare-geojson.ts for at undgå at parse hele kortet runtime.
 */
export const sjaellandMunicipalityProperties = sjaellandProperties as Array<
  MunicipalityFeature["properties"] & { longitude: number; latitude: number }
>;
