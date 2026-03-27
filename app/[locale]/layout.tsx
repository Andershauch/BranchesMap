import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppMenu } from "@/components/layout/app-menu";
import { isValidLocale, locales, type AppLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getCurrentUser } from "@/lib/server/auth";

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

  const activeLocale = locale as AppLocale;
  const [dictionary, user] = await Promise.all([
    getDictionary(locale),
    getCurrentUser(),
  ]);

  return (
    <div lang={locale} className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/84 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-3 py-3 sm:px-4">
          <Link href={`/${locale}`} className="inline-flex items-center gap-2 text-slate-950">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-teal-600" />
            <span className="text-sm font-semibold tracking-tight">{dictionary.header.appName}</span>
          </Link>

          <AppMenu
            locale={activeLocale}
            user={user ? { email: user.email, name: user.name } : null}
            localeLabels={dictionary.locales}
            localeTitle={dictionary.header.localeLabel}
          />
        </div>
      </header>

      {children}
    </div>
  );
}