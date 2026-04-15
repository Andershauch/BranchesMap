"use server";

import { redirect } from "next/navigation";

import { signIn, signOut } from "@/auth";
import { recordAuditEvent } from "@/lib/server/audit";
import { getCurrentUser } from "@/lib/server/auth";
import { buildRateLimitKey, consumeRateLimit } from "@/lib/server/rate-limit";
import { followMunicipalitySearch } from "@/lib/server/search-follows";
import { authenticateUser, registerUser } from "@/lib/server/users";

function getLocale(value: FormDataEntryValue | null) {
  return typeof value === "string" && value ? value : "da";
}

function getString(value: FormDataEntryValue | null) {
  return typeof value === "string" && value ? value : null;
}

function safeRedirectPath(locale: string, requestedPath: FormDataEntryValue | null, fallback: string) {
  if (typeof requestedPath === "string" && requestedPath.startsWith(`/${locale}/`) && !requestedPath.startsWith("//")) {
    return requestedPath;
  }

  return fallback;
}

function withParams(pathname: string, params: Record<string, string | null | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function normalizeEmail(email: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

function consumeAuthAttemptLimit(namespace: string, email: string) {
  // Server actions do not expose the raw request, so this first pass keys on normalized email.
  // The next hardening step can move auth flows to route handlers if we want per-IP + per-email limits.
  return consumeRateLimit(buildRateLimitKey(namespace, new Headers(), email || "unknown"), {
    limit: namespace === "auth-login" ? 8 : 6,
    windowMs: 15 * 60 * 1000,
  });
}

export async function loginAction(formData: FormData) {
  const locale = getLocale(formData.get("locale"));
  const redirectTo = safeRedirectPath(locale, formData.get("redirectTo"), `/${locale}/follows`);
  const email = normalizeEmail(getString(formData.get("email")));
  const password = getString(formData.get("password"));
  const followMunicipality = getString(formData.get("followMunicipality"));
  const throttle = consumeAuthAttemptLimit("auth-login", email);

  if (!throttle.allowed) {
    redirect(
      withParams(`/${locale}/login`, {
        error: "invalid_credentials",
        redirectTo,
        followMunicipality,
      }),
    );
  }

  if (!email || !password) {
    redirect(
      withParams(`/${locale}/login`, {
        error: "missing_fields",
        redirectTo,
        followMunicipality,
      }),
    );
  }

  const user = await authenticateUser({ email, password });
  if (!user) {
    redirect(
      withParams(`/${locale}/login`, {
        error: "invalid_credentials",
        redirectTo,
        followMunicipality,
      }),
    );
  }

  await recordAuditEvent({
    userId: user.id,
    action: "auth.login",
    entityType: "User",
    entityId: user.id,
    metadata: { locale },
  });

  let finalRedirect = redirectTo;

  if (followMunicipality) {
    const followResult = await followMunicipalitySearch({
      userId: user.id,
      municipalitySlug: followMunicipality,
      locale,
    });

    if (followResult.ok) {
      await recordAuditEvent({
        userId: user.id,
        action: followResult.created ? "search_follow.create" : followResult.reactivated ? "search_follow.reactivate" : "search_follow.duplicate",
        entityType: "SearchFollow",
        entityId: followResult.follow.id,
        metadata: { municipalitySlug: followMunicipality, via: "login" },
      });
      finalRedirect = withParams(finalRedirect, {
        followed: followResult.created || followResult.reactivated ? "created" : "exists",
      });
    } else {
      finalRedirect = withParams(finalRedirect, { followed: "error" });
    }
  }

  await signIn("credentials", {
    email,
    password,
    redirectTo: finalRedirect,
  });
}

export async function registerAction(formData: FormData) {
  const locale = getLocale(formData.get("locale"));
  const redirectTo = safeRedirectPath(locale, formData.get("redirectTo"), `/${locale}/follows`);
  const email = normalizeEmail(getString(formData.get("email")));
  const password = getString(formData.get("password"));
  const name = getString(formData.get("name"));
  const followMunicipality = getString(formData.get("followMunicipality"));
  const throttle = consumeAuthAttemptLimit("auth-register", email);

  if (!throttle.allowed) {
    redirect(
      withParams(`/${locale}/register`, {
        error: "unknown",
        redirectTo,
        followMunicipality,
      }),
    );
  }

  if (!email || !password) {
    redirect(
      withParams(`/${locale}/register`, {
        error: "missing_fields",
        redirectTo,
        followMunicipality,
      }),
    );
  }

  const result = await registerUser({
    email,
    password,
    name: name ?? undefined,
    locale,
  });

  if (!result.ok) {
    redirect(
      withParams(`/${locale}/register`, {
        error: result.reason,
        redirectTo,
        followMunicipality,
      }),
    );
  }

  await recordAuditEvent({
    userId: result.user.id,
    action: "auth.register",
    entityType: "User",
    entityId: result.user.id,
    metadata: { locale },
  });

  let finalRedirect = redirectTo;

  if (followMunicipality) {
    const followResult = await followMunicipalitySearch({
      userId: result.user.id,
      municipalitySlug: followMunicipality,
      locale,
    });

    if (followResult.ok) {
      await recordAuditEvent({
        userId: result.user.id,
        action: followResult.created ? "search_follow.create" : followResult.reactivated ? "search_follow.reactivate" : "search_follow.duplicate",
        entityType: "SearchFollow",
        entityId: followResult.follow.id,
        metadata: { municipalitySlug: followMunicipality, via: "register" },
      });
      finalRedirect = withParams(finalRedirect, {
        followed: followResult.created || followResult.reactivated ? "created" : "exists",
      });
    } else {
      finalRedirect = withParams(finalRedirect, { followed: "error" });
    }
  }

  await signIn("credentials", {
    email,
    password,
    redirectTo: finalRedirect,
  });
}

export async function logoutAction(formData: FormData) {
  const locale = getLocale(formData.get("locale"));
  const user = await getCurrentUser();

  if (user) {
    await recordAuditEvent({
      userId: user.id,
      action: "auth.logout",
      entityType: "User",
      entityId: user.id,
      metadata: { locale },
    });
  }

  await signOut({ redirectTo: `/${locale}` });
}
