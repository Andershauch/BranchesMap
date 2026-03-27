import "server-only";

import { prisma } from "@/lib/server/prisma";
import { hashPassword, verifyPassword } from "@/lib/server/password";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
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

  return user;
}