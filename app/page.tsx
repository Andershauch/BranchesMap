import Link from "next/link";

import { SjaellandMunicipalityMap } from "@/components/maps/sjaelland-municipality-map";
import { getMunicipalitySummaries } from "@/lib/data/municipalities";
import { sjaellandMunicipalityFeatureCollection } from "@/lib/geo/sjaelland";

export default async function Home() {
  const municipalities = await getMunicipalitySummaries();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f5ef_0%,#eef4f3_100%)] px-6 py-12 text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-900/10 bg-white/90 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">
            BranchesMap POC
          </p>
          <div className="mt-4 max-w-4xl">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Kommunekort med rigtige grænser for Sjælland
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-700">
              Kortet bruger nu officielle kommunegeometrier fra Dataforsyningen.
              Hver kommune kan klikkes direkte, og de tre mest repræsenterede
              brancher vises som ikonbadge oven på fladen.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-700">
            <span className="rounded-full border border-slate-300 px-4 py-2">
              {municipalities.length} kommuner i kortet
            </span>
            <span className="rounded-full border border-slate-300 px-4 py-2">
              {sjaellandMunicipalityFeatureCollection.features.length} officielle kommunegrænser
            </span>
            <span className="rounded-full border border-slate-300 px-4 py-2">
              Geometri fra Dataforsyningen/DAWA
            </span>
            <Link
              href="/api/utf8"
              className="rounded-full bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-700"
            >
              Test UTF-8 API
            </Link>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-900/10 bg-white/90 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.06)] sm:p-8">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Kommunekort</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Dette er POC-versionens rigtige geolag. Bornholm og
                Lolland-Falster er bevidst udeladt, fordi scope her er selve
                Sjælland og Amager-kommunerne.
              </p>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate-600">
              Næste iteration kan bruge samme struktur til mere præcise labels,
              søgning, zoom og senere live-data pr. kommune.
            </p>
          </div>

          <SjaellandMunicipalityMap municipalities={municipalities} />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {municipalities.map((municipality) => (
            <Link
              key={municipality.slug}
              href={`/kommuner/${municipality.slug}`}
              className="rounded-[1.5rem] border border-slate-900/10 bg-white/85 p-5 transition hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{municipality.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {municipality.teaser}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {municipality.totalJobs} mock-jobs
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {municipality.topIndustries.map((industry) => (
                  <span
                    key={`${municipality.slug}-${industry.slug}-badge`}
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium text-white"
                    style={{ backgroundColor: industry.accentColor }}
                  >
                    <span>{industry.icon}</span>
                    <span>{industry.name}</span>
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}