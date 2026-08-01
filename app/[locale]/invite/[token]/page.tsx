import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";

import { isValidLocale, type AppLocale } from "@/lib/i18n/config";
import { getUserInvitationByToken } from "@/lib/server/user-invitations";

import { acceptInvitationAction } from "./actions";

type InvitePageProps = {
  params: Promise<{
    locale: string;
    token: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(value: string | string[] | undefined) {
  return typeof value === "string" && value ? value : null;
}

function getCopy(locale: AppLocale) {
  if (locale === "da") {
    return {
      eyebrow: "Invitation",
      title: "Fuldfør din konto",
      intro: "Sæt en adgangskode for at acceptere invitationen og oprette din konto.",
      invalid: "Invitationen er ugyldig, udløbet eller allerede brugt.",
      email: "E-mail",
      role: "Rolle",
      password: "Adgangskode",
      passwordHint: "Mindst 10 tegn.",
      submit: "Opret konto",
      errors: {
        missing_fields: "Udfyld adgangskoden.",
        weak_password: "Adgangskoden er for svag.",
        email_taken: "Der findes allerede en bruger med den e-mail.",
        invalid_invitation: "Invitationen er ugyldig, udløbet eller allerede brugt.",
      },
    };
  }

  return {
    eyebrow: "Invitation",
    title: "Complete your account",
    intro: "Set a password to accept the invitation and create your account.",
    invalid: "The invitation is invalid, expired, or already used.",
    email: "Email",
    role: "Role",
    password: "Password",
    passwordHint: "At least 10 characters.",
    submit: "Create account",
    errors: {
      missing_fields: "Fill in the password.",
      weak_password: "The password is too weak.",
      email_taken: "An account with that email already exists.",
      invalid_invitation: "The invitation is invalid, expired, or already used.",
    },
  };
}

export default async function InvitePage({ params, searchParams }: InvitePageProps) {
  noStore();

  const { locale, token } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const pageLocale = locale as AppLocale;
  const text = getCopy(pageLocale);
  const invitation = await getUserInvitationByToken(token);
  const search = await searchParams;
  const errorKey = getStringParam(search.error) as keyof typeof text.errors | null;
  const errorMessage = errorKey ? text.errors[errorKey] : null;

  if (!invitation) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f7f5ef_0%,#eef4f3_100%)] px-4 py-8 text-slate-900 sm:px-6 sm:py-12">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-[2rem] border border-slate-900/10 bg-white/92 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">{text.eyebrow}</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{text.title}</h1>
          <p className="text-sm leading-6 text-slate-600">{text.invalid}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f5ef_0%,#eef4f3_100%)] px-4 py-8 text-slate-900 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-[2rem] border border-slate-900/10 bg-white/92 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">{text.eyebrow}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{text.title}</h1>
        <p className="text-sm leading-6 text-slate-600">{text.intro}</p>

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="rounded-[1.4rem] border border-slate-900/10 bg-slate-50/80 p-4 text-sm text-slate-700">
          <p><span className="font-semibold text-slate-900">{text.email}:</span> {invitation.email}</p>
          <p className="mt-2"><span className="font-semibold text-slate-900">{text.role}:</span> {invitation.role}</p>
        </div>

        <form action={acceptInvitationAction} className="grid gap-4">
          <input type="hidden" name="locale" value={pageLocale} />
          <input type="hidden" name="token" value={token} />
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {text.password}
            <input
              type="password"
              name="password"
              required
              minLength={10}
              autoComplete="new-password"
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500"
            />
            <span className="text-xs text-slate-500">{text.passwordHint}</span>
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            {text.submit}
          </button>
        </form>
      </div>
    </main>
  );
}
