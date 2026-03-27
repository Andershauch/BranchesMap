"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

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
    follows: "F\u00f8lger",
    admin: "Admin",
    login: "Log ind",
    register: "Opret bruger",
    logout: "Log ud",
    signedInAs: "Logget ind som",
    language: "Sprog",
    navigation: "Navigation",
  },
  en: {
    menu: "Menu",
    close: "Close menu",
    home: "Map",
    follows: "Following",
    admin: "Admin",
    login: "Log in",
    register: "Create account",
    logout: "Log out",
    signedInAs: "Signed in as",
    language: "Language",
    navigation: "Navigation",
  },
} as const;

function MenuLink({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block rounded-xl px-3 py-3 text-base font-medium text-[var(--md-sys-color-on-surface)] transition hover:bg-[var(--md-sys-color-surface-container)]"
    >
      {label}
    </Link>
  );
}

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

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  const drawer = (
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label={copy.close}
        onClick={closeMenu}
        className="absolute inset-0 bg-slate-950/42"
      />

      <aside className="absolute inset-y-0 left-0 z-[101] flex h-full w-[min(18.5rem,calc(100vw-1.5rem))] flex-col overflow-y-auto border-r border-[var(--md-sys-color-outline-variant)] bg-white px-4 py-5 shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
        <div className="flex items-center justify-between gap-4 pb-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--md-sys-color-primary)]">
              BranchesMap
            </p>
            {user ? (
              <p className="mt-1 text-sm text-[var(--md-sys-color-on-surface-variant)]">
                {copy.signedInAs}
                <span className="ml-1 font-medium text-[var(--md-sys-color-on-surface)]">{displayName}</span>
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={closeMenu}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--md-sys-color-surface-container-low)] text-base font-semibold text-[var(--md-sys-color-on-surface)] transition hover:bg-[var(--md-sys-color-surface-container)]"
            aria-label={copy.close}
          >
            X
          </button>
        </div>

        <div className="border-t border-[var(--md-sys-color-outline-variant)] pt-4">
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--md-sys-color-on-surface-variant)]">
            {copy.navigation}
          </p>
          <nav className="mt-2 grid gap-1">
            <MenuLink href={`/${locale}`} label={copy.home} onClick={closeMenu} />
            <MenuLink href={`/${locale}/follows`} label={copy.follows} onClick={closeMenu} />
            <MenuLink href={`/${locale}/admin/home-map`} label={copy.admin} onClick={closeMenu} />
          </nav>
        </div>

        <div className="mt-6 border-t border-[var(--md-sys-color-outline-variant)] pt-4">
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--md-sys-color-on-surface-variant)]">
            {copy.language}
          </p>
          <div className="mt-3 px-1">
            <LocaleSwitcher currentLocale={locale} labels={localeLabels} title={localeTitle} />
          </div>
        </div>

        <div className="mt-auto border-t border-[var(--md-sys-color-outline-variant)] pt-4">
          {user ? (
            <form action="/api/auth/logout" method="post">
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="w-full rounded-full bg-[var(--md-sys-color-primary)] px-4 py-3 text-sm font-semibold text-[var(--md-sys-color-on-primary)] transition hover:opacity-95"
              >
                {copy.logout}
              </button>
            </form>
          ) : (
            <div className="grid gap-1">
              <MenuLink href={`/${locale}/login`} label={copy.login} onClick={closeMenu} />
              <Link
                href={`/${locale}/register`}
                onClick={closeMenu}
                className="mt-2 rounded-full bg-[var(--md-sys-color-primary)] px-4 py-3 text-center text-sm font-semibold text-[var(--md-sys-color-on-primary)] transition hover:opacity-95"
              >
                {copy.register}
              </Link>
            </div>
          )}
        </div>
      </aside>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] shadow-[0_1px_3px_var(--md-sys-color-shadow)] transition hover:bg-[var(--md-sys-color-surface-container-highest)]"
        aria-label={copy.menu}
      >
        <span className="flex flex-col gap-1.5">
          <span className="block h-0.5 w-5 rounded-full bg-current" />
          <span className="block h-0.5 w-5 rounded-full bg-current" />
          <span className="block h-0.5 w-5 rounded-full bg-current" />
        </span>
      </button>

      {open && typeof document !== "undefined" ? createPortal(drawer, document.body) : null}
    </>
  );
}