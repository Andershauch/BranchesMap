import { geoCentroid } from "d3-geo";

import { sjaellandMunicipalityFeatureCollection } from "@/lib/geo/sjaelland";

export type TravelDestination = {
  latitude: number;
  longitude: number;
  precision: "municipality-center-v1" | "job-location";
};

export const municipalityTravelDestinations = new Map<string, TravelDestination>(
  sjaellandMunicipalityFeatureCollection.features.map((feature) => {
    const [longitude, latitude] = geoCentroid(feature as never);

    return [
      feature.properties.slug,
      {
        latitude,
        longitude,
        precision: "municipality-center-v1",
      },
    ];
  }),
);
