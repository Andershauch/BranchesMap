import Link from "next/link";
import { notFound } from "next/navigation";

import { isValidLocale, type AppLocale } from "@/lib/i18n/config";
import { requireCurrentUser } from "@/lib/server/auth";
import { listSavedSearchesForUser } from "@/lib/server/saved-searches";

type SavedSearchesPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const savedSearchesCopy = {
  da: {
    eyebrow: "Min konto",
    title: "Gemte s\u00f8gninger",
    intro: "Her samler vi de kommuner og s\u00f8gninger, du vil vende tilbage til.",
    emptyTitle: "Ingen gemte s\u00f8gninger endnu",
    emptyBody: "Start fra kortet eller en kommuneprofil og gem de steder, du vil holde \u00f8je med.",
    goToMap: "G\u00e5 til kortet",
    openMunicipality: "\u00c5bn kommune",
    remove: "Fjern",
    created: "Gemt",
    signedInAs: "Logget ind som",
    municipalityFallback: "Kommuneprofil",
  },
  en: {
    eyebrow: "My account",
    title: "Saved searches",
    intro: "This is where we keep the municipalities and searches you want to revisit.",
    emptyTitle: "No saved searches yet",
    emptyBody: "Start from the map or a municipality profile and save the places you want to keep an eye on.",
    goToMap: "Go to map",
    openMunicipality: "Open municipality",
    remove: "Remove",
    created: "Saved",
    signedInAs: "Signed in as",
    municipalityFallback: "Municipality profile",
  },
} as const;

function formatSavedDate(date: Date, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale === "da" ? "da-DK" : "en-US", {
    dateStyle: "medium",
  }).format(date);
}

export default async function SavedSearchesPage({ params }: SavedSearchesPageProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const activeLocale = locale as AppLocale;
  const copy = savedSearchesCopy[activeLocale];
  const user = await requireCurrentUser(`/${locale}/login?redirectTo=${encodeURIComponent(`/${locale}/saved-searches`)}`);
  const savedSearches = await listSavedSearchesForUser(user.id);
  const displayName = user.name?.trim() ? user.name : user.email;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f5ef_0%,#eef4f3_100%)] px-4 py-8 text-slate-900 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="rounded-[2rem] border border-slate-900/10 bg-white/92 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">{copy.eyebrow}</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{copy.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{copy.intro}</p>
            </div>
            <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.signedInAs}</p>
              <p className="mt-2 font-medium text-slate-900">{displayName}</p>
            </div>
          </div>
        </section>

        {savedSearches.length === 0 ? (
          <section className="rounded-[1.8rem] border border-dashed border-slate-300 bg-white/84 p-8 text-center shadow-[0_18px_60px_rgba(15,23,42,0.04)]">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{copy.emptyTitle}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">{copy.emptyBody}</p>
            <Link
              href={`/${locale}`}
              className="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              {copy.goToMap}
            </Link>
          </section>
        ) : (
          <section className="grid gap-4">
            {savedSearches.map((item) => {
              const municipalityHref = item.municipality
                ? `/${locale}/kommuner/${item.municipality.slug}`
                : `/${locale}`;

              return (
                <article
                  key={item.id}
                  className="rounded-[1.75rem] border border-slate-900/10 bg-white/92 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold tracking-tight text-slate-900">{item.title}</h2>
                      <p className="mt-2 text-sm text-slate-600">
                        {copy.created}: {formatSavedDate(item.createdAt, activeLocale)}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-slate-700">
                        {item.municipality?.name ?? copy.municipalityFallback}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={municipalityHref}
                        className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                      >
                        {copy.openMunicipality}
                      </Link>
                      <form action="/api/saved-searches" method="post">
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="savedSearchId" value={item.id} />
                        <input type="hidden" name="returnTo" value={`/${locale}/saved-searches`} />
                        <button
                          type="submit"
                          className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
                        >
                          {copy.remove}
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}