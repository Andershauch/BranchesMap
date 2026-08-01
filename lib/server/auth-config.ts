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

export function getConfiguredAuthSecret() {
  return getRequiredProductionEnvVar("AUTH_SECRET");
}

export function getConfiguredSuperAdminSetupSecret() {
  return normalizeRequiredEnvVar(process.env.SUPERADMIN_SETUP_SECRET);
}

export const citizenSessionMaxAgeSeconds = 60 * 60 * 24 * 7;
export const citizenSessionUpdateAgeSeconds = 60 * 60 * 12;
