import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppMenu } from "@/components/layout/app-menu";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { MapTopBarControls } from "@/components/layout/map-topbar-controls";
import { isRtlLocale, isValidLocale, locales, type AppLocale } from "@/lib/i18n/config";
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
        uk: "/uk",
        ar: "/ar",
        fa: "/fa",
        ur: "/ur",
        pl: "/pl",
        de: "/de",
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
  const supportingText = dictionary.header.appTagline;
  const direction = isRtlLocale(activeLocale) ? "rtl" : "ltr";

  return (
    <div lang={locale} dir={direction} className="flex min-h-screen flex-col text-[var(--md-sys-color-on-surface)]">
      <header
        className="sticky top-0 z-50 h-[var(--app-header-height)] pt-[var(--safe-top)]"
      >
        <div className="flex h-[var(--app-header-bar-height)] w-full items-center justify-between gap-2.5 border-b border-white/45 bg-[color:rgba(248,250,247,0.62)] px-[calc(var(--safe-left)+0.8rem)] pr-[calc(var(--safe-right)+0.8rem)] shadow-[0_8px_20px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:px-[calc(var(--safe-left)+1rem)] sm:pr-[calc(var(--safe-right)+1rem)]">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <AppMenu
              locale={activeLocale}
              user={user ? { email: user.email, name: user.name } : null}
            />
            <Link href={`/${locale}`} className="min-w-0">
              <p className="truncate text-[0.94rem] font-semibold tracking-tight text-[var(--md-sys-color-on-surface)] sm:text-lg">
                {dictionary.header.appName}
              </p>
              <p className="hidden truncate text-xs text-[var(--md-sys-color-on-surface-variant)] sm:block">
                {supportingText}
              </p>
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <LocaleSwitcher
              currentLocale={activeLocale}
              labels={dictionary.locales}
              title={dictionary.header.localeLabel}
            />
            <MapTopBarControls locale={activeLocale} displayName={displayName} />
          </div>
        </div>
      </header>

      <div className="flex-1">{children}</div>
    </div>
  );
}
