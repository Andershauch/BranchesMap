import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";

import { isValidLocale, type AppLocale } from "@/lib/i18n/config";
import { getDictionarySync } from "@/lib/i18n/dictionaries";
import { requireAdminUser } from "@/lib/server/auth";
import { listJobindsatsTitleTranslations } from "@/lib/server/jobindsats-title-translations";

import { updateJobindsatsTitleTranslationAction } from "./actions";

export const dynamic = "force-dynamic";

const editableLocales = ["en", "uk", "ar", "fa", "ur", "pl", "de"] as const;
type EditableLocale = (typeof editableLocales)[number];
const editableFilters = ["all", "missing", "new"] as const;
type EditableFilter = (typeof editableFilters)[number];

const adminLocaleLabelsDa: Record<EditableLocale, string> = {
  en: "Engelsk",
  uk: "Ukrainsk",
  ar: "Arabisk",
  fa: "Farsi",
  ur: "Urdu",
  pl: "Polsk",
  de: "Tysk",
};

const adminLocaleLabelsEn: Record<EditableLocale, string> = {
  en: "English",
  uk: "Ukrainian",
  ar: "Arabic",
  fa: "Farsi",
  ur: "Urdu",
  pl: "Polish",
  de: "German",
};

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(value: string | string[] | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function getPageParam(value: string | string[] | undefined) {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function getTargetLocale(value: string | string[] | undefined): EditableLocale {
  return typeof value === "string" && editableLocales.includes(value as EditableLocale)
    ? (value as EditableLocale)
    : "ar";
}

function getFilter(value: string | string[] | undefined): EditableFilter {
  return typeof value === "string" && editableFilters.includes(value as EditableFilter)
    ? (value as EditableFilter)
    : "all";
}

function summaryText(template: string, count: number, total: number) {
  return template.replace("{count}", String(count)).replace("{total}", String(total));
}

export default async function AdminJobindsatsTitlesPage({ params, searchParams }: PageProps) {
  noStore();

  const { locale } = await params;
  if (!isValidLocale(locale)) {
    notFound();
  }

  const pageLocale = locale as AppLocale;
  const dictionary = getDictionarySync(pageLocale);
  const adminLocaleLabels = pageLocale === "da" ? adminLocaleLabelsDa : adminLocaleLabelsEn;
  const text = dictionary.adminJobindsatsTitles;
  const adminHomeMapText = dictionary.adminHomeMap;
  const search = await searchParams;
  const query = getStringParam(search.q);
  const page = getPageParam(search.page);
  const targetLocale = getTargetLocale(search.target);
  const filter = getFilter(search.filter);
  const saved = getStringParam(search.saved) === "1";

  await requireAdminUser(`/${locale}/login?redirectTo=${encodeURIComponent(`/${locale}/admin/jobindsats-titles`)}`);

  const result = await listJobindsatsTitleTranslations({
    query,
    page,
    pageSize: 25,
    locale: targetLocale,
    filter,
  });

  const baseParams = new URLSearchParams();
  if (query) baseParams.set("q", query);
  if (targetLocale) baseParams.set("target", targetLocale);
  if (filter !== "all") baseParams.set("filter", filter);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f5ef_0%,#eef4f3_100%)] px-3 py-3 text-slate-900 sm:px-4 sm:py-4">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 rounded-[2rem] border border-slate-900/10 bg-white/92 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-700">
              {adminHomeMapText.eyebrow}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{text.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{text.intro}</p>
          </div>
          <Link
            href={`/${locale}/admin/home-map`}
            className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-200"
          >
            {text.back}
          </Link>
        </div>

        <form className="grid gap-3 rounded-[1.4rem] border border-slate-900/10 bg-slate-50/80 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            <span>{text.searchPlaceholder}</span>
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder={text.searchPlaceholder}
              className="rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none transition focus:border-teal-500"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            <span>{text.localeLabel}</span>
            <select
              name="target"
              defaultValue={targetLocale}
              className="rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none transition focus:border-teal-500"
            >
              {editableLocales.map((localeCode) => (
                <option key={localeCode} value={localeCode}>
                  {adminLocaleLabels[localeCode]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            <span>{text.filterLabel}</span>
            <select
              name="filter"
              defaultValue={filter}
              className="rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none transition focus:border-teal-500"
            >
              <option value="all">{text.filterAll}</option>
              <option value="missing">{text.filterMissing}</option>
              <option value="new">{text.filterNew}</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              {text.search}
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <p>{summaryText(text.summary, result.rows.length, result.total)}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1">{adminLocaleLabels[targetLocale]}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">
              {filter === "all" ? text.filterAll : filter === "missing" ? text.filterMissing : text.filterNew}
            </span>
          </div>
          {saved ? <p className="font-medium text-teal-700">{text.saved}</p> : null}
        </div>

        {result.rows.length === 0 ? (
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-600">
            {text.empty}
          </div>
        ) : (
          <div className="grid gap-3">
            {result.rows.map((row) => (
              <form
                key={row.daKey}
                action={updateJobindsatsTitleTranslationAction}
                className="grid gap-4 rounded-[1.5rem] border border-slate-900/10 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)]"
              >
                <input type="hidden" name="pageLocale" value={pageLocale} />
                <input type="hidden" name="targetLocale" value={targetLocale} />
                <input type="hidden" name="daKey" value={row.daKey} />
                <input type="hidden" name="query" value={query} />
                <input type="hidden" name="page" value={String(result.page)} />
                <input type="hidden" name="filter" value={filter} />

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)_minmax(0,1.15fr)_auto] lg:items-start">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{text.sourceLabel}</p>
                    <p dir="auto" className="mt-1 text-sm font-semibold text-slate-900">{row.daKey}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{text.englishLabel}</p>
                    <p dir="auto" className="mt-1 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{row.en}</p>
                  </div>
                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {text.translationLabel} ({adminLocaleLabels[targetLocale]})
                    </span>
                    <textarea
                      name="value"
                      dir="auto"
                      defaultValue={(row as Record<EditableLocale, string | null>)[targetLocale] ?? ""}
                      rows={3}
                      className="min-h-28 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-teal-500"
                    />
                  </label>
                  <div className="flex items-start lg:justify-end">
                    <button
                      type="submit"
                      className="inline-flex rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      {text.save}
                    </button>
                  </div>
                </div>
              </form>
            ))}
          </div>
        )}

        {result.pageCount > 1 ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              {result.page > 1 ? (
                <Link
                  href={`/${locale}/admin/jobindsats-titles?${new URLSearchParams({
                    ...Object.fromEntries(baseParams.entries()),
                    page: String(result.page - 1),
                  }).toString()}`}
                  className="inline-flex rounded-full bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-200"
                >
                  {text.previous}
                </Link>
              ) : null}
            </div>
            <div>
              {result.page < result.pageCount ? (
                <Link
                  href={`/${locale}/admin/jobindsats-titles?${new URLSearchParams({
                    ...Object.fromEntries(baseParams.entries()),
                    page: String(result.page + 1),
                  }).toString()}`}
                  className="inline-flex rounded-full bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-200"
                >
                  {text.next}
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
