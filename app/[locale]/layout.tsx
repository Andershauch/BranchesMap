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
  const [dictionary, user] = await Promise.all([getDictionary(locale), getCurrentUser()]);
  const displayName = user?.name?.trim() ? user.name : user?.email ?? null;
  const supportingText =
    activeLocale === "da"
      ? "Mobile-first kort og kommunedata for Sj\u00e6lland"
      : "Mobile-first map and municipality insights for Zealand";

  return (
    <div lang={locale} className="flex min-h-screen flex-col text-[var(--md-sys-color-on-surface)]">
      <header className="sticky top-0 z-40 border-b border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-low)]/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:h-[4.5rem] sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <AppMenu
              locale={activeLocale}
              user={user ? { email: user.email, name: user.name } : null}
              localeLabels={dictionary.locales}
              localeTitle={dictionary.header.localeLabel}
            />
            <Link href={`/${locale}`} className="min-w-0">
              <p className="truncate text-base font-semibold tracking-tight text-[var(--md-sys-color-on-surface)] sm:text-lg">
                {dictionary.header.appName}
              </p>
              <p className="hidden truncate text-xs text-[var(--md-sys-color-on-surface-variant)] sm:block">
                {supportingText}
              </p>
            </Link>
          </div>

          {displayName ? (
            <div className="hidden max-w-[16rem] truncate rounded-full bg-[var(--md-sys-color-surface-container)] px-4 py-2 text-sm font-medium text-[var(--md-sys-color-on-surface-variant)] sm:block">
              {displayName}
            </div>
          ) : null}
        </div>
      </header>

      <div className="flex-1">{children}</div>
    </div>
  );
}