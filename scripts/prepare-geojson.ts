import fs from "fs/promises";
import path from "path";
import { geoCentroid } from "d3-geo";
import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
  Position as GeoJsonPosition,
} from "geojson";

type Position = GeoJsonPosition;
type PolygonCoordinates = Position[][];

type MunicipalityGeometry = Polygon | MultiPolygon;

type MunicipalityFeature = {
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

type MunicipalityGeoJsonFeature = Feature<
  Polygon | MultiPolygon,
  MunicipalityFeature["properties"]
>;

type MunicipalityFeatureCollection = FeatureCollection<
  Polygon | MultiPolygon,
  MunicipalityFeature["properties"]
> & {
  source: string;
  scope: string;
  generatedAt: string;
};

const minRingArea = 0.000001;

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
  if (!outerRing) return null;

  const outerArea = ringArea(outerRing);
  if (Math.abs(outerArea) <= minRingArea) return null;

  const normalizedOuterRing = outerArea > 0 ? reverseRing(outerRing) : outerRing;
  const normalizedHoleRings: PolygonCoordinates = [];
  for (let i = 0; i < holeRings.length; i++) {
    const ring = holeRings[i];
    const area = ringArea(ring);
    if (Math.abs(area) > minRingArea) {
      normalizedHoleRings.push(area < 0 ? reverseRing(ring) : ring);
    }
  }

  return [normalizedOuterRing, ...normalizedHoleRings];
}

function normalizeGeometry(geometry: MunicipalityGeometry): MunicipalityGeometry | null {
  if (geometry.type === "Polygon") {
    const normalizedRings = normalizePolygonRings(geometry.coordinates);
    return normalizedRings ? { type: "Polygon", coordinates: normalizedRings } : null;
  }

  const normalizedPolygons = geometry.coordinates.flatMap((polygon): PolygonCoordinates[] => {
    const normalized = normalizePolygonRings(polygon);
    return normalized ? [normalized] : [];
  });

  return normalizedPolygons.length
    ? { type: "MultiPolygon", coordinates: normalizedPolygons }
    : null;
}

async function main() {
  const inputPath = path.join(process.cwd(), "data", "geo", "sjaelland-municipalities.json");
  const rawData = await fs.readFile(inputPath, "utf-8");
  const rawFeatureCollection = JSON.parse(rawData) as MunicipalityFeatureCollection;

  // 1. Normalisér Geometri
  const normalizedFeatures = rawFeatureCollection.features.flatMap((feature): MunicipalityFeature[] => {
    const geometry = normalizeGeometry(feature.geometry);
    if (!geometry) return [];
    return [{ ...feature, geometry }];
  });

  const normalizedCollection: MunicipalityFeatureCollection = {
    ...rawFeatureCollection,
    features: normalizedFeatures,
  };

  // 2. Pre-kalkulér centerpunkter til brug i travel/distances
  const propertiesAndCenters = normalizedFeatures.map((feature) => {
    const [longitude, latitude] = geoCentroid(feature as MunicipalityGeoJsonFeature);
    return {
      ...feature.properties,
      longitude,
      latitude,
    };
  });

  // 3. Skriv output-filer
  const outputGeoJsonPath = path.join(process.cwd(), "public", "geo", "sjaelland-normalized.json");
  const outputPropsPath = path.join(process.cwd(), "data", "geo", "sjaelland-properties.json");

  await fs.mkdir(path.dirname(outputGeoJsonPath), { recursive: true });
  await fs.mkdir(path.dirname(outputPropsPath), { recursive: true });

  await fs.writeFile(outputGeoJsonPath, JSON.stringify(normalizedCollection));
  console.log(`✅ Oprettet normaliseret GeoJSON: ${outputGeoJsonPath}`);

  await fs.writeFile(outputPropsPath, JSON.stringify(propertiesAndCenters, null, 2));
  console.log(`✅ Oprettet metadata & centers: ${outputPropsPath}`);
}

main().catch((err) => {
  console.error("Fejl i pre-kalkulering af geo-data:", err);
  process.exit(1);
});
