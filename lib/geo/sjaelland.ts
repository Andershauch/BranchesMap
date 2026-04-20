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

let sjaellandGeoJsonPromise: Promise<MunicipalityFeatureCollection> | null = null;

export async function fetchSjaellandGeoJSON(): Promise<MunicipalityFeatureCollection> {
  if (!sjaellandGeoJsonPromise) {
    sjaellandGeoJsonPromise = fetch("/geo/sjaelland-normalized.json", {
      cache: "force-cache",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Kunne ikke hente Sjaellandskort-data");
        }

        return (await response.json()) as MunicipalityFeatureCollection;
      })
      .catch((error) => {
        sjaellandGeoJsonPromise = null;
        throw error;
      });
  }

  return sjaellandGeoJsonPromise;
}

export const sjaellandMunicipalityProperties = sjaellandProperties as Array<
  MunicipalityFeature["properties"] & { longitude: number; latitude: number }
>;
