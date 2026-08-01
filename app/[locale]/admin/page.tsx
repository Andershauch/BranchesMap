import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { getMunicipalityHomeMapAdminRows } from "@/lib/data/municipalities";
import { isValidLocale, type AppLocale } from "@/lib/i18n/config";
import { getRuntimeDictionary } from "@/lib/i18n/runtime-dictionaries";
import { requireAdminUser } from "@/lib/server/auth";
import { listAppTextTranslations } from "@/lib/server/app-text-translations";
import { listRecentSecurityAuditEvents } from "@/lib/server/audit";
import { listUsersForAdmin } from "@/lib/server/users";

export const dynamic = "force-dynamic";

type AdminDashboardPageProps = {
  params: Promise<{ locale: string }>;
};

type DashboardCardProps = {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
  metrics: Array<{ label: string; value: string }>;
  action: string;
};

function dashboardCopy(locale: AppLocale) {
  if (locale === "da") {
    return {
      title: "Admin: overblik",
      intro:
        "Brug admin-forsiden som indgang til brugere, kortstyring, sikkerhed og oversaettelser. De vigtigste vaerktojer er delt op efter opgave i stedet for at vaere samlet paa en side.",
      usersTitle: "Brugere",
      usersBody:
        "Gennemgaa konti og styr hvem der har almindelig admin-adgang. Superadmin-konti styres separat og kan ikke aendres fra denne side.",
      homeMapTitle: "Kortstyring",
      homeMapBody:
        "Styr hvilke kommuner der vises paa home map, deres prioritet og hvilke kommuner der indgaar i attract mode.",
      securityTitle: "Sikkerhed",
      securityBody:
        "Gennemgaa de seneste sikkerhedshaendelser og brug siden som foerste stop ved throttling, origin-fejl eller uautoriserede requests.",
      appTextsTitle: "Systemtekster",
      appTextsBody:
        "Ret brugerrettede frontend-tekster direkte i runtime-laget med placeholder-validering, reset til filvaerdi og audit logging.",
      jobindsatsTitle: "Titeloversaettelser",
      jobindsatsBody:
        "Vedligehold Jobindsats-titeloversaettelser pr. sprog uden at roere versionsfilerne.",
      open: "Aabn",
      totalUsers: "Brugere",
      admins: "Admins",
      visibleCount: "Synlige kommuner",
      attractCount: "Attract-kommuner",
      securityEvents: "Seneste haendelser",
      appTextOverrides: "Afviger fra fil",
      appTextTotal: "Redigerbare tekster",
      recentWindow: "Haendelsesvindue",
      titleLocales: "Sprog",
      storage: "Kilde",
    };
  }

  return {
    title: "Admin: overview",
    intro:
      "Use the admin home page as the entry point for users, map management, security, and translations. The tools are split by task instead of being crowded onto one page.",
    usersTitle: "Users",
    usersBody:
      "Review accounts and control who has regular admin access. Superadmin accounts are managed separately and cannot be changed from this page.",
    homeMapTitle: "Map manager",
    homeMapBody:
      "Control which municipalities appear on the home map, their priority, and which municipalities are used in attract mode.",
    securityTitle: "Security",
    securityBody:
      "Review the latest security events and use the page as the first stop for throttling, origin failures, or unauthorized requests.",
    appTextsTitle: "System texts",
    appTextsBody:
      "Edit user-facing frontend text directly in the runtime layer with placeholder validation, reset to file value, and audit logging.",
    jobindsatsTitle: "Title translations",
    jobindsatsBody:
      "Maintain Jobindsats title translations per language without editing versioned files.",
    open: "Open",
    totalUsers: "Users",
    admins: "Admins",
    visibleCount: "Visible municipalities",
    attractCount: "Attract municipalities",
    securityEvents: "Recent events",
    appTextOverrides: "Overrides",
    appTextTotal: "Editable texts",
    recentWindow: "Event window",
    titleLocales: "Locales",
    storage: "Source",
  };
}

function DashboardCard({ href, eyebrow, title, body, metrics, action }: DashboardCardProps) {
  return (
    <article className="rounded-[1.5rem] border border-slate-900/10 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-[1.1rem] border border-slate-200 bg-slate-50/80 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{metric.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-5">
        <Link
          href={href}
          className="inline-flex rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          {action}
        </Link>
      </div>
    </article>
  );
}

export default async function AdminDashboardPage({ params }: AdminDashboardPageProps) {
  noStore();

  const { locale } = await params;
  if (!isValidLocale(locale)) {
    notFound();
  }

  const language = locale as AppLocale;
  const dictionary = await getRuntimeDictionary(language);
  const shellText = dictionary.adminHomeMap;
  const text = dashboardCopy(language);
  const loginPath = `/${locale}/login?redirectTo=${encodeURIComponent(`/${locale}/admin`)}`;
  const currentUser = await requireAdminUser(loginPath);
  const displayName = currentUser.name?.trim() ? currentUser.name : currentUser.email;

  const [municipalities, securityEvents, appTextOverview, appTextOverrides, usersOverview] =
    await Promise.all([
      getMunicipalityHomeMapAdminRows(),
      listRecentSecurityAuditEvents(20),
      listAppTextTranslations({ locale: "da", page: 1, pageSize: 1 }),
      listAppTextTranslations({ locale: "da", page: 1, pageSize: 1, filter: "overridden" }),
      listUsersForAdmin({ query: "", page: 1, pageSize: 100 }),
    ]);

  const visibleCount = municipalities.filter((municipality) => municipality.homeMap.isPrimary).length;
  const attractCount = municipalities.filter((municipality) => municipality.homeMap.useInAttractMode).length;
  const adminCount = usersOverview.rows.filter((user) => user.role === "admin").length;

  return (
    <AdminShell
      locale={language}
      currentSection="dashboard"
      title={text.title}
      intro={text.intro}
      displayName={displayName}
      copyOverride={shellText}
    >
      <section className="grid gap-4 xl:grid-cols-2">
        <DashboardCard
          href={`/${locale}/admin/users`}
          eyebrow={text.usersTitle}
          title={text.usersTitle}
          body={text.usersBody}
          action={text.open}
          metrics={[
            { label: text.totalUsers, value: String(usersOverview.total) },
            { label: text.admins, value: String(adminCount) },
          ]}
        />

        <DashboardCard
          href={`/${locale}/admin/home-map`}
          eyebrow={text.homeMapTitle}
          title={text.homeMapTitle}
          body={text.homeMapBody}
          action={text.open}
          metrics={[
            { label: text.visibleCount, value: String(visibleCount) },
            { label: text.attractCount, value: String(attractCount) },
          ]}
        />

        <DashboardCard
          href={`/${locale}/admin/security`}
          eyebrow={text.securityTitle}
          title={text.securityTitle}
          body={text.securityBody}
          action={text.open}
          metrics={[
            { label: text.securityEvents, value: String(securityEvents.length) },
            { label: text.recentWindow, value: "20" },
          ]}
        />

        <DashboardCard
          href={`/${locale}/admin/app-texts`}
          eyebrow={text.appTextsTitle}
          title={text.appTextsTitle}
          body={text.appTextsBody}
          action={text.open}
          metrics={[
            { label: text.appTextTotal, value: String(appTextOverview.total) },
            { label: text.appTextOverrides, value: String(appTextOverrides.total) },
          ]}
        />

        <DashboardCard
          href={`/${locale}/admin/jobindsats-titles`}
          eyebrow={text.jobindsatsTitle}
          title={text.jobindsatsTitle}
          body={text.jobindsatsBody}
          action={text.open}
          metrics={[
            { label: text.titleLocales, value: "8" },
            { label: text.storage, value: "DB" },
          ]}
        />
      </section>
    </AdminShell>
  );
}
