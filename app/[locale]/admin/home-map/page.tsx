import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";

import {
  homeMapLabelModes,
  homeMapRegionTags,
  type MunicipalityHomeMapLabelMode,
  type MunicipalityHomeMapRegionTag,
} from "@/lib/config/home-map-display";
import { getMunicipalityHomeMapAdminRows } from "@/lib/data/municipalities";
import { isValidLocale, type AppLocale } from "@/lib/i18n/config";
import { getDictionarySync } from "@/lib/i18n/dictionaries";
import { requireAdminUser } from "@/lib/server/auth";

import { updateMunicipalityHomeMapAction } from "./actions";

export const dynamic = "force-dynamic";

type AdminHomeMapPageProps = {

  params: Promise<{
    locale: string;
  }>;
};

function labelModeText(locale: AppLocale, mode: MunicipalityHomeMapLabelMode) {
  const labels = getDictionarySync(locale).adminHomeMap;
  if (mode === "name-only") return labels.nameOnly;
  if (mode === "name-icons") return labels.nameIcons;
  return labels.auto;
}

function regionText(region: MunicipalityHomeMapRegionTag) {
  return region;
}

export default async function AdminHomeMapPage({ params }: AdminHomeMapPageProps) {
  noStore();

  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const language = locale as AppLocale;
  const text = getDictionarySync(language).adminHomeMap;
  const loginPath = `/${locale}/login?redirectTo=${encodeURIComponent(`/${locale}/admin/home-map`)}`;
  await requireAdminUser(loginPath);

  const municipalities = await getMunicipalityHomeMapAdminRows();
  const visibleCount = municipalities.filter((municipality) => municipality.homeMap.isPrimary).length;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f5ef_0%,#eef4f3_100%)] px-3 py-3 text-slate-900 sm:px-4 sm:py-4">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 rounded-[2rem] border border-slate-900/10 bg-white/92 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-700">BranchesMap Admin</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{text.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{text.intro}</p>
          </div>
          <Link
            href={`/${locale}`}
            className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-200"
          >
            {text.back}
          </Link>
        </div>
        <div className="flex flex-col gap-3 rounded-[1.4rem] border border-slate-900/10 bg-slate-50/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">{text.signedInAs}</p>
            <p className="mt-1 text-sm text-slate-600">
              {text.visibleCount}: <span className="font-semibold text-slate-900">{visibleCount}</span>
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          {municipalities.map((municipality) => (
            <form
              key={municipality.slug}
              action={updateMunicipalityHomeMapAction}
              className="rounded-[1.5rem] border border-slate-900/10 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)]"
            >
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="slug" value={municipality.slug} />

              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">{municipality.name}</h2>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {municipality.code}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {text.active}: <span className="font-semibold text-slate-700">{municipality.isActive ? text.yes : text.no}</span>
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-800">
                    <input
                      type="checkbox"
                      name="visible"
                      defaultChecked={municipality.homeMap.isPrimary}
                      className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                    />
                    <span>{text.visible}</span>
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

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    <span>{text.region}</span>
                    <select
                      name="regionTag"
                      defaultValue={municipality.homeMap.regionTag}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none transition focus:border-teal-500"
                    >
                      {homeMapRegionTags.map((regionTag) => (
                        <option key={municipality.slug + "-region-" + regionTag} value={regionTag}>
                          {regionText(regionTag)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  {text.save}
                </button>
              </div>
            </form>
          ))}
        </div>
      </section>
    </main>
  );
}
