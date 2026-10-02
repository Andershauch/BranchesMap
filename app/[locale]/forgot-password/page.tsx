import Link from "next/link";
import { notFound } from "next/navigation";

import { requestPasswordResetAction } from "@/lib/server/account-actions";
import { isValidLocale } from "@/lib/i18n/config";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ForgotPasswordPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const search = await searchParams;
  const danish = locale === "da";
  const sent = search.sent === "1";

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f5ef_0%,#eef4f3_100%)] px-4 py-12 text-slate-900">
      <section className="mx-auto grid w-full max-w-md gap-5 rounded-[2rem] border border-slate-900/10 bg-white p-6 shadow-xl sm:p-8">
        <h1 className="text-3xl font-semibold">{danish ? "Nulstil adgangskode" : "Reset password"}</h1>
        <p className="text-sm leading-6 text-slate-600">{danish ? "Indtast din e-mail. Hvis kontoen findes, sender vi et link." : "Enter your email. If the account exists, we will send a link."}</p>
        {sent ? <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{danish ? "Hvis kontoen findes, er der sendt et link. Tjek også spam-mappen." : "If the account exists, a link has been sent. Check your spam folder too."}</p> : null}
        <form action={requestPasswordResetAction} className="grid gap-4">
          <input type="hidden" name="locale" value={locale} />
          <label className="grid gap-2 text-sm font-medium">{danish ? "E-mailadresse" : "Email address"}<input type="email" name="email" required autoComplete="email" className="rounded-2xl border border-slate-300 px-4 py-3" /></label>
          <button className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">{danish ? "Send nulstillingslink" : "Send reset link"}</button>
        </form>
        <Link href={`/${locale}/login`} className="text-sm font-semibold underline">{danish ? "Tilbage til login" : "Back to sign in"}</Link>
      </section>
    </main>
  );
}
