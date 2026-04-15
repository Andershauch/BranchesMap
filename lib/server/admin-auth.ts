import "server-only";

import { getCurrentAdminUser } from "@/lib/server/auth";

function hasConfiguredAdminUsers() {
  return (process.env.ADMIN_USER_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim())
    .some(Boolean);
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
