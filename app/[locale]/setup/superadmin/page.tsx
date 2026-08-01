import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { bootstrapSuperAdminAction } from "@/lib/server/superadmin-setup-actions";
import { isRtlLocale, isValidLocale, type AppLocale } from "@/lib/i18n/config";
import { getCurrentUser } from "@/lib/server/auth";
import { getConfiguredSuperAdminSetupSecret } from "@/lib/server/auth-config";
import { hasSuperAdminAccount } from "@/lib/server/users";

type SuperAdminSetupPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(value: string | string[] | undefined) {
  return typeof value === "string" && value ? value : null;
}

function getCopy(locale: AppLocale) {
  if (locale === "da") {
    return {
      eyebrow: "Engangs-setup",
      title: "Opret første superadmin",
      intro:
        "Denne side virker kun, mens systemet endnu ikke har en superadmin. Brug den til at oprette den første interne administrator sikkert.",
      unavailable:
        "Setup er ikke tilgængeligt. Enten findes der allerede en superadmin, eller også mangler serveren `SUPERADMIN_SETUP_SECRET`.",
      back: "Til forsiden",
      name: "Navn",
      email: "E-mail",
      password: "Adgangskode",
      passwordHint: "Brug mindst 10 tegn. Denne konto bliver systemets første superadmin.",
      setupSecret: "Setup-hemmelighed",
      submit: "Opret superadmin",
      errors: {
        missing_fields: "Udfyld navn, e-mail, adgangskode og setup-hemmelighed.",
        invalid_setup_secret: "Setup-hemmeligheden er forkert.",
        weak_password: "Adgangskoden er for svag.",
        email_taken: "Der findes allerede en bruger med den e-mail.",
        already_configured: "Systemet har allerede en superadmin.",
        setup_unavailable: "Setup er ikke tilgængeligt på serveren.",
        throttled: "For mange forsøg. Vent lidt og prøv igen.",
      },
    };
  }

  return {
    eyebrow: "One-time setup",
    title: "Create the first superadmin",
    intro:
      "This page only works while the system has no superadmin. Use it to create the first internal administrator securely.",
    unavailable:
      "Setup is unavailable. A superadmin already exists, or the server is missing `SUPERADMIN_SETUP_SECRET`.",
    back: "Back to home",
    name: "Name",
    email: "Email",
    password: "Password",
    passwordHint: "Use at least 10 characters. This account becomes the system's first superadmin.",
    setupSecret: "Setup secret",
    submit: "Create superadmin",
    errors: {
      missing_fields: "Fill in name, email, password, and setup secret.",
      invalid_setup_secret: "The setup secret is incorrect.",
      weak_password: "The password is too weak.",
      email_taken: "A user with that email already exists.",
      already_configured: "The system already has a superadmin.",
      setup_unavailable: "Setup is unavailable on the server.",
      throttled: "Too many attempts. Wait a moment and try again.",
    },
  };
}

export default async function SuperAdminSetupPage({
  params,
  searchParams,
}: SuperAdminSetupPageProps) {
  noStore();

  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const activeLocale = locale as AppLocale;
  const isRtl = isRtlLocale(activeLocale);
  const text = getCopy(activeLocale);
  const search = await searchParams;
  const errorKey = getStringParam(search.error) as keyof typeof text.errors | null;
  const errorMessage = errorKey ? text.errors[errorKey] : null;
  const [user, superAdminExists] = await Promise.all([getCurrentUser(), hasSuperAdminAccount()]);
  const setupSecretConfigured = Boolean(getConfiguredSuperAdminSetupSecret());

  if (superAdminExists) {
    redirect(user ? `/${locale}/admin` : `/${locale}/login?redirectTo=${encodeURIComponent(`/${locale}/admin`)}`);
  }

  return (
    <main
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen bg-[linear-gradient(180deg,#f7f5ef_0%,#eef4f3_100%)] px-4 py-8 text-slate-900 sm:px-6 sm:py-12"
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <Link
          href={`/${locale}`}
          className="inline-flex rounded-full border border-slate-300 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
        >
          {text.back}
        </Link>

        <section className="rounded-[2rem] border border-slate-900/10 bg-white/92 p-6 text-start shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">{text.eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{text.title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{text.intro}</p>

          {!setupSecretConfigured ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {text.unavailable}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <form action={bootstrapSuperAdminAction} className="mt-6 grid gap-4">
            <input type="hidden" name="locale" value={locale} />

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {text.name}
              <input
                type="text"
                name="name"
                required
                autoComplete="name"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-start text-base text-slate-900 outline-none transition focus:border-teal-500"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {text.email}
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-start text-base text-slate-900 outline-none transition focus:border-teal-500"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {text.password}
              <input
                type="password"
                name="password"
                required
                autoComplete="new-password"
                minLength={10}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-start text-base text-slate-900 outline-none transition focus:border-teal-500"
              />
              <span className="text-xs text-slate-500">{text.passwordHint}</span>
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {text.setupSecret}
              <input
                type="password"
                name="setupSecret"
                required
                autoComplete="off"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-start text-base text-slate-900 outline-none transition focus:border-teal-500"
              />
            </label>

            <button
              type="submit"
              disabled={!setupSecretConfigured}
              className="mt-2 inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {text.submit}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
