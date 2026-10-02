import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/server/prisma";
import { hashPassword, verifyPassword } from "@/lib/server/password";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validatePassword(password: string) {
  return password.trim().length >= 10;
}

export async function hasSuperAdminAccount() {
  const count = await prisma.user.count({
    where: {
      role: "superadmin",
    },
  });

  return count > 0;
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
      role: "user",
      emailVerifiedAt: null,
    },
  });

  return { ok: true as const, user };
}

export async function authenticateUser({ email, password }: { email: string; password: string }) {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user?.passwordHash) {
    return {
      ok: false as const,
      reason: "invalid_credentials" as const,
    };
  }

  if (!user.isActive) {
    return {
      ok: false as const,
      reason: "deactivated_account" as const,
    };
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return {
      ok: false as const,
      reason: "invalid_credentials" as const,
    };
  }

  if (!user.emailVerifiedAt) {
    return {
      ok: false as const,
      reason: "email_not_verified" as const,
    };
  }

  return {
    ok: true as const,
    user,
  };
}

export async function createInitialSuperAdmin({
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

  if (await hasSuperAdminAccount()) {
    return { ok: false as const, reason: "already_configured" };
  }

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
      role: "superadmin",
      // The one-time setup secret is issued by the deployment owner, who selects the initial administrator.
      emailVerifiedAt: new Date(),
    },
  });

  return { ok: true as const, user };
}

export async function createAdminManagedUser({
  email,
  password,
  name,
  locale,
  role,
}: {
  email: string;
  password: string;
  name?: string;
  locale: string;
  role: "user" | "admin";
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
      role,
      isActive: true,
    },
  });

  return { ok: true as const, user };
}

export type AdminUserListItem = {
  id: string;
  email: string;
  name: string | null;
  locale: string;
  role: "user" | "admin" | "superadmin";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  savedSearchCount: number;
  followCount: number;
};

export async function listUsersForAdmin({
  query,
  page,
  pageSize,
}: {
  query: string;
  page: number;
  pageSize: number;
}) {
  const normalizedQuery = query.trim();
  const where: Prisma.UserWhereInput = normalizedQuery
    ? {
        OR: [
          {
            email: {
              contains: normalizedQuery,
              mode: "insensitive",
            },
          },
          {
            name: {
              contains: normalizedQuery,
              mode: "insensitive",
            },
          },
        ],
      }
    : {};

  const safePageSize = Math.max(1, Math.min(pageSize, 50));
  const safePage = Math.max(1, page);
  const skip = (safePage - 1) * safePageSize;

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ role: "asc" }, { createdAt: "desc" }],
      skip,
      take: safePageSize,
      select: {
        id: true,
        email: true,
        name: true,
        locale: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            savedSearches: true,
            searchFollows: true,
          },
        },
      },
    }),
  ]);

  return {
    query: normalizedQuery,
    page: safePage,
    pageSize: safePageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / safePageSize)),
    rows: rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      locale: row.locale,
      role: row.role,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      savedSearchCount: row._count.savedSearches,
      followCount: row._count.searchFollows,
    })) as AdminUserListItem[],
  };
}

export async function updateUserAdminRole({
  actorUserId,
  targetUserId,
  makeAdmin,
}: {
  actorUserId: string;
  targetUserId: string;
  makeAdmin: boolean;
}) {
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      isActive: true,
    },
  });

  if (!targetUser) {
    throw new Error("User not found.");
  }

  if (targetUser.role === "superadmin") {
    throw new Error("Superadmin role cannot be changed here.");
  }

  const nextRole = makeAdmin ? "admin" : "user";

  if (targetUser.role === nextRole) {
    return {
      updated: false,
      actorUserId,
      user: targetUser,
      previousRole: targetUser.role,
      nextRole,
    };
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      role: nextRole,
      sessionVersion: { increment: 1 },
    },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      isActive: true,
    },
  });

  return {
    updated: true,
    actorUserId,
    user: updatedUser,
    previousRole: targetUser.role,
    nextRole,
  };
}

export async function updateUserActiveState({
  actorUserId,
  targetUserId,
  isActive,
}: {
  actorUserId: string;
  targetUserId: string;
  isActive: boolean;
}) {
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      isActive: true,
    },
  });

  if (!targetUser) {
    throw new Error("User not found.");
  }

  if (targetUser.role === "superadmin") {
    throw new Error("Superadmin account cannot be deactivated here.");
  }

  if (targetUser.isActive === isActive) {
    return {
      updated: false,
      actorUserId,
      user: targetUser,
      previousIsActive: targetUser.isActive,
      nextIsActive: isActive,
    };
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      isActive,
      sessionVersion: { increment: 1 },
    },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      isActive: true,
    },
  });

  return {
    updated: true,
    actorUserId,
    user: updatedUser,
    previousIsActive: targetUser.isActive,
    nextIsActive: isActive,
  };
}
