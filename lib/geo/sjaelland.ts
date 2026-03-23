import sjaellandMunicipalities from "@/data/geo/sjaelland-municipalities.json";

export type MunicipalityGeometry = {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
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

export const sjaellandMunicipalityFeatureCollection =
  sjaellandMunicipalities as MunicipalityFeatureCollection;

export const sjaellandMunicipalityProperties =
  sjaellandMunicipalityFeatureCollection.features.map(({ properties }) => properties);