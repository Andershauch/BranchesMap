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