import "server-only";

function normalizeRequiredEnvVar(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getRequiredProductionEnvVar(name: string) {
  const value = normalizeRequiredEnvVar(process.env[name]);

  if (value) {
    return value;
  }

  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  throw new Error(`${name} must be configured in production.`);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getConfiguredAuthSecret() {
  return getRequiredProductionEnvVar("AUTH_SECRET");
}

export function getConfiguredAdminEmails() {
  const raw =
    normalizeRequiredEnvVar(process.env.ADMIN_USER_EMAILS) ??
    getRequiredProductionEnvVar("ADMIN_USER_EMAILS") ??
    "";

  return raw
    .split(",")
    .map((value) => normalizeEmail(value))
    .filter(Boolean);
}

export function getConfiguredAdminEmailSet() {
  return new Set(getConfiguredAdminEmails());
}

export const citizenSessionMaxAgeSeconds = 60 * 60 * 24 * 7;
export const citizenSessionUpdateAgeSeconds = 60 * 60 * 12;
