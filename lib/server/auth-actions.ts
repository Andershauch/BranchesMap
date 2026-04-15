"use server";

import { redirect } from "next/navigation";

import { signIn, signOut } from "@/auth";
import { recordAuditEvent } from "@/lib/server/audit";
import { getCurrentUser } from "@/lib/server/auth";
import {
  buildRateLimitKey,
  consumeDistributedRateLimitGroup,
} from "@/lib/server/rate-limit";
import { followMunicipalitySearch } from "@/lib/server/search-follows";
import {
  parseLocaleValue,
  parseNormalizedEmail,
  parseOptionalString,
  parseSafeRedirectPath,
} from "@/lib/server/input-validation";
import { recordSecurityEvent } from "@/lib/server/security-events";
import { authenticateUser, registerUser } from "@/lib/server/users";

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

function consumeAuthAttemptLimit(namespace: string, email: string) {
  // Server actions do not expose the raw request, so this pass combines a global gate with
  // an identity gate. A later move to route handlers can add per-IP enforcement as well.
  return consumeDistributedRateLimitGroup([
    {
      key: buildRateLimitKey(`${namespace}-global`, new Headers(), "global"),
      limit: namespace === "auth-login" ? 40 : 25,
      windowMs: 15 * 60 * 1000,
    },
    {
      key: buildRateLimitKey(namespace, new Headers(), email || "unknown"),
      limit: namespace === "auth-login" ? 8 : 6,
      windowMs: 15 * 60 * 1000,
    },
  ]);
}

function consumeAuthFailureLimit(namespace: string, email: string) {
  return consumeDistributedRateLimitGroup([
    {
      key: buildRateLimitKey(`${namespace}-fail-global`, new Headers(), "global"),
      limit: namespace === "auth-login-failure" ? 25 : 20,
      windowMs: 30 * 60 * 1000,
    },
    {
      key: buildRateLimitKey(namespace, new Headers(), email || "unknown"),
      limit: namespace === "auth-login-failure" ? 5 : 4,
      windowMs: 30 * 60 * 1000,
    },
  ]);
}

export async function loginAction(formData: FormData) {
  const locale = parseLocaleValue(formData.get("locale"));
  const redirectTo = parseSafeRedirectPath(locale, formData.get("redirectTo"), `/${locale}/follows`);
  const email = parseNormalizedEmail(formData.get("email"));
  const password = parseOptionalString(formData.get("password"));
  const followMunicipality = parseOptionalString(formData.get("followMunicipality"));
  const throttle = await consumeAuthAttemptLimit("auth-login", email);

  if (!throttle.allowed) {
    await recordSecurityEvent({
      action: "auth_throttled",
      entityType: "User",
      metadata: {
        flow: "login",
        email,
      },
    });

    redirect(
      withParams(`/${locale}/login`, {
        error: "invalid_credentials",
        redirectTo,
        followMunicipality,
      }),
    );
  }

  if (!email || !password) {
    await consumeAuthFailureLimit("auth-login-failure", email);
    await recordSecurityEvent({
      action: "auth_failure",
      entityType: "User",
      metadata: {
        flow: "login",
        reason: "missing_fields",
        email,
      },
    });
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
    await consumeAuthFailureLimit("auth-login-failure", email);
    await recordSecurityEvent({
      action: "auth_failure",
      entityType: "User",
      metadata: {
        flow: "login",
        reason: "invalid_credentials",
        email,
      },
    });
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
  const locale = parseLocaleValue(formData.get("locale"));
  const redirectTo = parseSafeRedirectPath(locale, formData.get("redirectTo"), `/${locale}/follows`);
  const email = parseNormalizedEmail(formData.get("email"));
  const password = parseOptionalString(formData.get("password"));
  const name = parseOptionalString(formData.get("name"));
  const followMunicipality = parseOptionalString(formData.get("followMunicipality"));
  const throttle = await consumeAuthAttemptLimit("auth-register", email);

  if (!throttle.allowed) {
    await consumeAuthFailureLimit("auth-register-failure", email);
    await recordSecurityEvent({
      action: "auth_throttled",
      entityType: "User",
      metadata: {
        flow: "register",
        email,
      },
    });
    redirect(
      withParams(`/${locale}/register`, {
        error: "unknown",
        redirectTo,
        followMunicipality,
      }),
    );
  }

  if (!email || !password) {
    await consumeAuthFailureLimit("auth-register-failure", email);
    await recordSecurityEvent({
      action: "auth_failure",
      entityType: "User",
      metadata: {
        flow: "register",
        reason: "missing_fields",
        email,
      },
    });
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
    await consumeAuthFailureLimit("auth-register-failure", email);
    await recordSecurityEvent({
      action: "auth_failure",
      entityType: "User",
      metadata: {
        flow: "register",
        reason: result.reason,
        email,
      },
    });
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
  const locale = parseLocaleValue(formData.get("locale"));
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
