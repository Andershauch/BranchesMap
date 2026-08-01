import "server-only";

import { getCurrentAdminUser, getCurrentSuperAdminUser } from "@/lib/server/auth";
import { hasSuperAdminAccount } from "@/lib/server/users";

export async function isAdminConfigured() {
  return hasSuperAdminAccount();
}

export async function isAdminAuthenticated() {
  return Boolean(await getCurrentAdminUser());
}

export async function requireAdminAuth() {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    throw new Error("Admin authentication required.");
  }
}

export async function isSuperAdminAuthenticated() {
  return Boolean(await getCurrentSuperAdminUser());
}

export async function requireSuperAdminAuth() {
  const authenticated = await isSuperAdminAuthenticated();
  if (!authenticated) {
    throw new Error("Superadmin authentication required.");
  }
}
