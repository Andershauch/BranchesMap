"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

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

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full bg-[var(--md-sys-color-surface-container)] p-1"
      aria-label={title}
    >
      {locales.map((locale) => {
        const href = buildLocaleHref(pathname, locale, queryString);
        const active = locale === currentLocale;

        return (
          <Link
            key={locale}
            href={href}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              active
                ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-[0_1px_2px_var(--md-sys-color-shadow)]"
                : "text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)] hover:text-[var(--md-sys-color-on-surface)]"
            }`}
          >
            {labels[locale]}
          </Link>
        );
      })}
    </div>
  );
}