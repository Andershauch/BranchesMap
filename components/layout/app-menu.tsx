"use client";

import Link from "next/link";
import { useState } from "react";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import type { AppLocale } from "@/lib/i18n/config";

type MenuUser = {
  email: string;
  name: string | null;
};

const menuCopy = {
  da: {
    menu: "Menu",
    close: "Luk menu",
    home: "Kort",
    savedSearches: "Gemte s\u00f8gninger",
    admin: "Admin",
    login: "Log ind",
    register: "Opret bruger",
    logout: "Log ud",
    signedInAs: "Logget ind som",
    language: "Sprog",
  },
  en: {
    menu: "Menu",
    close: "Close menu",
    home: "Map",
    savedSearches: "Saved searches",
    admin: "Admin",
    login: "Log in",
    register: "Create account",
    logout: "Log out",
    signedInAs: "Signed in as",
    language: "Language",
  },
} as const;

export function AppMenu({
  locale,
  user,
  localeLabels,
  localeTitle,
}: {
  locale: AppLocale;
  user: MenuUser | null;
  localeLabels: Record<AppLocale, string>;
  localeTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const copy = menuCopy[locale];
  const displayName = user?.name?.trim() ? user.name : user?.email ?? "";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/88 text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.10)] backdrop-blur transition hover:border-slate-900"
        aria-label={copy.menu}
      >
        <span className="flex flex-col gap-1.5">
          <span className="block h-0.5 w-5 rounded-full bg-current" />
          <span className="block h-0.5 w-5 rounded-full bg-current" />
          <span className="block h-0.5 w-5 rounded-full bg-current" />
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-slate-950/28 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="ml-auto flex h-full w-[min(22rem,100%)] flex-col gap-5 border-l border-slate-900/10 bg-white p-5 shadow-[0_30px_80px_rgba(15,23,42,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">BranchesMap</p>
                {user ? (
                  <p className="mt-2 text-sm text-slate-600">
                    {copy.signedInAs}
                    <span className="ml-1 font-medium text-slate-900">{displayName}</span>
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-700 transition hover:bg-slate-200"
                aria-label={copy.close}
              >
                \u00d7
              </button>
            </div>

            <nav className="grid gap-2">
              <Link
                href={`/${locale}`}
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 transition hover:border-slate-900"
              >
                {copy.home}
              </Link>
              <Link
                href={`/${locale}/saved-searches`}
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 transition hover:border-slate-900"
              >
                {copy.savedSearches}
              </Link>
              <Link
                href={`/${locale}/admin/home-map`}
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 transition hover:border-slate-900"
              >
                {copy.admin}
              </Link>
            </nav>

            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.language}</p>
              <div className="mt-3">
                <LocaleSwitcher
                  currentLocale={locale}
                  labels={localeLabels}
                  title={localeTitle}
                />
              </div>
            </div>

            <div className="mt-auto grid gap-2">
              {user ? (
                <form action="/api/auth/logout" method="post">
                  <input type="hidden" name="locale" value={locale} />
                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    {copy.logout}
                  </button>
                </form>
              ) : (
                <>
                  <Link
                    href={`/${locale}/login`}
                    onClick={() => setOpen(false)}
                    className="rounded-2xl border border-slate-300 px-4 py-3 text-center text-sm font-medium text-slate-900 transition hover:border-slate-900"
                  >
                    {copy.login}
                  </Link>
                  <Link
                    href={`/${locale}/register`}
                    onClick={() => setOpen(false)}
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    {copy.register}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}