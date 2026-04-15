"use client";

import { useMemo, useState } from "react";

import type { TravelDestination } from "@/lib/geo/municipality-centers";
import type { AppLocale } from "@/lib/i18n/config";
import { getDictionarySync } from "@/lib/i18n/dictionaries";

type TravelEstimateStatus = "idle" | "loading" | "ready" | "denied" | "unsupported" | "error";

type UserPosition = {
  latitude: number;
  longitude: number;
};

const averageCarSpeedKmh = 62;
const routeDetourFactor = 1.28;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getDistanceKm(from: UserPosition, to: TravelDestination) {
  const earthRadiusKm = 6371;
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(deltaLongitude / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function formatDistance(locale: AppLocale, distanceKm: number) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: distanceKm < 10 ? 1 : 0 }).format(distanceKm);
}

function formatMinutes(minutes: number) {
  const rounded = Math.max(3, Math.round(minutes / 5) * 5);
  return rounded < 60 ? `${rounded}` : `${Math.floor(rounded / 60)}t ${rounded % 60 || ""}`.trim();
}

export function MunicipalityTravelEstimate({
  locale,
  destination,
}: {
  locale: AppLocale;
  destination: TravelDestination | null;
}) {
  const copy = getDictionarySync(locale).travel;
  const [status, setStatus] = useState<TravelEstimateStatus>("idle");
  const [position, setPosition] = useState<UserPosition | null>(null);

  const estimate = useMemo(() => {
    if (!position || !destination) {
      return null;
    }

    const directDistanceKm = getDistanceKm(position, destination);
    const estimatedRouteKm = directDistanceKm * routeDetourFactor;
    const estimatedMinutes = (estimatedRouteKm / averageCarSpeedKmh) * 60;

    return {
      distanceKm: estimatedRouteKm,
      minutes: estimatedMinutes,
    };
  }, [destination, position]);

  function requestLocation() {
    if (!destination) {
      setStatus("error");
      return;
    }

    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      return;
    }

    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setPosition({
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
        });
        setStatus("ready");
      },
      (error) => {
        setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "error");
      },
      {
        enableHighAccuracy: false,
        maximumAge: 1000 * 60 * 10,
        timeout: 8000,
      },
    );
  }

  return (
    <div className="mt-3 rounded-[1.2rem] bg-white/70 px-3.5 py-3 ring-1 ring-slate-900/6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{copy.title}</p>
          <p className="mt-1 text-xs font-medium text-slate-700">
            {status === "loading"
              ? copy.loading
              : estimate
                ? `${copy.approx} ${formatMinutes(estimate.minutes)} ${copy.minutes} · ${formatDistance(locale, estimate.distanceKm)} km`
                : status === "unsupported"
                  ? copy.unsupported
                  : status === "denied"
                    ? copy.denied
                    : status === "error"
                      ? copy.error
                      : copy.idle}
          </p>
        </div>

        <button
          type="button"
          onClick={requestLocation}
          disabled={status === "loading"}
          className="shrink-0 rounded-full bg-slate-950 px-3 py-2 text-[11px] font-semibold text-white shadow-[0_10px_18px_rgba(15,23,42,0.14)] transition hover:bg-slate-800 disabled:cursor-wait disabled:bg-slate-400"
        >
          {status === "idle" ? copy.button : copy.retry}
        </button>
      </div>
      <p className="mt-2 text-[10px] leading-4 text-slate-500">{copy.note}</p>
    </div>
  );
}
