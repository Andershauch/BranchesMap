import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { SecurityEventsList } from "@/components/admin/security-events-list";
import { isValidLocale, type AppLocale } from "@/lib/i18n/config";
import { getRuntimeDictionary } from "@/lib/i18n/runtime-dictionaries";
import { requireAdminUser } from "@/lib/server/auth";
import { listRecentSecurityAuditEvents } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

type SecurityPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminSecurityPage({ params }: SecurityPageProps) {
  noStore();

  const { locale } = await params;
  if (!isValidLocale(locale)) {
    notFound();
  }

  const language = locale as AppLocale;
  const dictionary = await getRuntimeDictionary(language);
  const text = dictionary.adminHomeMap;
  const loginPath = `/${locale}/login?redirectTo=${encodeURIComponent(`/${locale}/admin/security`)}`;
  const currentUser = await requireAdminUser(loginPath);
  const displayName = currentUser.name?.trim() ? currentUser.name : currentUser.email;
  const securityEvents = await listRecentSecurityAuditEvents(50);

  return (
    <AdminShell
      locale={language}
      currentSection="security"
      title={text.securityTitle}
      intro={text.securityIntro}
      displayName={displayName}
      copyOverride={text}
    >
      <div className="rounded-[1.5rem] border border-slate-900/10 bg-slate-50/80 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{text.securityTitle}</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{securityEvents.length}</p>
      </div>
      <SecurityEventsList locale={language} events={securityEvents} copyOverride={text} />
    </AdminShell>
  );
}
