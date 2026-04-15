import "server-only";

import { recordAuditEvent } from "@/lib/server/audit";

export async function recordSecurityEvent({
  action,
  userId,
  entityType,
  entityId,
  metadata,
}: {
  action: string;
  userId?: string | null;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}) {
  await recordAuditEvent({
    userId,
    action: `security.${action}`,
    entityType,
    entityId,
    metadata,
  });
}
