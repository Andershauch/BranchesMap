import "server-only";

import { defaultLocale, isValidLocale, type AppLocale } from "@/lib/i18n/config";

export function parseLocaleValue(value: FormDataEntryValue | null, fallback: AppLocale = defaultLocale) {
  return typeof value === "string" && isValidLocale(value) ? value : fallback;
}

export function parseOptionalString(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export function parseNormalizedEmail(value: FormDataEntryValue | null) {
  return parseOptionalString(value)?.toLowerCase() ?? "";
}

export function isSimpleSlug(value: string) {
  return /^[a-z0-9-]{2,64}$/.test(value);
}

export function isRecordId(value: string) {
  return /^[a-z0-9]{12,32}$/i.test(value);
}

export function parseSafeRedirectPath(
  locale: AppLocale,
  requestedPath: FormDataEntryValue | null,
  fallback: string,
) {
  if (
    typeof requestedPath === "string" &&
    requestedPath.startsWith(`/${locale}/`) &&
    !requestedPath.startsWith("//")
  ) {
    return requestedPath;
  }

  return fallback;
}

export function parseBoundedInt(
  value: FormDataEntryValue | null,
  { fallback, min, max }: { fallback: number; min: number; max: number },
) {
  if (typeof value !== "string" || value.trim() === "") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

export function parseEnumValue<const T extends readonly string[]>(
  value: FormDataEntryValue | null,
  allowed: T,
  fallback: T[number],
) {
  return typeof value === "string" && allowed.includes(value) ? value : fallback;
}
