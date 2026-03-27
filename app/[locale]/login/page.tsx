import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/server/auth";
import { isValidLocale, type AppLocale } from "@/lib/i18n/config";

type LoginPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const loginCopy = {
  da: {
    eyebrow: "Fase 2",
    title: "Log ind",
    intro: "Log ind for at bruge dine f\u00f8lger og holde styr p\u00e5 kommuner sikkert.",
    followIntro: "Log ind for at f\u00f8lge denne kommune. Vi bruger din konto til senere at kunne vise opdateringer.",
    email: "E-mail",
    password: "Adgangskode",
    submit: "Log ind",
    registerPrompt: "Har du ikke en bruger endnu?",
    registerLink: "Opret bruger",
    back: "Tilbage til kortet",
    followBadge: "F\u00f8lg kommune efter login",
    errors: {
      missing_fields: "Udfyld b\u00e5de e-mail og adgangskode.",
      invalid_credentials: "E-mail eller adgangskode er forkert.",
    },
  },
  en: {
    eyebrow: "Phase 2",
    title: "Log in",
    intro: "Log in to use your follows and keep track of municipalities securely.",
    followIntro: "Log in to follow this municipality. Your account lets us show updates later.",
    email: "Email",
    password: "Password",
    submit: "Log in",
    registerPrompt: "Do not have an account yet?",
    registerLink: "Create account",
    back: "Back to the map",
    followBadge: "Follow municipality after login",
    errors: {
      missing_fields: "Fill in both email and password.",
      invalid_credentials: "Email or password is incorrect.",
    },
  },
} as const;

function getStringParam(value: string | string[] | undefined) {
  return typeof value === "string" && value ? value : null;
}

function normalizeRedirect(locale: string, candidate: string | null, fallback: string) {
  if (candidate && candidate.startsWith(`/${locale}/`) && !candidate.startsWith("//")) {
    return candidate;
  }

  return fallback;
}

export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const activeLocale = locale as AppLocale;
  const copy = loginCopy[activeLocale];
  const user = await getCurrentUser();
  const search = await searchParams;
  const redirectTo = normalizeRedirect(locale, getStringParam(search.redirectTo), `/${locale}/follows`);
  const followMunicipality = getStringParam(search.followMunicipality);

  if (user) {
    redirect(redirectTo);
  }

  const errorKey = getStringParam(search.error) as keyof typeof copy.errors | null;
  const errorMessage = errorKey ? copy.errors[errorKey] : null;
  const registerHref = `/${locale}/register?redirectTo=${encodeURIComponent(redirectTo)}${followMunicipality ? `&followMunicipality=${encodeURIComponent(followMunicipality)}` : ""}`;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f5ef_0%,#eef4f3_100%)] px-4 py-8 text-slate-900 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <Link
          href={`/${locale}`}
          className="inline-flex rounded-full border border-slate-300 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
        >
          {copy.back}
        </Link>

        <section className="rounded-[2rem] border border-slate-900/10 bg-white/92 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">{copy.eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{copy.title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{followMunicipality ? copy.followIntro : copy.intro}</p>

          {followMunicipality ? (
            <div className="mt-4 inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">
              {copy.followBadge}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <form action="/api/auth/login" method="post" className="mt-6 grid gap-4">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="redirectTo" value={redirectTo} />
            {followMunicipality ? <input type="hidden" name="followMunicipality" value={followMunicipality} /> : null}

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {copy.email}
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {copy.password}
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500"
              />
            </label>

            <button
              type="submit"
              className="mt-2 inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              {copy.submit}
            </button>
          </form>
        </section>

        <section className="rounded-[1.6rem] border border-slate-900/10 bg-white/88 p-5 text-sm text-slate-700 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <span>{copy.registerPrompt}</span>{" "}
          <Link href={registerHref} className="font-semibold text-slate-900 underline-offset-4 hover:underline">
            {copy.registerLink}
          </Link>
        </section>
      </div>
    </main>
  );
}