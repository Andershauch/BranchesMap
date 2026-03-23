import Link from "next/link";

import { utf8SmokeSamples } from "@/lib/utf8-smoke";

export default function Home() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f5ef_0%,#eef4f3_100%)] px-6 py-12 text-slate-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-900/10 bg-white/90 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">
            BranchesMap POC
          </p>
          <div className="mt-4 max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              UTF-8 er aktivt fra første build
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-700">
              Vi bruger denne startside som en bevidst smoke test for danske
              tegn i filer, React-komponenter, metadata og API-svar.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/api/utf8"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Åbn UTF-8 API-test
            </Link>
            <p className="inline-flex items-center rounded-full border border-slate-300 px-5 py-3 text-sm text-slate-700">
              Klar til næste skridt: kort, kommuner og brancher
            </p>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-[1.75rem] border border-slate-900/10 bg-white/80 p-6">
            <h2 className="text-xl font-semibold">Kommuner med danske tegn</h2>
            <ul className="mt-4 space-y-2 text-base text-slate-700">
              {utf8SmokeSamples.municipalities.map((municipality) => (
                <li key={municipality}>{municipality}</li>
              ))}
            </ul>
          </article>

          <article className="rounded-[1.75rem] border border-slate-900/10 bg-white/80 p-6">
            <h2 className="text-xl font-semibold">Kontrolord</h2>
            <ul className="mt-4 space-y-2 text-base text-slate-700">
              {utf8SmokeSamples.phrases.map((phrase) => (
                <li key={phrase}>{phrase}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className="rounded-[1.75rem] border border-slate-900/10 bg-slate-950 p-6 text-slate-100">
          <h2 className="text-xl font-semibold">Teknisk note</h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
            {utf8SmokeSamples.note}
          </p>
        </section>
      </div>
    </main>
  );
}
