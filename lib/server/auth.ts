import "server-only";

import { redirect } from "next/navigation";

import { auth } from "@/auth";

/**
 * Server-only helpers for reading and enforcing the authenticated session.
 *
 * These helpers are the narrow bridge between Auth.js session data and the rest
 * of the application. Downstream code should use these helpers instead of
 * reading Auth.js objects directly so role checks and redirect behavior remain
 * consistent.
 */
export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  locale: string;
  role: "user" | "admin";
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await auth();
  const user = session?.user;

  if (!user?.id || !user.email) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    locale: user.locale,
    role: user.role,
  };
}

export async function requireCurrentUser(redirectTo?: string) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(redirectTo ?? "/da/login");
  }

  return user;
}

export function isAdminUser(user: Pick<AuthUser, "role"> | null | undefined) {
  return user?.role === "admin";
}

export async function getCurrentAdminUser() {
  const user = await getCurrentUser();
  return isAdminUser(user) ? user : null;
}

export async function requireAdminUser(redirectTo?: string) {
  const user = await requireCurrentUser(redirectTo);

  if (!isAdminUser(user)) {
    redirect(redirectTo ?? `/${user.locale}/login`);
  }

  return user;
}
