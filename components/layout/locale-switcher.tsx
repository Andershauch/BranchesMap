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

export function LocaleSwitcher({
  currentLocale,
  labels,
  title,
}: LocaleSwitcherProps) {
  const pathname = usePathname() || `/${currentLocale}`;
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  return (
    <div className="flex items-center gap-2" aria-label={title}>
      {locales.map((locale) => {
        const href = buildLocaleHref(pathname, locale, queryString);
        const active = locale === currentLocale;

        return (
          <Link
            key={locale}
            href={href}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-slate-900 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:border-slate-900 hover:text-slate-900"
            }`}
          >
            {labels[locale]}
          </Link>
        );
      })}
    </div>
  );
}
