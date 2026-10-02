import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { intlLocaleMap, isValidLocale, type AppLocale } from "@/lib/i18n/config";
import { requireSuperAdminUser } from "@/lib/server/auth";
import { listUsersForAdmin } from "@/lib/server/users";

import {
  createUserInvitationAction,
  updateUserActiveStateAction,
  updateUserRoleAction,
} from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(value: string | string[] | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function getPageParam(value: string | string[] | undefined) {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function formatDate(date: Date, locale: AppLocale) {
  return new Intl.DateTimeFormat(intlLocaleMap[locale], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getCopy(locale: AppLocale) {
  if (locale === "da") {
    return {
      title: "Admin: brugere",
      intro:
        "Denne side er kun for superadmin. Her kan du gennemgaa konti og styre, hvem der har almindelig admin-adgang.",
      searchLabel: "Soeg efter navn eller e-mail",
      searchPlaceholder: "Soeg brugere",
      search: "Soeg",
      summary: "Viser {count} af {total} brugere",
      empty: "Ingen brugere matcher soegningen.",
      saved: "Brugerrolle opdateret.",
      invitationSent: "Invitation sendt.",
      createTitle: "Inviter ny bruger",
      createIntro:
        "Send en invitation via e-mail, saa brugeren selv opretter sin adgangskode. Brug dette i stedet for manuel password-oprettelse.",
      name: "Navn",
      email: "E-mail",
      createRole: "Ny rolle",
      createUser: "Send invitation",
      active: "Aktiv",
      inactive: "Deaktiveret",
      role: "Rolle",
      locale: "Sprog",
      createdDate: "Oprettet",
      updated: "Opdateret",
      savedSearches: "Gemte soegninger",
      follows: "Follows",
      promoteAdmin: "Goer til admin",
      demoteAdmin: "Fjern admin",
      deactivateUser: "Deaktiver bruger",
      reactivateUser: "Genaktiver bruger",
      superadminLocked: "Superadmin styres ikke her",
      previous: "Forrige",
      next: "Naeste",
      totalUsers: "Brugere",
      adminUsers: "Admins",
      superAdmins: "Superadmins",
      roleUser: "Bruger",
      roleAdmin: "Admin",
      roleSuperAdmin: "Superadmin",
    };
  }

  return {
    title: "Admin: users",
    intro:
      "This page is only for superadmins. Review accounts here and control who has regular admin access.",
    searchLabel: "Search by name or email",
    searchPlaceholder: "Search users",
    search: "Search",
    summary: "Showing {count} of {total} users",
    empty: "No users match the current search.",
    saved: "User role updated.",
    invitationSent: "Invitation sent.",
    createTitle: "Invite user",
    createIntro:
      "Send an email invitation so the user can create their own password. Use this instead of manual password creation.",
    name: "Name",
    email: "Email",
    createRole: "New role",
    createUser: "Send invitation",
    active: "Active",
    inactive: "Inactive",
    role: "Role",
    locale: "Locale",
    createdDate: "Created",
    updated: "Updated",
    savedSearches: "Saved searches",
    follows: "Follows",
    promoteAdmin: "Promote to admin",
    demoteAdmin: "Remove admin",
    deactivateUser: "Deactivate user",
    reactivateUser: "Reactivate user",
    superadminLocked: "Superadmin is managed elsewhere",
    previous: "Previous",
    next: "Next",
    totalUsers: "Users",
    adminUsers: "Admins",
    superAdmins: "Superadmins",
    roleUser: "User",
    roleAdmin: "Admin",
    roleSuperAdmin: "Superadmin",
  };
}

function roleLabel(role: "user" | "admin" | "superadmin", locale: AppLocale) {
  const text = getCopy(locale);

  if (role === "superadmin") {
    return text.roleSuperAdmin;
  }

  if (role === "admin") {
    return text.roleAdmin;
  }

  return text.roleUser;
}

export default async function AdminUsersPage({ params, searchParams }: PageProps) {
  noStore();

  const { locale } = await params;
  if (!isValidLocale(locale)) {
    notFound();
  }

  const pageLocale = locale as AppLocale;
  const text = getCopy(pageLocale);
  const search = await searchParams;
  const query = getStringParam(search.q);
  const page = getPageParam(search.page);
  const saved = getStringParam(search.saved) === "1";
  const created = getStringParam(search.created) === "1";
  const errorMessage = getStringParam(search.error);

  const currentUser = await requireSuperAdminUser(
    `/${locale}/login?redirectTo=${encodeURIComponent(`/${locale}/admin/users`)}`,
  );
  const displayName = currentUser.name?.trim() ? currentUser.name : currentUser.email;
  const result = await listUsersForAdmin({
    query,
    page,
    pageSize: 20,
  });

  const adminCount = result.rows.filter((user) => user.role === "admin").length;
  const superAdminCount = result.rows.filter((user) => user.role === "superadmin").length;

  return (
    <AdminShell
      locale={pageLocale}
      currentSection="users"
      title={text.title}
      intro={text.intro}
      displayName={displayName}
    >
      <form
        action={createUserInvitationAction}
        className="grid gap-3 rounded-[1.4rem] border border-slate-900/10 bg-slate-50/80 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_12rem_10rem_auto]"
      >
        <input type="hidden" name="pageLocale" value={pageLocale} />
        <input type="hidden" name="query" value={query} />
        <input type="hidden" name="page" value={String(page)} />
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          <span>{text.name}</span>
          <input
            type="text"
            name="name"
            className="rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none transition focus:border-teal-500"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          <span>{text.email}</span>
          <input
            type="email"
            name="email"
            required
            className="rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none transition focus:border-teal-500"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          <span>{text.createRole}</span>
          <select
            name="role"
            defaultValue="user"
            className="rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none transition focus:border-teal-500"
          >
            <option value="user">{text.roleUser}</option>
            <option value="admin">{text.roleAdmin}</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          <span>{text.locale}</span>
          <select
            name="locale"
            defaultValue="da"
            className="rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none transition focus:border-teal-500"
          >
            <option value="da">DA</option>
            <option value="en">EN</option>
            <option value="uk">UK</option>
            <option value="ar">AR</option>
            <option value="fa">FA</option>
            <option value="ur">UR</option>
            <option value="pl">PL</option>
            <option value="de">DE</option>
          </select>
        </label>
        <div className="lg:col-span-full">
          <p className="text-sm text-slate-600">{text.createIntro}</p>
        </div>
        <div className="lg:col-span-full flex items-end">
          <button
            type="submit"
            className="inline-flex rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            {text.createUser}
          </button>
        </div>
      </form>

      <form className="grid gap-3 rounded-[1.4rem] border border-slate-900/10 bg-slate-50/80 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          <span>{text.searchLabel}</span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={text.searchPlaceholder}
            className="rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none transition focus:border-teal-500"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="inline-flex rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            {text.search}
          </button>
        </div>
      </form>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1.4rem] border border-slate-900/10 bg-slate-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{text.totalUsers}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{result.total}</p>
        </div>
        <div className="rounded-[1.4rem] border border-slate-900/10 bg-slate-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{text.adminUsers}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{adminCount}</p>
        </div>
        <div className="rounded-[1.4rem] border border-slate-900/10 bg-slate-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{text.superAdmins}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{superAdminCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <p>{text.summary.replace("{count}", String(result.rows.length)).replace("{total}", String(result.total))}</p>
        <div className="flex flex-wrap items-center gap-3">
          {created ? <p className="font-medium text-teal-700">{text.invitationSent}</p> : null}
          {saved ? <p className="font-medium text-teal-700">{text.saved}</p> : null}
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-[1.35rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {result.rows.length === 0 ? (
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-600">
          {text.empty}
        </div>
      ) : (
        <div className="grid gap-3">
          {result.rows.map((user) => (
            <article
              key={user.id}
              className="grid gap-4 rounded-[1.5rem] border border-slate-900/10 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.7fr)_auto]"
            >
              <div>
                <p dir="auto" className="text-base font-semibold text-slate-900">
                  {user.name?.trim() || user.email}
                </p>
                <p dir="auto" className="mt-1 text-sm text-slate-600">
                  {user.email}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                    {text.role}: {roleLabel(user.role, pageLocale)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 ${
                      user.isActive ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {user.isActive ? text.active : text.inactive}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                    {text.locale}: {user.locale.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="grid gap-2 text-sm text-slate-600">
                <p>
                  <span className="font-semibold text-slate-900">{text.createdDate}:</span> {formatDate(user.createdAt, pageLocale)}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">{text.updated}:</span> {formatDate(user.updatedAt, pageLocale)}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">{text.savedSearches}:</span> {user.savedSearchCount}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">{text.follows}:</span> {user.followCount}
                </p>
              </div>

              <div className="flex items-start lg:justify-end">
                {user.role === "superadmin" ? (
                  <div className="rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
                    {text.superadminLocked}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <form action={updateUserRoleAction} className="flex flex-col gap-2">
                      <input type="hidden" name="pageLocale" value={pageLocale} />
                      <input type="hidden" name="targetUserId" value={user.id} />
                      <input type="hidden" name="query" value={query} />
                      <input type="hidden" name="page" value={String(result.page)} />
                      <input
                        type="hidden"
                        name="intent"
                        value={user.role === "admin" ? "demote-admin" : "promote-admin"}
                      />
                      <button
                        type="submit"
                        className={`inline-flex rounded-full px-4 py-3 text-sm font-semibold transition ${
                          user.role === "admin"
                            ? "border border-slate-300 bg-white text-slate-700 hover:border-slate-900 hover:text-slate-900"
                            : "bg-slate-900 text-white hover:bg-slate-700"
                        }`}
                      >
                        {user.role === "admin" ? text.demoteAdmin : text.promoteAdmin}
                      </button>
                    </form>
                    <form action={updateUserActiveStateAction} className="flex flex-col gap-2">
                      <input type="hidden" name="pageLocale" value={pageLocale} />
                      <input type="hidden" name="targetUserId" value={user.id} />
                      <input type="hidden" name="query" value={query} />
                      <input type="hidden" name="page" value={String(result.page)} />
                      <input
                        type="hidden"
                        name="intent"
                        value={user.isActive ? "deactivate-user" : "reactivate-user"}
                      />
                      <button
                        type="submit"
                        className={`inline-flex rounded-full px-4 py-3 text-sm font-semibold transition ${
                          user.isActive
                            ? "border border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100"
                            : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100"
                        }`}
                      >
                        {user.isActive ? text.deactivateUser : text.reactivateUser}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {result.pageCount > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            {result.page > 1 ? (
              <Link
                href={`/${locale}/admin/users?${new URLSearchParams({
                  ...(query ? { q: query } : {}),
                  page: String(result.page - 1),
                }).toString()}`}
                className="inline-flex rounded-full bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-200"
              >
                {text.previous}
              </Link>
            ) : null}
          </div>
          <div>
            {result.page < result.pageCount ? (
              <Link
                href={`/${locale}/admin/users?${new URLSearchParams({
                  ...(query ? { q: query } : {}),
                  page: String(result.page + 1),
                }).toString()}`}
                className="inline-flex rounded-full bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-200"
              >
                {text.next}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
