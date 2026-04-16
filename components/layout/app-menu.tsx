"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { isRtlLocale, type AppLocale } from "@/lib/i18n/config";
import { getDictionarySync } from "@/lib/i18n/dictionaries";
import { logoutAction } from "@/lib/server/auth-actions";

type MenuUser = {
  email: string;
  name: string | null;
  role: "user" | "admin";
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

function detectStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function MenuLink({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block rounded-xl px-3 py-3 text-start text-base font-medium text-[var(--md-sys-color-on-surface)] transition hover:bg-[var(--md-sys-color-surface-container)]"
    >
      {label}
    </Link>
  );
}

export function AppMenu({
  locale,
  user,
}: {
  locale: AppLocale;
  user: MenuUser | null;
}) {
  const [open, setOpen] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(detectStandaloneMode);
  const copy = getDictionarySync(locale).menu;
  const isRtl = isRtlLocale(locale);
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

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setIsStandalone(true);
      setInstallPromptEvent(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  function closeMenu() {
    setOpen(false);
  }

  async function handleInstall() {
    if (!installPromptEvent) {
      return;
    }

    await installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice;

    if (choice.outcome !== "accepted") {
      return;
    }

    setInstallPromptEvent(null);
    setOpen(false);
  }

  const drawer = (
    <div className="fixed inset-0 z-[100]" dir={isRtl ? "rtl" : "ltr"}>
      <button
        type="button"
        aria-label={copy.close}
        onClick={closeMenu}
        className="absolute inset-0 bg-slate-950/48 backdrop-blur-[2px]"
      />

      <aside
        className={`absolute inset-y-0 z-[101] flex h-full w-[min(18.5rem,calc(100vw-1.5rem))] flex-col overflow-y-auto bg-[color:rgba(255,255,255,0.86)] px-4 py-5 shadow-[0_20px_60px_rgba(15,23,42,0.22)] backdrop-blur-2xl ${
          isRtl ? "right-0 border-l" : "left-0 border-r"
        } border-white/65`}
      >
        <div className="flex items-center justify-between gap-4 pb-4">
          <div className="min-w-0 text-start">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--md-sys-color-primary)]">
              BranchesMap
            </p>
            {user ? (
              <p className="mt-1 text-sm text-[var(--md-sys-color-on-surface-variant)]">
                {copy.signedInAs}
                <span className={`${isRtl ? "mr-1" : "ml-1"} font-medium text-[var(--md-sys-color-on-surface)]`}>
                  {displayName}
                </span>
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={closeMenu}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/88 text-base font-semibold text-[var(--md-sys-color-on-surface)] shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:bg-white"
            aria-label={copy.close}
          >
            X
          </button>
        </div>

        <div className="border-t border-[var(--md-sys-color-outline-variant)] pt-4">
          <p className="px-3 text-start text-xs font-semibold uppercase tracking-[0.18em] text-[var(--md-sys-color-on-surface-variant)]">
            {copy.navigation}
          </p>
          <nav className="mt-2 grid gap-1">
            <MenuLink href={`/${locale}`} label={copy.home} onClick={closeMenu} />
            <MenuLink href={`/${locale}/follows`} label={copy.follows} onClick={closeMenu} />
            {user?.role === "admin" ? (
              <MenuLink href={`/${locale}/admin/home-map`} label={copy.admin} onClick={closeMenu} />
            ) : null}
          </nav>
        </div>

        <div className="mt-6 border-t border-[var(--md-sys-color-outline-variant)] pt-4">
          <p className="px-3 text-start text-xs font-semibold uppercase tracking-[0.18em] text-[var(--md-sys-color-on-surface-variant)]">
            PWA
          </p>
          <div className="mt-3 px-1">
            {isStandalone ? (
              <p className="rounded-2xl border border-white/60 bg-white/72 px-4 py-3 text-start text-sm text-[var(--md-sys-color-on-surface-variant)]">
                {copy.installed}
              </p>
            ) : installPromptEvent ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleInstall}
                  className="w-full rounded-full bg-[var(--md-sys-color-primary)] px-4 py-3 text-sm font-semibold text-[var(--md-sys-color-on-primary)] transition hover:opacity-95"
                >
                  {copy.install}
                </button>
                <p className="px-3 text-start text-xs leading-5 text-[var(--md-sys-color-on-surface-variant)]">
                  {copy.installReady}
                </p>
              </div>
            ) : (
              <p className="rounded-2xl border border-white/60 bg-white/72 px-4 py-3 text-start text-sm leading-6 text-[var(--md-sys-color-on-surface-variant)]">
                {copy.installHint}
              </p>
            )}
          </div>
        </div>

        <div className="mt-auto border-t border-[var(--md-sys-color-outline-variant)] pt-4">
          {user ? (
            <form action={logoutAction}>
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
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/70 text-[var(--md-sys-color-on-surface)] shadow-[0_10px_22px_rgba(15,23,42,0.1)] backdrop-blur-xl transition hover:bg-white/84 sm:h-11 sm:w-11"
        aria-label={copy.menu}
      >
        <span className="flex flex-col gap-[0.3rem]">
          <span className="block h-0.5 w-[1.05rem] rounded-full bg-current" />
          <span className="block h-0.5 w-[1.05rem] rounded-full bg-current" />
          <span className="block h-0.5 w-[1.05rem] rounded-full bg-current" />
        </span>
      </button>

      {open && typeof document !== "undefined" ? createPortal(drawer, document.body) : null}
    </>
  );
}
