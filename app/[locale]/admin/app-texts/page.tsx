import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { isValidLocale, locales, type AppLocale } from "@/lib/i18n/config";
import { getRuntimeDictionary } from "@/lib/i18n/runtime-dictionaries";
import { requireAdminUser } from "@/lib/server/auth";
import { listAppTextTranslations } from "@/lib/server/app-text-translations";

import { updateAppTextTranslationAction } from "./actions";

export const dynamic = "force-dynamic";

const editableLocales = locales;
type EditableLocale = (typeof editableLocales)[number];
const editableFilters = ["all", "missing", "overridden"] as const;
type EditableFilter = (typeof editableFilters)[number];

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
    : "da";
}

function getFilter(value: string | string[] | undefined): EditableFilter {
  return typeof value === "string" && editableFilters.includes(value as EditableFilter)
    ? (value as EditableFilter)
    : "all";
}

function getGroup(value: string | string[] | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function summaryText(template: string, count: number, total: number) {
  return template.replace("{count}", String(count)).replace("{total}", String(total));
}

function buildDefaultCopy(locale: AppLocale) {
  if (locale === "da") {
    return {
      title: "Admin: systemtekster",
      intro:
        "Rediger appens tekster direkte i databasen. Brug dette som runtime-kilde i stedet for at være afhængig af versionsfiler for små rettelser.",
      searchPlaceholder: "Søg efter nøgle eller tekst",
      localeLabel: "Sprog",
      filterLabel: "Filter",
      filterAll: "Alle",
      filterMissing: "Mangler værdi",
      filterOverridden: "Afviger fra fil",
      groupAll: "Alle grupper",
      statusLabel: "Status",
      statusMatches: "Matcher fil",
      statusOverridden: "Afviger",
      statusMissing: "Mangler værdi",
      placeholdersLabel: "Placeholders",
      keyLabel: "Nøgle",
      groupLabel: "Gruppe",
      baseValueLabel: "Filværdi",
      valueLabel: "Runtime-værdi",
      save: "Gem",
      search: "Søg",
      saved: "Systemtekst gemt.",
      empty: "Ingen systemtekster matcher filteret.",
      summary: "Viser {count} af {total} systemtekster",
      previous: "Forrige",
      next: "Næste",
    };
  }

  return {
    title: "Admin: system texts",
    intro:
      "Edit the app text directly in the database. Use this as the runtime source instead of depending on versioned files for small copy fixes.",
    searchPlaceholder: "Search by key or text",
    localeLabel: "Language",
    filterLabel: "Filter",
    filterAll: "All",
    filterMissing: "Missing value",
    filterOverridden: "Differs from file",
    groupAll: "All groups",
    statusLabel: "Status",
    statusMatches: "Matches file",
    statusOverridden: "Overridden",
    statusMissing: "Missing value",
    placeholdersLabel: "Placeholders",
    keyLabel: "Key",
    groupLabel: "Group",
    baseValueLabel: "File value",
    valueLabel: "Runtime value",
    save: "Save",
    search: "Search",
    saved: "System text saved.",
    empty: "No system texts match the current filter.",
    summary: "Showing {count} of {total} system texts",
    previous: "Previous",
    next: "Next",
  };
}

export default async function AdminAppTextsPage({ params, searchParams }: PageProps) {
  noStore();

  const { locale } = await params;
  if (!isValidLocale(locale)) {
    notFound();
  }

  const pageLocale = locale as AppLocale;
  const dictionary = await getRuntimeDictionary(pageLocale);
  const text = {
    ...buildDefaultCopy(pageLocale),
    ...(dictionary.adminAppTexts ?? {}),
  };
  const search = await searchParams;
  const query = getStringParam(search.q);
  const page = getPageParam(search.page);
  const targetLocale = getTargetLocale(search.target);
  const filter = getFilter(search.filter);
  const group = getGroup(search.group);
  const saved = getStringParam(search.saved) === "1";
  const errorMessage = getStringParam(search.error);

  const currentUser = await requireAdminUser(
    `/${locale}/login?redirectTo=${encodeURIComponent(`/${locale}/admin/app-texts`)}`,
  );
  const displayName = currentUser.name?.trim() ? currentUser.name : currentUser.email;

  const result = await listAppTextTranslations({
    query,
    page,
    pageSize: 25,
    locale: targetLocale,
    filter,
    group,
  });

  const baseParams = new URLSearchParams();
  if (query) baseParams.set("q", query);
  if (targetLocale) baseParams.set("target", targetLocale);
  if (filter !== "all") baseParams.set("filter", filter);
  if (group) baseParams.set("group", group);

  return (
    <AdminShell
      locale={pageLocale}
      currentSection="app-texts"
      title={text.title}
      intro={text.intro}
      displayName={displayName}
      copyOverride={dictionary.adminHomeMap}
    >
      <form className="grid gap-3 rounded-[1.4rem] border border-slate-900/10 bg-slate-50/80 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_10rem_12rem_12rem_auto]">
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
                {localeCode.toUpperCase()}
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
            <option value="overridden">{text.filterOverridden}</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          <span>{text.groupLabel}</span>
          <select
            name="group"
            defaultValue={group}
            className="rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none transition focus:border-teal-500"
          >
            <option value="">{text.groupAll}</option>
            {result.availableGroups.map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.key}
              </option>
            ))}
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
          <span className="rounded-full bg-slate-100 px-3 py-1">{targetLocale.toUpperCase()}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">
            {filter === "all" ? text.filterAll : filter === "missing" ? text.filterMissing : text.filterOverridden}
          </span>
          {group ? <span className="rounded-full bg-slate-100 px-3 py-1">{group}</span> : null}
        </div>
        {saved ? <p className="font-medium text-teal-700">{text.saved}</p> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/${locale}/admin/app-texts?${new URLSearchParams({
            ...Object.fromEntries(baseParams.entries()),
            group: "",
          }).toString()}`}
          className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            !group ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {text.groupAll}
        </Link>
        {result.availableGroups.map((entry) => {
          const params = new URLSearchParams(Object.fromEntries(baseParams.entries()));
          params.set("group", entry.key);

          return (
            <Link
              key={entry.key}
              href={`/${locale}/admin/app-texts?${params.toString()}`}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                group === entry.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>{entry.key}</span>
              <span className={`rounded-full px-1.5 py-0.5 ${group === entry.key ? "bg-white/18" : "bg-white"}`}>
                {entry.count}
              </span>
            </Link>
          );
        })}
      </div>

      {errorMessage ? (
        <div className="rounded-[1.35rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {result.rows.length === 0 ? (
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-600">
          {text.empty}
        </div>
      ) : (
        <div className="grid gap-3">
          {result.rows.map((row) => (
            <form
              key={row.key}
              action={updateAppTextTranslationAction}
              className="grid gap-4 rounded-[1.5rem] border border-slate-900/10 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)]"
            >
              <input type="hidden" name="pageLocale" value={pageLocale} />
              <input type="hidden" name="targetLocale" value={targetLocale} />
              <input type="hidden" name="key" value={row.key} />
              <input type="hidden" name="query" value={query} />
              <input type="hidden" name="page" value={String(result.page)} />
              <input type="hidden" name="filter" value={filter} />
              <input type="hidden" name="group" value={group} />

              <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)_minmax(0,1.15fr)_auto] lg:items-start">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{text.keyLabel}</p>
                  <p dir="auto" className="mt-1 text-sm font-semibold text-slate-900">{row.key}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {text.groupLabel}: <span className="font-medium text-slate-700">{row.group}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                      {text.statusLabel}:{" "}
                      {row.isMissing
                        ? text.statusMissing
                        : row.isOverridden
                          ? text.statusOverridden
                          : text.statusMatches}
                    </span>
                    {row.placeholders.length > 0 ? (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">
                        {text.placeholdersLabel}: {row.placeholders.join(" ")}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{text.baseValueLabel}</p>
                  <p dir="auto" className="mt-1 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {row.baseValue || "—"}
                  </p>
                </div>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {text.valueLabel} ({targetLocale.toUpperCase()})
                  </span>
                  <textarea
                    name="value"
                    dir="auto"
                    defaultValue={row[targetLocale]}
                    rows={3}
                    className={`min-h-28 rounded-xl border bg-white px-3 py-3 text-sm outline-none transition focus:border-teal-500 ${
                      row.isMissing
                        ? "border-amber-300"
                        : row.isOverridden
                          ? "border-teal-300"
                          : "border-slate-300"
                    }`}
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
                href={`/${locale}/admin/app-texts?${new URLSearchParams({
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
                href={`/${locale}/admin/app-texts?${new URLSearchParams({
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
    </AdminShell>
  );
}
