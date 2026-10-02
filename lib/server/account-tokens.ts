import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/server/prisma";
import { hashPassword } from "@/lib/server/password";
import { sendEmailVerificationEmail, sendPasswordResetEmail } from "@/lib/server/email";
import { getTrustedAppBaseUrl } from "@/lib/server/request-origin";
import { validatePassword } from "@/lib/server/users";

const emailVerificationTtlMs = 24 * 60 * 60 * 1000;
const passwordResetTtlMs = 60 * 60 * 1000;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: createHash("sha256").update(token).digest("hex") };
}

function buildAccountUrl(path: string, token: string, locale: string, redirectTo?: string) {
  const url = new URL(path, getTrustedAppBaseUrl());
  url.searchParams.set("token", token);
  url.searchParams.set("locale", locale);
  if (redirectTo) url.searchParams.set("redirectTo", redirectTo);
  return url.toString();
}

export async function createEmailVerificationRequest({
  userId,
  email,
  locale,
  redirectTo,
  followMunicipality,
  sendEmail = sendEmailVerificationEmail,
}: {
  userId: string;
  email: string;
  locale: string;
  redirectTo?: string;
  followMunicipality?: string;
  sendEmail?: typeof sendEmailVerificationEmail;
}) {
  const { token, tokenHash } = createToken();
  const expiresAt = new Date(Date.now() + emailVerificationTtlMs);

  await prisma.$transaction(async (tx) => {
    await tx.userActionToken.updateMany({
      where: { userId, purpose: "email_verification", consumedAt: null },
      data: { consumedAt: new Date() },
    });
    await tx.userActionToken.create({
      data: { userId, purpose: "email_verification", tokenHash, expiresAt },
    });
  });

  const verificationUrl = new URL(
    buildAccountUrl(`/${locale}/verify-email/confirm`, token, locale, redirectTo),
  );
  if (followMunicipality) verificationUrl.searchParams.set("followMunicipality", followMunicipality);

  await sendEmail({
    to: email,
    verificationUrl: verificationUrl.toString(),
    locale,
  });

  return { expiresAt };
}

export async function requestEmailVerification({
  email,
  locale,
  redirectTo,
  followMunicipality,
  sendEmail = sendEmailVerificationEmail,
}: {
  email: string;
  locale: string;
  redirectTo?: string;
  followMunicipality?: string;
  sendEmail?: typeof sendEmailVerificationEmail;
}) {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    select: { id: true, email: true, locale: true, emailVerifiedAt: true, isActive: true },
  });

  if (!user || user.emailVerifiedAt || !user.isActive) return;

  await createEmailVerificationRequest({
    userId: user.id,
    email: user.email,
    locale: user.locale || locale,
    redirectTo,
    followMunicipality,
    sendEmail,
  });
}

export async function getEmailVerificationRequest(token: string) {
  if (!token || token.length > 128) return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const request = await prisma.userActionToken.findUnique({
    where: { tokenHash },
    select: { id: true, purpose: true, expiresAt: true, consumedAt: true, user: { select: { email: true } } },
  });

  if (
    !request ||
    request.purpose !== "email_verification" ||
    request.consumedAt ||
    request.expiresAt.getTime() <= Date.now()
  ) {
    return null;
  }

  return { email: request.user.email };
}

export async function verifyEmailAddress(token: string) {
  if (!token || token.length > 128) return { ok: false as const };
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const request = await tx.userActionToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, purpose: true, expiresAt: true, consumedAt: true },
    });

    if (
      !request ||
      request.purpose !== "email_verification" ||
      request.consumedAt ||
      request.expiresAt <= now
    ) {
      return { ok: false as const };
    }

    const consumed = await tx.userActionToken.updateMany({
      where: {
        id: request.id,
        purpose: "email_verification",
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });

    if (consumed.count !== 1) return { ok: false as const };

    const user = await tx.user.update({
      where: { id: request.userId },
      data: { emailVerifiedAt: now },
      select: { id: true, email: true },
    });

    await tx.userActionToken.updateMany({
      where: {
        userId: request.userId,
        purpose: "email_verification",
        consumedAt: null,
      },
      data: { consumedAt: now },
    });

    return { ok: true as const, user };
  });
}

export async function requestPasswordReset({
  email,
  locale,
  sendEmail = sendPasswordResetEmail,
}: {
  email: string;
  locale: string;
  sendEmail?: typeof sendPasswordResetEmail;
}) {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    select: { id: true, email: true, locale: true, emailVerifiedAt: true, isActive: true },
  });

  if (!user || !user.emailVerifiedAt || !user.isActive) return;

  const { token, tokenHash } = createToken();
  const expiresAt = new Date(Date.now() + passwordResetTtlMs);
  await prisma.$transaction(async (tx) => {
    await tx.userActionToken.updateMany({
      where: { userId: user.id, purpose: "password_reset", consumedAt: null },
      data: { consumedAt: new Date() },
    });
    await tx.userActionToken.create({
      data: { userId: user.id, purpose: "password_reset", tokenHash, expiresAt },
    });
  });

  await sendEmail({
    to: user.email,
    resetUrl: buildAccountUrl(`/${user.locale || locale}/reset-password`, token, user.locale || locale),
    locale: user.locale || locale,
  });
}

export async function resetPassword({ token, password }: { token: string; password: string }) {
  if (!token || token.length > 128) return { ok: false as const, reason: "invalid_token" as const };
  if (!validatePassword(password)) return { ok: false as const, reason: "weak_password" as const };

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const passwordHash = hashPassword(password);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const request = await tx.userActionToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, purpose: true, expiresAt: true, consumedAt: true, user: { select: { isActive: true } } },
    });

    if (
      !request ||
      request.purpose !== "password_reset" ||
      request.consumedAt ||
      request.expiresAt <= now ||
      !request.user.isActive
    ) {
      return { ok: false as const, reason: "invalid_token" as const };
    }

    const consumed = await tx.userActionToken.updateMany({
      where: {
        id: request.id,
        purpose: "password_reset",
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });

    if (consumed.count !== 1) return { ok: false as const, reason: "invalid_token" as const };

    await tx.user.update({
      where: { id: request.userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    await tx.userActionToken.updateMany({
      where: { userId: request.userId, purpose: "password_reset", consumedAt: null },
      data: { consumedAt: now },
    });

    return { ok: true as const };
  });
}
