import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { getTrustedAppBaseUrl } from "@/lib/server/request-origin";
import { prisma } from "@/lib/server/prisma";
import { hashPassword } from "@/lib/server/password";
import { sendUserInvitationEmail } from "@/lib/server/email";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createRawToken() {
  return randomBytes(32).toString("base64url");
}

export async function createUserInvitation({
  email,
  name,
  locale,
  role,
  invitedByUserId,
  sendEmail = sendUserInvitationEmail,
}: {
  email: string;
  name?: string;
  locale: string;
  role: "user" | "admin";
  invitedByUserId: string;
  sendEmail?: typeof sendUserInvitationEmail;
}) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return { ok: false as const, reason: "email_taken" };
  }

  await prisma.userInvitation.deleteMany({
    where: {
      email,
      acceptedAt: null,
    },
  });

  const rawToken = createRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  const invitation = await prisma.userInvitation.create({
    data: {
      email,
      name: name?.trim() || null,
      locale,
      role,
      tokenHash,
      invitedByUserId,
      expiresAt,
    },
  });

  const inviteUrl = new URL(`/${locale}/invite/${rawToken}`, getTrustedAppBaseUrl()).toString();

  await sendEmail({
    to: email,
    inviteUrl,
    locale,
    role,
  });

  return { ok: true as const, invitation };
}

export async function getUserInvitationByToken(token: string) {
  const tokenHash = hashToken(token);

  const invitation = await prisma.userInvitation.findUnique({
    where: { tokenHash },
  });

  if (!invitation) {
    return null;
  }

  if (invitation.acceptedAt) {
    return null;
  }

  if (invitation.expiresAt.getTime() < Date.now()) {
    return null;
  }

  return invitation;
}

export async function acceptUserInvitation({
  token,
  password,
}: {
  token: string;
  password: string;
}) {
  const invitation = await getUserInvitationByToken(token);

  if (!invitation) {
    return { ok: false as const, reason: "invalid_invitation" };
  }

  if (!password || password.trim().length < 10) {
    return { ok: false as const, reason: "weak_password" };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
    select: { id: true },
  });

  if (existingUser) {
    return { ok: false as const, reason: "email_taken" };
  }

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email: invitation.email,
        passwordHash: hashPassword(password),
        emailVerifiedAt: new Date(),
        name: invitation.name,
        locale: invitation.locale,
        role: invitation.role,
        isActive: true,
      },
    });

    await tx.userInvitation.update({
      where: { id: invitation.id },
      data: {
        acceptedAt: new Date(),
      },
    });

    return createdUser;
  });

  return {
    ok: true as const,
    user,
    invitation,
  };
}
