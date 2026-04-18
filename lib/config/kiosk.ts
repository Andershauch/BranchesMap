import { municipalityTravelDestinations } from "@/lib/geo/municipality-centers";

export type KioskTravelOrigin = {
  latitude: number;
  longitude: number;
  source: "env" | "default-naestved-center";
};

const fallbackOrigin = municipalityTravelDestinations.get("naestved");

function parseCoordinate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getKioskTravelOrigin(): KioskTravelOrigin | null {
  const latitude = parseCoordinate(process.env.KIOSK_TRAVEL_ORIGIN_LATITUDE);
  const longitude = parseCoordinate(process.env.KIOSK_TRAVEL_ORIGIN_LONGITUDE);

  if (latitude !== null && longitude !== null) {
    return {
      latitude,
      longitude,
      source: "env",
    };
  }

  if (!fallbackOrigin) {
    return null;
  }

  return {
    latitude: fallbackOrigin.latitude,
    longitude: fallbackOrigin.longitude,
    source: "default-naestved-center",
  };
}
