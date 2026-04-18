import Link from "next/link";
import type { ReactNode } from "react";

import { type AppLocale } from "@/lib/i18n/config";
import { getDictionarySync } from "@/lib/i18n/dictionaries";
import type { Dictionary } from "@/lib/i18n/schema";
import { logoutAction } from "@/lib/server/auth-actions";

type AdminSection = "home-map" | "security" | "app-texts" | "jobindsats-titles";

type AdminShellProps = {
  locale: AppLocale;
  currentSection: AdminSection;
  title: string;
  intro: string;
  displayName: string;
  copyOverride?: Dictionary["adminHomeMap"];
  children: ReactNode;
};

export function AdminShell({
  locale,
  currentSection,
  title,
  intro,
  displayName,
  copyOverride,
  children,
}: AdminShellProps) {
  const text = copyOverride ?? getDictionarySync(locale).adminHomeMap;
  const navHomeMap = text.navHomeMap ?? (locale === "da" ? "Kortstyring" : "Map manager");
  const navSecurity = text.navSecurity ?? (locale === "da" ? "Sikkerhed" : "Security");
  const navAppTexts = text.navAppTexts ?? (locale === "da" ? "Systemtekster" : "System texts");
  const navTranslations = text.navTranslations ?? (locale === "da" ? "Titeloversættelser" : "Title translations");
  const sections = [
    {
      key: "home-map" as const,
      href: `/${locale}/admin/home-map`,
      label: navHomeMap,
    },
    {
      key: "security" as const,
      href: `/${locale}/admin/security`,
      label: navSecurity,
    },
    {
      key: "app-texts" as const,
      href: `/${locale}/admin/app-texts`,
      label: navAppTexts,
    },
    {
      key: "jobindsats-titles" as const,
      href: `/${locale}/admin/jobindsats-titles`,
      label: navTranslations,
    },
  ];

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f5ef_0%,#eef4f3_100%)] px-3 py-3 text-slate-900 sm:px-4 sm:py-4">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 rounded-[2rem] border border-slate-900/10 bg-white/92 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-700">{text.eyebrow}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{intro}</p>
          </div>
          <Link
            href={`/${locale}`}
            className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-200"
          >
            {text.back}
          </Link>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <nav
            aria-label={text.eyebrow}
            className="flex flex-wrap gap-2 rounded-[1.4rem] border border-slate-900/10 bg-slate-50/80 p-2"
          >
            {sections.map((section) => {
              const active = section.key === currentSection;

              return (
                <Link
                  key={section.key}
                  href={section.href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "inline-flex items-center rounded-full px-4 py-2.5 text-sm font-semibold transition",
                    active
                      ? "bg-slate-900 text-white shadow-[0_8px_24px_rgba(15,23,42,0.18)]"
                      : "bg-white text-slate-700 hover:bg-slate-100",
                  ].join(" ")}
                >
                  {section.label}
                </Link>
              );
            })}
          </nav>

          <div className="rounded-[1.4rem] border border-slate-900/10 bg-slate-50/80 px-4 py-4">
            <p className="text-sm font-semibold text-slate-900">{text.signedInAs}</p>
            <p dir="auto" className="mt-1 text-sm text-slate-600">{displayName}</p>
            <form action={logoutAction} className="mt-4">
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="inline-flex rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
              >
                {text.signOut}
              </button>
            </form>
          </div>
        </div>

        {children}
      </section>
    </main>
  );
}
