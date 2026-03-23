import fs from "node:fs";
import path from "node:path";
import simplify from "simplify-js";

const sourcePath = path.resolve("./_tmp_kommuner_geojson_raw.json");
const outputPath = path.resolve("./data/geo/sjaelland-municipalities.json");

const municipalityNames = new Set([
  "Albertslund",
  "Allerød",
  "Ballerup",
  "Brøndby",
  "Dragør",
  "Egedal",
  "Faxe",
  "Fredensborg",
  "Frederiksberg",
  "Frederikssund",
  "Furesø",
  "Gentofte",
  "Gladsaxe",
  "Glostrup",
  "Greve",
  "Gribskov",
  "Halsnæs",
  "Helsingør",
  "Herlev",
  "Hillerød",
  "Holbæk",
  "Hvidovre",
  "Høje-Taastrup",
  "Hørsholm",
  "Ishøj",
  "Kalundborg",
  "København",
  "Køge",
  "Lejre",
  "Lyngby-Taarbæk",
  "Næstved",
  "Odsherred",
  "Ringsted",
  "Roskilde",
  "Rudersdal",
  "Rødovre",
  "Slagelse",
  "Solrød",
  "Sorø",
  "Stevns",
  "Tårnby",
  "Vallensbæk",
  "Vordingborg",
]);

const replacements = [
  ["æ", "ae"],
  ["ø", "o"],
  ["å", "aa"],
  ["Æ", "ae"],
  ["Ø", "o"],
  ["Å", "aa"],
  ["é", "e"],
  ["É", "e"],
];

const slugify = (value) => {
  let working = value;
  for (const [search, replacement] of replacements) {
    working = working.split(search).join(replacement);
  }

  return working
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
};

const round = (value) => Math.round(value * 100000) / 100000;

const dedupeRing = (ring) => {
  const deduped = [];
  for (const point of ring) {
    const last = deduped[deduped.length - 1];
    if (!last || last[0] !== point[0] || last[1] !== point[1]) {
      deduped.push(point);
    }
  }
  return deduped;
};

const simplifyRing = (ring, tolerance = 0.00018) => {
  const closed = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
  const openRing = closed ? ring.slice(0, -1) : ring.slice();

  if (openRing.length <= 8) {
    const minimal = dedupeRing(openRing.map(([lng, lat]) => [round(lng), round(lat)]));
    if (minimal.length < 3) return null;
    minimal.push(minimal[0]);
    return minimal;
  }

  const simplified = simplify(
    openRing.map(([lng, lat]) => ({ x: lng, y: lat })),
    tolerance,
    true,
  ).map(({ x, y }) => [round(x), round(y)]);

  const deduped = dedupeRing(simplified);
  const fallback = deduped.length >= 3 ? deduped : openRing.map(([lng, lat]) => [round(lng), round(lat)]);
  const finalRing = dedupeRing(fallback);

  if (finalRing.length < 3) {
    return null;
  }

  finalRing.push(finalRing[0]);
  return finalRing;
};

const simplifyGeometry = (geometry) => {
  if (geometry.type === "Polygon") {
    const rings = geometry.coordinates
      .map((ring) => simplifyRing(ring))
      .filter(Boolean);

    return rings.length ? { type: "Polygon", coordinates: rings } : null;
  }

  if (geometry.type === "MultiPolygon") {
    const polygons = geometry.coordinates
      .map((polygon) => polygon.map((ring) => simplifyRing(ring)).filter(Boolean))
      .filter((polygon) => polygon.length > 0);

    return polygons.length ? { type: "MultiPolygon", coordinates: polygons } : null;
  }

  return null;
};

const raw = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const selected = raw.features.filter((feature) => municipalityNames.has(feature.properties.navn));

selected.sort((a, b) => a.properties.navn.localeCompare(b.properties.navn, "da-DK"));

const processed = {
  type: "FeatureCollection",
  source: "https://api.dataforsyningen.dk/kommuner?format=geojson",
  scope: "Kommuner på Sjælland og Amager. Bornholm og Lolland-Falster er bevidst udeladt.",
  generatedAt: new Date().toISOString(),
  features: selected
    .map((feature) => ({
      type: "Feature",
      properties: {
        code: feature.properties.kode,
        name: feature.properties.navn,
        regionCode: feature.properties.regionskode,
        regionName: feature.properties.regionsnavn,
        slug: slugify(feature.properties.navn),
      },
      geometry: simplifyGeometry(feature.geometry),
    }))
    .filter((feature) => feature.geometry),
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(processed));

console.log(`Skrev ${processed.features.length} kommuner til ${outputPath}`);