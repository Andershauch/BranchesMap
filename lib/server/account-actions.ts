"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { recordSecurityEvent } from "@/lib/server/security-events";
import { createEmailVerificationRequest, requestPasswordReset, resetPassword, verifyEmailAddress } from "@/lib/server/account-tokens";
import { buildRateLimitKey, consumeDistributedRateLimitGroup, getRateLimitClientIp } from "@/lib/server/rate-limit";
import { parseLocaleValue, parseNormalizedEmail, parseOptionalString, parseSafeRedirectPath } from "@/lib/server/input-validation";
import { prisma } from "@/lib/server/prisma";

async function limitAction(name: string, email: string) {
  const requestHeaders = new Headers(await headers());
  const ip = getRateLimitClientIp(requestHeaders);
  const result = await consumeDistributedRateLimitGroup([
    { key: buildRateLimitKey(`${name}-ip`, requestHeaders), limit: 30, windowMs: 15 * 60 * 1000 },
    { key: buildRateLimitKey(name, requestHeaders, email || "unknown"), limit: 5, windowMs: 15 * 60 * 1000 },
  ]);
  return { result, ip };
}

export async function requestVerificationAction(formData: FormData) {
  const locale = parseLocaleValue(formData.get("locale"));
  const email = parseNormalizedEmail(formData.get("email"));
  const redirectTo = parseSafeRedirectPath(locale, formData.get("redirectTo"), `/${locale}/follows`);
  const followMunicipality = parseOptionalString(formData.get("followMunicipality")) ?? undefined;
  const { result, ip } = await limitAction("auth-verification-request", email);

  if (result.allowed && email) {
    try {
      await createOrResendVerification({ email, locale, redirectTo, followMunicipality });
    } catch {
      await recordSecurityEvent({
        action: "auth_verification_email_failed",
        entityType: "User",
        metadata: { ip, flow: "resend" },
      });
    }
  }

  redirect(`/${locale}/verify-email?sent=1`);
}

async function createOrResendVerification({
  email,
  locale,
  redirectTo,
  followMunicipality,
}: {
  email: string;
  locale: string;
  redirectTo: string;
  followMunicipality?: string;
}) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, locale: true, emailVerifiedAt: true, isActive: true },
  });
  if (!user || user.emailVerifiedAt || !user.isActive) return;

  await createEmailVerificationRequest({
    userId: user.id,
    email: user.email,
    locale: user.locale || locale,
    redirectTo,
    followMunicipality,
  });
}

export async function requestPasswordResetAction(formData: FormData) {
  const locale = parseLocaleValue(formData.get("locale"));
  const email = parseNormalizedEmail(formData.get("email"));
  const { result, ip } = await limitAction("auth-password-reset-request", email);

  if (result.allowed && email) {
    try {
      await requestPasswordReset({ email, locale });
    } catch {
      await recordSecurityEvent({
        action: "auth_password_reset_email_failed",
        entityType: "User",
        metadata: { ip, flow: "request" },
      });
    }
  }

  redirect(`/${locale}/forgot-password?sent=1`);
}

export async function confirmEmailAction(formData: FormData) {
  const locale = parseLocaleValue(formData.get("locale"));
  const token = parseOptionalString(formData.get("token")) ?? "";
  const redirectTo = parseSafeRedirectPath(locale, formData.get("redirectTo"), `/${locale}/follows`);
  const followMunicipality = parseOptionalString(formData.get("followMunicipality"));
  const verified = await verifyEmailAddress(token);

  if (!verified.ok) redirect(`/${locale}/verify-email?invalid=1`);

  await recordSecurityEvent({
    action: "auth_email_verified",
    entityType: "User",
    metadata: { userId: verified.user.id },
  });
  const loginUrl = new URL(`/${locale}/login`, "https://local.invalid");
  loginUrl.searchParams.set("verified", "1");
  loginUrl.searchParams.set("redirectTo", redirectTo);
  if (followMunicipality) loginUrl.searchParams.set("followMunicipality", followMunicipality);
  redirect(`${loginUrl.pathname}${loginUrl.search}`);
}

export async function resetPasswordAction(formData: FormData) {
  const locale = parseLocaleValue(formData.get("locale"));
  const token = parseOptionalString(formData.get("token")) ?? "";
  const password = parseOptionalString(formData.get("password")) ?? "";
  const result = await resetPassword({ token, password });

  if (result.ok) {
    redirect(`/${locale}/login?passwordReset=1`);
  }

  redirect(`/${locale}/reset-password?invalid=1`);
}
