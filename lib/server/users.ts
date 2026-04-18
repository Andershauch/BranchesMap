import "server-only";

import { getConfiguredAdminEmailSet } from "@/lib/server/auth-config";
import { prisma } from "@/lib/server/prisma";
import { hashPassword, verifyPassword } from "@/lib/server/password";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getAdminEmailSet() {
  return getConfiguredAdminEmailSet();
}

function resolveRoleForEmail(email: string) {
  return getAdminEmailSet().has(email) ? "admin" : "user";
}

export function validatePassword(password: string) {
  return password.trim().length >= 10;
}

export async function registerUser({
  email,
  password,
  name,
  locale,
}: {
  email: string;
  password: string;
  name?: string;
  locale: string;
}) {
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (existingUser) {
    return { ok: false as const, reason: "email_taken" };
  }

  if (!validatePassword(password)) {
    return { ok: false as const, reason: "weak_password" };
  }

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      name: name?.trim() || null,
      locale,
      role: resolveRoleForEmail(normalizedEmail),
    },
  });

  return { ok: true as const, user };
}

export async function authenticateUser({ email, password }: { email: string; password: string }) {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user?.passwordHash) {
    return null;
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return null;
  }

  const resolvedRole = resolveRoleForEmail(normalizedEmail);
  if (user.role !== resolvedRole) {
    return prisma.user.update({
      where: { id: user.id },
      data: { role: resolvedRole },
    });
  }

  return user;
}
