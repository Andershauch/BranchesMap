"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { recordAuditEvent } from "@/lib/server/audit";
import { getConfiguredSuperAdminSetupSecret } from "@/lib/server/auth-config";
import {
  buildRateLimitKey,
  consumeDistributedRateLimitGroup,
  getRateLimitClientIp,
} from "@/lib/server/rate-limit";
import {
  parseLocaleValue,
  parseNormalizedEmail,
  parseOptionalString,
} from "@/lib/server/input-validation";
import { recordSecurityEvent } from "@/lib/server/security-events";
import { createInitialSuperAdmin } from "@/lib/server/users";

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

async function getRequestHeaders() {
  try {
    return new Headers(await headers());
  } catch {
    return new Headers();
  }
}

export async function bootstrapSuperAdminAction(formData: FormData) {
  const locale = parseLocaleValue(formData.get("locale"));
  const email = parseNormalizedEmail(formData.get("email"));
  const password = parseOptionalString(formData.get("password"));
  const name = parseOptionalString(formData.get("name"));
  const setupSecret = parseOptionalString(formData.get("setupSecret"));
  const requestHeaders = await getRequestHeaders();
  const clientIp = getRateLimitClientIp(requestHeaders);
  const setupPath = `/${locale}/setup/superadmin`;
  const rateLimit = await consumeDistributedRateLimitGroup([
    {
      key: buildRateLimitKey("superadmin-setup-ip", requestHeaders),
      limit: 10,
      windowMs: 15 * 60 * 1000,
    },
    {
      key: buildRateLimitKey("superadmin-setup-email", requestHeaders, email || "unknown"),
      limit: 5,
      windowMs: 15 * 60 * 1000,
    },
  ]);

  if (!rateLimit.allowed) {
    await recordSecurityEvent({
      action: "superadmin_setup_throttled",
      entityType: "User",
      metadata: {
        flow: "superadmin_setup",
        email,
        ip: clientIp,
      },
    });

    redirect(withParams(setupPath, { error: "throttled" }));
  }

  const configuredSecret = getConfiguredSuperAdminSetupSecret();

  if (!configuredSecret) {
    redirect(withParams(setupPath, { error: "setup_unavailable" }));
  }

  if (!email || !password || !setupSecret) {
    redirect(withParams(setupPath, { error: "missing_fields" }));
  }

  if (setupSecret !== configuredSecret) {
    await recordSecurityEvent({
      action: "superadmin_setup_rejected",
      entityType: "User",
      metadata: {
        flow: "superadmin_setup",
        reason: "invalid_setup_secret",
        email,
        ip: clientIp,
      },
    });

    redirect(withParams(setupPath, { error: "invalid_setup_secret" }));
  }

  const result = await createInitialSuperAdmin({
    email,
    password,
    name: name ?? undefined,
    locale,
  });

  if (!result.ok) {
    await recordSecurityEvent({
      action: "superadmin_setup_rejected",
      entityType: "User",
      metadata: {
        flow: "superadmin_setup",
        reason: result.reason,
        email,
        ip: clientIp,
      },
    });

    redirect(withParams(setupPath, { error: result.reason }));
  }

  await recordAuditEvent({
    userId: result.user.id,
    action: "auth.superadmin_bootstrap",
    entityType: "User",
    entityId: result.user.id,
    metadata: {
      locale,
      bootstrap: true,
    },
  });

  await signIn("credentials", {
    email,
    password,
    redirectTo: `/${locale}/admin`,
  });
}
