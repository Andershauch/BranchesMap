import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getMunicipalityBySlug,
  getMunicipalitySummaries,
} from "@/lib/data/municipalities";

type MunicipalityPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const municipalities = await getMunicipalitySummaries();

  return municipalities.map((municipality) => ({
    slug: municipality.slug,
  }));
}

export default async function MunicipalityPage({ params }: MunicipalityPageProps) {
  const { slug } = await params;
  const municipality = await getMunicipalityBySlug(slug);

  if (!municipality) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f5ef_0%,#eef4f3_100%)] px-6 py-12 text-slate-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="rounded-[2rem] border border-slate-900/10 bg-white/90 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
          <Link
            href="/"
            className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
          >
            Tilbage til kortet
          </Link>
          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">
                Kommuneprofil
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                {municipality.name}
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-700">
                {municipality.teaser}
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-slate-950 px-5 py-4 text-slate-100">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                POC-status
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Branchefordeling og jobs er mock-data, men strukturen følger den
                model, vi senere kan seede til Prisma.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {municipality.topIndustries.map((industry) => (
            <article
              key={`${municipality.slug}-${industry.slug}`}
              className="rounded-[1.5rem] border border-slate-900/10 bg-white/85 p-5"
            >
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full text-xl text-white"
                  style={{ backgroundColor: industry.accentColor }}
                >
                  {industry.icon}
                </span>
                <div>
                  <h2 className="text-lg font-semibold">{industry.name}</h2>
                  <p className="text-sm text-slate-600">
                    {industry.jobCount} estimerede stillinger i POC-versionen
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-6">
          {municipality.jobsByIndustry.map(({ industry, jobs }) => (
            <article
              key={`${municipality.slug}-${industry.slug}-jobs`}
              className="rounded-[1.75rem] border border-slate-900/10 bg-white/90 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)]"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full text-xl text-white"
                    style={{ backgroundColor: industry.accentColor }}
                  >
                    {industry.icon}
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold">{industry.name}</h2>
                    <p className="text-sm text-slate-600">
                      {jobs.length} eksempeljobs i denne branche
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700">
                  Kommunekode: {municipality.code}
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {jobs.map((job) => (
                  <article
                    key={job.id}
                    className="rounded-[1.25rem] border border-slate-900/10 bg-slate-50 p-4"
                  >
                    <h3 className="text-base font-semibold text-slate-900">{job.title}</h3>
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      {job.employerName}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {job.summary}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="rounded-full border border-slate-300 px-3 py-1">
                        {job.locationLabel}
                      </span>
                      <span className="rounded-full border border-slate-300 px-3 py-1">
                        {job.language.toUpperCase()}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}