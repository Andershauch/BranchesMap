import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { isValidLocale, locales, type AppLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    return {};
  }

  const dictionary = await getDictionary(locale);

  return {
    title: {
      default: dictionary.meta.title,
      template: `%s | ${dictionary.meta.title}`,
    },
    description: dictionary.meta.description,
    alternates: {
      languages: {
        da: "/da",
        en: "/en",
      },
    },
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale);

  return (
    <div lang={locale} className="flex min-h-full flex-col">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href={`/${locale}`}
              className="text-lg font-semibold tracking-tight text-slate-950"
            >
              {dictionary.header.appName}
            </Link>
            <p className="mt-1 text-sm text-slate-600">
              {dictionary.header.appTagline}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">
              {dictionary.header.localeLabel}
            </span>
            <LocaleSwitcher
              currentLocale={locale as AppLocale}
              labels={dictionary.locales}
              title={dictionary.header.localeLabel}
            />
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}