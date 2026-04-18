import { sjaellandMunicipalityProperties } from "@/lib/geo/sjaelland";

export type TravelDestination = {
  latitude: number;
  longitude: number;
  precision: "municipality-center-v1" | "job-location";
};

export const municipalityTravelDestinations = new Map<string, TravelDestination>(
  sjaellandMunicipalityProperties.map((props) => {
    return [
      props.slug,
      {
        latitude: props.latitude,
        longitude: props.longitude,
        precision: "municipality-center-v1",
      },
    ];
  }),
);
