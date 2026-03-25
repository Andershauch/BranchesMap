export type MunicipalityHomeMapConfig = {
  isPrimary: boolean;
  priority: number;
  regionTag: "west" | "south" | "central" | "north" | "metro" | "other";
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

const regionTags: Record<string, MunicipalityHomeMapConfig["regionTag"]> = {
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
      regionTag: regionTags[slug] ?? "other",
    }
  );
}

export function isPrimaryHomeMapMunicipality(slug: string) {
  return getMunicipalityHomeMapConfig(slug).isPrimary;
}
