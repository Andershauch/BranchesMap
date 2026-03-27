import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/server/prisma";

const SESSION_COOKIE_NAME = "branches-map-session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  locale: string;
};

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export async function createSessionForUser(userId: string) {
  const sessionToken = randomBytes(32).toString("base64url");
  const sessionTokenHash = hashSessionToken(sessionToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.userSession.create({
    data: {
      userId,
      sessionTokenHash,
      expiresAt,
    },
  });

  return { sessionToken, expiresAt };
}

export async function deleteSessionByToken(sessionToken: string | null | undefined) {
  if (!sessionToken) {
    return;
  }

  await prisma.userSession.deleteMany({
    where: {
      sessionTokenHash: hashSessionToken(sessionToken),
    },
  });
}

export async function getUserFromSessionToken(sessionToken: string | null | undefined): Promise<AuthUser | null> {
  if (!sessionToken) {
    return null;
  }

  const session = await prisma.userSession.findUnique({
    where: {
      sessionTokenHash: hashSessionToken(sessionToken),
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.userSession.delete({ where: { id: session.id } });
    return null;
  }

  await prisma.userSession.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() },
  });

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    locale: session.user.locale,
  };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  return getUserFromSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function requireCurrentUser(redirectTo?: string) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(redirectTo ?? "/da/login");
  }

  return user;
}

export function createSessionCookieValue(sessionToken: string, expiresAt: Date) {
  return {
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    expires: expiresAt,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    },
  };
}

export function createClearedSessionCookieValue() {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    expires: new Date(0),
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
      maxAge: 0,
    },
  };
}