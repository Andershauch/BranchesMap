import "server-only";

import { getCurrentAdminUser } from "@/lib/server/auth";
import { getConfiguredAdminEmails } from "@/lib/server/auth-config";

function hasConfiguredAdminUsers() {
  return getConfiguredAdminEmails().length > 0;
}

export function isAdminConfigured() {
  return hasConfiguredAdminUsers();
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
