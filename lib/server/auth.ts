import "server-only";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/server/prisma";

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
  role: "user" | "admin" | "superadmin";
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await auth();
  const user = session?.user;

  if (!user?.id || !user.email) {
    return null;
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      locale: true,
      role: true,
      isActive: true,
    },
  });

  if (!currentUser?.isActive) {
    return null;
  }

  return {
    id: currentUser.id,
    email: currentUser.email,
    name: currentUser.name ?? null,
    locale: currentUser.locale,
    role: currentUser.role,
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
  return user?.role === "admin" || user?.role === "superadmin";
}

export async function getCurrentAdminUser() {
  const user = await getCurrentUser();
  return isAdminUser(user) ? user : null;
}

export async function requireAdminUser(redirectTo?: string) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(redirectTo ?? "/da/login");
  }

  if (!isAdminUser(user)) {
    redirect(`/${user.locale}/follows`);
  }

  return user;
}

export function isSuperAdminUser(user: Pick<AuthUser, "role"> | null | undefined) {
  return user?.role === "superadmin";
}

export async function getCurrentSuperAdminUser() {
  const user = await getCurrentUser();
  return isSuperAdminUser(user) ? user : null;
}

export async function requireSuperAdminUser(redirectTo?: string) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(redirectTo ?? "/da/login");
  }

  if (!isSuperAdminUser(user)) {
    redirect(isAdminUser(user) ? `/${user.locale}/admin` : `/${user.locale}/follows`);
  }

  return user;
}
