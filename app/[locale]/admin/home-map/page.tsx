import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import {
  homeMapLabelModes,
  type MunicipalityHomeMapLabelMode,
} from "@/lib/config/home-map-display";
import { getMunicipalityHomeMapAdminRows } from "@/lib/data/municipalities";
import { isValidLocale, type AppLocale } from "@/lib/i18n/config";
import { getRuntimeDictionary } from "@/lib/i18n/runtime-dictionaries";
import { requireAdminUser } from "@/lib/server/auth";

import { updateMunicipalityHomeMapAction } from "./actions";

export const dynamic = "force-dynamic";

type AdminHomeMapPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

function labelModeText(locale: AppLocale, mode: MunicipalityHomeMapLabelMode) {
  const labels = locale === "da"
    ? {
        nameOnly: "Kun navn",
        nameIcons: "Navn + ikoner",
        auto: "Auto",
      }
    : {
        nameOnly: "Name only",
        nameIcons: "Name + icons",
        auto: "Auto",
      };
  if (mode === "name-only") return labels.nameOnly;
  if (mode === "name-icons") return labels.nameIcons;
  return labels.auto;
}

function attractModeText(locale: AppLocale, value?: string) {
  return value ?? (locale === "da" ? "Brug i attract mode" : "Use in attract mode");
}

function advancedSettingsText(locale: AppLocale, value?: string) {
  return value ?? (locale === "da" ? "Avancerede visningsindstillinger" : "Advanced display settings");
}

function attractCountText(locale: AppLocale, value?: string) {
  return value ?? (locale === "da" ? "Attract-kommuner" : "Attract municipalities");
}

function inactiveCountText(locale: AppLocale, value?: string) {
  return value ?? (locale === "da" ? "Inaktive kommuner" : "Inactive municipalities");
}

export default async function AdminHomeMapPage({ params }: AdminHomeMapPageProps) {
  noStore();

  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const language = locale as AppLocale;
  const dictionary = await getRuntimeDictionary(language);
  const text = dictionary.adminHomeMap;
  const loginPath = `/${locale}/login?redirectTo=${encodeURIComponent(`/${locale}/admin/home-map`)}`;
  const currentUser = await requireAdminUser(loginPath);
  const municipalities = await getMunicipalityHomeMapAdminRows();

  const visibleCount = municipalities.filter((municipality) => municipality.homeMap.isPrimary).length;
  const attractCount = municipalities.filter((municipality) => municipality.homeMap.useInAttractMode).length;
  const inactiveCount = municipalities.filter((municipality) => !municipality.isActive).length;
  const displayName = currentUser.name?.trim() ? currentUser.name : currentUser.email;

  return (
    <AdminShell
      locale={language}
      currentSection="home-map"
      title={text.title}
      intro={text.intro}
      displayName={displayName}
      copyOverride={text}
    >
      <section className="grid gap-3 lg:grid-cols-3">
        <article className="rounded-[1.5rem] border border-slate-900/10 bg-slate-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{text.visibleCount}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{visibleCount}</p>
        </article>
        <article className="rounded-[1.5rem] border border-slate-900/10 bg-slate-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {attractCountText(language, text.attractCount)}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{attractCount}</p>
        </article>
        <article className="rounded-[1.5rem] border border-slate-900/10 bg-slate-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {inactiveCountText(language, text.inactiveCount)}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{inactiveCount}</p>
        </article>
      </section>

      <div className="grid gap-3">
        {municipalities.map((municipality) => (
          <form
            key={municipality.slug}
            action={updateMunicipalityHomeMapAction}
            className="rounded-[1.5rem] border border-slate-900/10 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)]"
          >
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="slug" value={municipality.slug} />

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,30rem)] lg:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-semibold text-slate-900">{municipality.name}</h2>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {municipality.code}
                  </span>
                  {municipality.homeMap.isPrimary ? (
                    <span className="rounded-full bg-teal-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-800">
                      {text.visible}
                    </span>
                  ) : null}
                  {municipality.homeMap.useInAttractMode ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">
                      {attractModeText(language, text.attractMode)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {text.active}:{" "}
                  <span className="font-semibold text-slate-700">
                    {municipality.isActive ? text.yes : text.no}
                  </span>
                </p>
              </div>

              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-800">
                    <input
                      type="checkbox"
                      name="visible"
                      defaultChecked={municipality.homeMap.isPrimary}
                      className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                    />
                    <span>{text.visible}</span>
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-800">
                    <input
                      type="checkbox"
                      name="attractMode"
                      defaultChecked={municipality.homeMap.useInAttractMode}
                      className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                    />
                    <span>{attractModeText(language, text.attractMode)}</span>
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    <span>{text.priority}</span>
                    <input
                      type="number"
                      name="priority"
                      min="1"
                      max="999"
                      defaultValue={municipality.homeMap.priority}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none transition focus:border-teal-500"
                    />
                  </label>
                </div>

                <div className="grid gap-2 rounded-[1.2rem] border border-slate-200 bg-slate-50/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {advancedSettingsText(language, text.advancedSettings)}
                  </p>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    <span>{text.labelMode}</span>
                    <select
                      name="labelMode"
                      defaultValue={municipality.homeMap.labelMode}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none transition focus:border-teal-500"
                    >
                      {homeMapLabelModes.map((mode) => (
                        <option key={municipality.slug + "-mode-" + mode} value={mode}>
                          {labelModeText(language, mode)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-stretch sm:justify-end">
              <button
                type="submit"
                className="w-full rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 sm:w-auto"
              >
                {text.save}
              </button>
            </div>
          </form>
        ))}
      </div>
    </AdminShell>
  );
}
