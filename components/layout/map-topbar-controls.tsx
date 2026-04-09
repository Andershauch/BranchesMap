"use client";

import { usePathname } from "next/navigation";

import type { AppLocale } from "@/lib/i18n/config";

const uiCopy = {
  da: {
    zoomIn: "Zoom ind",
    zoomOut: "Zoom ud",
    reset: "Nulstil",
  },
  en: {
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    reset: "Reset",
  },
} as const;

const zoomInEvent = "branches-map:zoom-in";
const zoomOutEvent = "branches-map:zoom-out";
const resetEvent = "branches-map:reset";

function dispatchMapControlEvent(eventName: string) {
  window.dispatchEvent(new Event(eventName));
}

export function MapTopBarControls({
  locale,
  displayName,
}: {
  locale: AppLocale;
  displayName: string | null;
}) {
  const pathname = usePathname();
  const copy = uiCopy[locale];
  const isHomeRoute = pathname === `/${locale}` || pathname === `/${locale}/`;

  if (!isHomeRoute) {
    if (!displayName) {
      return null;
    }

    return (
      <div className="hidden max-w-[16rem] truncate rounded-full border border-white/55 bg-white/72 px-4 py-2 text-sm font-medium text-[var(--md-sys-color-on-surface-variant)] shadow-[0_8px_24px_rgba(15,23,42,0.08)] sm:block">
        {displayName}
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center">
      <div className="flex h-10 items-center rounded-full border border-white/60 bg-white/72 p-1 shadow-[0_8px_18px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <button
          type="button"
          onClick={() => dispatchMapControlEvent(zoomOutEvent)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/86 text-sm font-semibold text-slate-900 transition hover:bg-white"
          aria-label={copy.zoomOut}
          title={copy.zoomOut}
        >
          {"\u2212"}
        </button>
        <button
          type="button"
          onClick={() => dispatchMapControlEvent(zoomInEvent)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800"
          aria-label={copy.zoomIn}
          title={copy.zoomIn}
        >
          +
        </button>
        <div className="mx-1 h-5 w-px bg-slate-200/90" />
        <button
          type="button"
          onClick={() => dispatchMapControlEvent(resetEvent)}
          className="inline-flex h-8 items-center justify-center rounded-full px-2.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-slate-700 transition hover:bg-white/78"
          aria-label={copy.reset}
          title={copy.reset}
        >
          {copy.reset}
        </button>
      </div>
    </div>
  );
}
