import Link from "next/link";
import { notFound } from "next/navigation";

import { requestVerificationAction } from "@/lib/server/account-actions";
import { isValidLocale } from "@/lib/i18n/config";
import { parseSafeRedirectPath } from "@/lib/server/input-validation";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VerifyEmailPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const search = await searchParams;
  const danish = locale === "da";
  const sent = search.sent === "1";
  const invalid = search.invalid === "1";
  const redirectCandidate = typeof search.redirectTo === "string" ? search.redirectTo : null;
  const redirectTo = parseSafeRedirectPath(locale, redirectCandidate, `/${locale}/follows`);
  const followMunicipality = typeof search.followMunicipality === "string" ? search.followMunicipality : "";
  const copy = {
    title: danish ? "Bekræft din e-mail" : "Verify your email",
    intro: danish
      ? "Vi sender et nyt bekræftelseslink, hvis adressen tilhører en konto, der stadig skal bekræftes."
      : "We will send a new verification link if the address belongs to an account that still needs verification.",
    sent: danish
      ? "Hvis kontoen findes, er der sendt et link. Tjek også spam-mappen."
      : "If the account exists, a link has been sent. Check your spam folder too.",
    invalid: danish ? "Linket er ugyldigt eller udløbet. Du kan bede om et nyt nedenfor." : "The link is invalid or expired. You can request a new one below.",
    email: danish ? "E-mailadresse" : "Email address",
    submit: danish ? "Send nyt link" : "Send a new link",
    back: danish ? "Tilbage til login" : "Back to sign in",
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f5ef_0%,#eef4f3_100%)] px-4 py-12 text-slate-900">
      <section className="mx-auto grid w-full max-w-md gap-5 rounded-[2rem] border border-slate-900/10 bg-white p-6 shadow-xl sm:p-8">
        <h1 className="text-3xl font-semibold">{copy.title}</h1>
        <p className="text-sm leading-6 text-slate-600">{copy.intro}</p>
        {sent ? <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{copy.sent}</p> : null}
        {invalid ? <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{copy.invalid}</p> : null}
        <form action={requestVerificationAction} className="grid gap-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="redirectTo" value={redirectTo} />
          {followMunicipality ? <input type="hidden" name="followMunicipality" value={followMunicipality} /> : null}
          <label className="grid gap-2 text-sm font-medium">
            {copy.email}
            <input type="email" name="email" required autoComplete="email" className="rounded-2xl border border-slate-300 px-4 py-3" />
          </label>
          <button className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">{copy.submit}</button>
        </form>
        <Link href={`/${locale}/login`} className="text-sm font-semibold underline">{copy.back}</Link>
      </section>
    </main>
  );
}
