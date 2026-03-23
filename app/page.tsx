import Link from "next/link";

import { getMunicipalitySummaries } from "@/lib/data/municipalities";

export default async function Home() {
  const municipalities = await getMunicipalitySummaries();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f5ef_0%,#eef4f3_100%)] px-6 py-12 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-900/10 bg-white/90 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">
            BranchesMap POC
          </p>
          <div className="mt-4 max-w-4xl">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Første klikbare kommunekort for Sjælland
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-700">
              Kortet bruger mock-data, men er bygget i den struktur vi senere kan
              koble direkte på Prisma og Neon. Hver markør viser de tre brancher,
              der er mest repræsenteret i kommunen i denne POC.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-700">
            <span className="rounded-full border border-slate-300 px-4 py-2">
              {municipalities.length} kommuner i første kortlag
            </span>
            <span className="rounded-full border border-slate-300 px-4 py-2">
              Mock-data med danske tegn og danske jobs
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
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold">Kommunekort</h2>
            <p className="max-w-md text-sm leading-6 text-slate-600">
              Positionerne er et tidligt POC-kortlag. Næste iteration kan skifte
              til rigtige kommunegrænser uden at ændre resten af appens struktur.
            </p>
          </div>

          <div className="relative aspect-[10/8] overflow-hidden rounded-[1.75rem] bg-[radial-gradient(circle_at_top,#d9efe8_0%,#bddad1_35%,#98c1b5_100%)]">
            <div className="absolute inset-[7%_10%_8%_10%] rounded-[44%_56%_52%_48%/34%_42%_58%_66%] border border-white/45 bg-[radial-gradient(circle_at_40%_30%,rgba(255,255,255,0.9),rgba(255,255,255,0.15))] shadow-[inset_0_0_60px_rgba(255,255,255,0.25)]" />
            <div className="absolute inset-[11%_14%_16%_16%] rounded-[42%_58%_60%_40%/32%_39%_61%_68%] border border-slate-900/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(15,23,42,0.04))]" />

            {municipalities.map((municipality) => (
              <Link
                key={municipality.slug}
                href={`/kommuner/${municipality.slug}`}
                className="group absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${municipality.mapX}%`, top: `${municipality.mapY}%` }}
              >
                <span className="absolute -top-7 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-white/90 px-2 py-1 shadow-sm ring-1 ring-slate-900/10">
                  {municipality.topIndustries.map((industry) => (
                    <span key={`${municipality.slug}-${industry.slug}`}>{industry.icon}</span>
                  ))}
                </span>
                <span className="mx-auto block h-3.5 w-3.5 rounded-full bg-slate-900 ring-4 ring-white transition group-hover:scale-125 group-hover:bg-teal-700" />
                <span className="mt-3 block rounded-full bg-white/92 px-3 py-1 text-xs font-medium text-slate-800 shadow-sm ring-1 ring-slate-900/10 transition group-hover:-translate-y-0.5">
                  {municipality.name}
                </span>
              </Link>
            ))}
          </div>
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