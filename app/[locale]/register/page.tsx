import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/server/auth";
import { isValidLocale, type AppLocale } from "@/lib/i18n/config";

type RegisterPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const registerCopy = {
  da: {
    eyebrow: "Fase 2",
    title: "Opret bruger",
    intro: "Lav en enkel konto, s\u00e5 du kan gemme kommuner og senere bruge personlige funktioner sikkert.",
    name: "Navn (valgfrit)",
    email: "E-mail",
    password: "Adgangskode",
    passwordHint: "Mindst 10 tegn.",
    submit: "Opret bruger",
    loginPrompt: "Har du allerede en bruger?",
    loginLink: "Log ind",
    back: "Tilbage til kortet",
    errors: {
      missing_fields: "Udfyld e-mail og adgangskode.",
      email_taken: "Der findes allerede en bruger med den e-mail.",
      weak_password: "Adgangskoden skal v\u00e6re mindst 10 tegn lang.",
      unknown: "Noget gik galt. Pr\u00f8v igen.",
    },
  },
  en: {
    eyebrow: "Phase 2",
    title: "Create account",
    intro: "Create a simple account so you can save municipalities and later use personal features securely.",
    name: "Name (optional)",
    email: "Email",
    password: "Password",
    passwordHint: "At least 10 characters.",
    submit: "Create account",
    loginPrompt: "Already have an account?",
    loginLink: "Log in",
    back: "Back to the map",
    errors: {
      missing_fields: "Fill in email and password.",
      email_taken: "An account with that email already exists.",
      weak_password: "Password must be at least 10 characters long.",
      unknown: "Something went wrong. Please try again.",
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

export default async function RegisterPage({ params, searchParams }: RegisterPageProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const activeLocale = locale as AppLocale;
  const copy = registerCopy[activeLocale];
  const user = await getCurrentUser();
  const search = await searchParams;
  const redirectTo = normalizeRedirect(locale, getStringParam(search.redirectTo), `/${locale}/saved-searches`);

  if (user) {
    redirect(redirectTo);
  }

  const errorKey = getStringParam(search.error) as keyof typeof copy.errors | null;
  const errorMessage = errorKey ? copy.errors[errorKey] : null;
  const loginHref = `/${locale}/login?redirectTo=${encodeURIComponent(redirectTo)}`;

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
          <p className="mt-3 text-sm leading-6 text-slate-600">{copy.intro}</p>

          {errorMessage ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <form action="/api/auth/register" method="post" className="mt-6 grid gap-4">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="redirectTo" value={redirectTo} />

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {copy.name}
              <input
                type="text"
                name="name"
                autoComplete="name"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500"
              />
            </label>

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
                autoComplete="new-password"
                minLength={10}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500"
              />
              <span className="text-xs text-slate-500">{copy.passwordHint}</span>
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
          <span>{copy.loginPrompt}</span>{" "}
          <Link href={loginHref} className="font-semibold text-slate-900 underline-offset-4 hover:underline">
            {copy.loginLink}
          </Link>
        </section>
      </div>
    </main>
  );
}