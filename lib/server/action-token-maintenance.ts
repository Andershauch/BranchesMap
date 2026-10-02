import "server-only";

import type { PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/server/prisma";

const dayMs = 24 * 60 * 60 * 1000;
const defaultRetentionDays = 30;

export async function pruneExpiredUserActionTokens({
  now = new Date(),
  retentionDays = defaultRetentionDays,
  db = prisma,
}: {
  now?: Date;
  retentionDays?: number;
  db?: PrismaClient;
} = {}) {
  if (!Number.isInteger(retentionDays) || retentionDays < 1) {
    throw new Error("retentionDays must be a positive integer.");
  }

  const cutoff = new Date(now.getTime() - retentionDays * dayMs);
  const result = await db.userActionToken.deleteMany({
    where: { expiresAt: { lt: cutoff } },
  });

  return { deleted: result.count, cutoff };
}
