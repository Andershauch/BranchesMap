import Link from "next/link";

import { getCurrentUser } from "@/lib/server/auth";
import type { AppLocale } from "@/lib/i18n/config";

const authStatusCopy = {
  da: {
    signedInAs: "Logget ind som",
    savedSearches: "Gemte s\u00f8gninger",
    login: "Log ind",
    register: "Opret bruger",
    logout: "Log ud",
  },
  en: {
    signedInAs: "Signed in as",
    savedSearches: "Saved searches",
    login: "Log in",
    register: "Create account",
    logout: "Log out",
  },
} as const;

export async function AuthStatus({ locale }: { locale: AppLocale }) {
  const user = await getCurrentUser();
  const copy = authStatusCopy[locale];

  if (!user) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href={`/${locale}/login`}
          className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
        >
          {copy.login}
        </Link>
        <Link
          href={`/${locale}/register`}
          className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          {copy.register}
        </Link>
      </div>
    );
  }

  const displayName = user.name?.trim() ? user.name : user.email;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className="hidden max-w-[18rem] items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm sm:inline-flex">
        <span className="text-slate-500">{copy.signedInAs}</span>
        <span className="truncate font-medium text-slate-900">{displayName}</span>
      </div>
      <Link
        href={`/${locale}/saved-searches`}
        className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-900 transition hover:border-teal-400 hover:bg-teal-100"
      >
        {copy.savedSearches}
      </Link>
      <form action="/api/auth/logout" method="post">
        <input type="hidden" name="locale" value={locale} />
        <button
          type="submit"
          className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
        >
          {copy.logout}
        </button>
      </form>
    </div>
  );
}