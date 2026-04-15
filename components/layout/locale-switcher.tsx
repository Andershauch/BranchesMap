"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { locales, type AppLocale } from "@/lib/i18n/config";

type LocaleSwitcherProps = {
  currentLocale: AppLocale;
  labels: Record<AppLocale, string>;
  title: string;
};

function replaceLocaleInPathname(pathname: string, nextLocale: AppLocale) {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return `/${nextLocale}`;
  }

  if (locales.includes(segments[0] as AppLocale)) {
    segments[0] = nextLocale;
    return `/${segments.join("/")}`;
  }

  return `/${nextLocale}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

function buildLocaleHref(pathname: string, nextLocale: AppLocale, queryString: string) {
  const localizedPathname = replaceLocaleInPathname(pathname, nextLocale);
  return queryString ? `${localizedPathname}?${queryString}` : localizedPathname;
}

export function LocaleSwitcher({ currentLocale, labels, title }: LocaleSwitcherProps) {
  const pathname = usePathname() || `/${currentLocale}`;
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={title}
        aria-expanded={open}
        className="inline-flex h-10 items-center justify-center rounded-full border border-white/60 bg-white/72 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--md-sys-color-on-surface)] shadow-[0_8px_18px_rgba(15,23,42,0.06)] backdrop-blur-xl transition hover:bg-white/84"
      >
        {currentLocale}
      </button>

      {open ? (
        <div className="absolute top-[calc(100%+0.5rem)] end-0 z-[120] min-w-[12rem] overflow-hidden rounded-[1.2rem] border border-white/60 bg-[color:rgba(255,255,255,0.92)] p-1.5 shadow-[0_18px_42px_rgba(15,23,42,0.16)] backdrop-blur-2xl">
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--md-sys-color-on-surface-variant)]">
            {title}
          </p>
          <div className="grid gap-1">
            {locales.map((locale) => {
              const href = buildLocaleHref(pathname, locale, queryString);
              const active = locale === currentLocale;

              return (
                <Link
                  key={locale}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between rounded-[0.95rem] px-3 py-2.5 text-sm transition ${
                    active
                      ? "bg-[var(--md-sys-color-primary-container)] font-semibold text-[var(--md-sys-color-on-primary-container)]"
                      : "text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container)]"
                  }`}
                >
                  <span>{labels[locale]}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">{locale}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
