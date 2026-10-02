import Link from "next/link";
import { notFound } from "next/navigation";

import { confirmEmailAction } from "@/lib/server/account-actions";
import { getAccountCopy } from "@/lib/i18n/account-copy";
import { isRtlLocale, isValidLocale, type AppLocale } from "@/lib/i18n/config";
import { parseSafeRedirectPath } from "@/lib/server/input-validation";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

function stringParam(value: string | string[] | undefined) { return typeof value === "string" ? value : ""; }

export default async function ConfirmEmailPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const search = await searchParams;
  const token = stringParam(search.token);
  const redirectTo = parseSafeRedirectPath(locale, stringParam(search.redirectTo), `/${locale}/follows`);
  const activeLocale = locale as AppLocale;
  const isRtl = isRtlLocale(activeLocale);
  const copy = getAccountCopy(activeLocale).confirmEmail;

  return (
    <main dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-[linear-gradient(180deg,#f7f5ef_0%,#eef4f3_100%)] px-4 py-12 text-slate-900">
      <section className="mx-auto grid w-full max-w-md gap-5 rounded-[2rem] border border-slate-900/10 bg-white p-6 shadow-xl sm:p-8">
        <h1 className="text-3xl font-semibold">{copy.title}</h1>
        <p className="text-sm leading-6 text-slate-600">{copy.intro}</p>
        {token ? (
          <form action={confirmEmailAction} className="grid gap-3">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="redirectTo" value={redirectTo} />
            {typeof search.followMunicipality === "string" ? <input type="hidden" name="followMunicipality" value={search.followMunicipality} /> : null}
            <button className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">{copy.submit}</button>
          </form>
        ) : (
          <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{copy.invalid}</p>
        )}
        <Link href={`/${locale}/verify-email`} className="text-sm font-semibold underline">{copy.requestNew}</Link>
      </section>
    </main>
  );
}
