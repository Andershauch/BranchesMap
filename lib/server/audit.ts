import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/server/prisma";

export async function recordAuditEvent({
  userId,
  action,
  entityType,
  entityId,
  metadata,
}: {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.auditEvent.create({
      data: {
        userId: userId ?? null,
        action,
        entityType,
        entityId,
        metadata,
      },
    });
  } catch (error) {
    console.error("Failed to write audit event.", error);
  }
}

export type SecurityAuditEvent = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  user: {
    id: string;
    email: string;
    name: string | null;
  } | null;
};

export async function listRecentSecurityAuditEvents(limit = 20): Promise<SecurityAuditEvent[]> {
  return prisma.auditEvent.findMany({
    where: {
      action: {
        startsWith: "security.",
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: Math.max(1, Math.min(limit, 100)),
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });
}
