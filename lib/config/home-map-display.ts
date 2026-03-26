export const homeMapRegionTags = ["west", "south", "central", "north", "metro", "other"] as const;
export const homeMapLabelModes = ["auto", "name-only", "name-icons"] as const;

export type MunicipalityHomeMapRegionTag = (typeof homeMapRegionTags)[number];
export type MunicipalityHomeMapLabelMode = (typeof homeMapLabelModes)[number];

export type MunicipalityHomeMapConfig = {
  isPrimary: boolean;
  priority: number;
  labelMode: MunicipalityHomeMapLabelMode;
  regionTag: MunicipalityHomeMapRegionTag;
};

const primaryMunicipalityOrder = [
  "helsingor",
  "hillerod",
  "holbaek",
  "roskilde",
  "hoje-taastrup",
  "greve",
  "koge",
  "ringsted",
  "soro",
  "naestved",
  "slagelse",
  "kalundborg",
  "stevns",
  "vordingborg",
] as const;

const regionTags: Record<string, MunicipalityHomeMapRegionTag> = {
  helsingor: "north",
  hillerod: "north",
  holbaek: "west",
  roskilde: "central",
  "hoje-taastrup": "metro",
  greve: "metro",
  koge: "south",
  ringsted: "central",
  soro: "central",
  naestved: "south",
  slagelse: "west",
  kalundborg: "west",
  stevns: "south",
  vordingborg: "south",
};

const primaryConfig = new Map<string, MunicipalityHomeMapConfig>(
  primaryMunicipalityOrder.map((slug, index) => [
    slug,
    {
      isPrimary: true,
      priority: index + 1,
      labelMode: "name-icons",
      regionTag: regionTags[slug] ?? "other",
    } satisfies MunicipalityHomeMapConfig,
  ]),
);

export const defaultHomeMapSelectionSlug = "roskilde";

export function getMunicipalityHomeMapConfig(slug: string): MunicipalityHomeMapConfig {
  return (
    primaryConfig.get(slug) ?? {
      isPrimary: false,
      priority: 999,
      labelMode: "auto",
      regionTag: regionTags[slug] ?? "other",
    }
  );
}

export function isPrimaryHomeMapMunicipality(slug: string) {
  return getMunicipalityHomeMapConfig(slug).isPrimary;
}