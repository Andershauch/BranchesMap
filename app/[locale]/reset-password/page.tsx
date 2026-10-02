import Link from "next/link";
import { notFound } from "next/navigation";

import { resetPasswordAction } from "@/lib/server/account-actions";
import { isValidLocale } from "@/lib/i18n/config";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ResetPasswordPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const search = await searchParams;
  const danish = locale === "da";
  const token = typeof search.token === "string" ? search.token : "";

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f5ef_0%,#eef4f3_100%)] px-4 py-12 text-slate-900">
      <section className="mx-auto grid w-full max-w-md gap-5 rounded-[2rem] border border-slate-900/10 bg-white p-6 shadow-xl sm:p-8">
        <h1 className="text-3xl font-semibold">{danish ? "Vælg ny adgangskode" : "Choose a new password"}</h1>
        {search.invalid === "1" ? <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{danish ? "Linket er ugyldigt eller udløbet. Bed om et nyt." : "The link is invalid or expired. Request a new one."}</p> : null}
        {token ? (
          <form action={resetPasswordAction} className="grid gap-4">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="token" value={token} />
            <label className="grid gap-2 text-sm font-medium">{danish ? "Ny adgangskode" : "New password"}<input type="password" name="password" required minLength={10} autoComplete="new-password" className="rounded-2xl border border-slate-300 px-4 py-3" /></label>
            <p className="text-xs text-slate-500">{danish ? "Brug mindst 10 tegn." : "Use at least 10 characters."}</p>
            <button className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">{danish ? "Gem adgangskode" : "Save password"}</button>
          </form>
        ) : <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{danish ? "Linket mangler. Bed om et nyt nulstillingslink." : "The link is missing. Request a new reset link."}</p>}
        <Link href={`/${locale}/forgot-password`} className="text-sm font-semibold underline">{danish ? "Bed om nyt link" : "Request a new link"}</Link>
      </section>
    </main>
  );
}
