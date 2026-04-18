import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/server/prisma";

/**
 * Shared rate-limit primitives.
 *
 * The file exposes two storage models:
 * - in-memory buckets for cheap process-local throttles
 * - database-backed buckets for throttles that must survive across instances
 *
 * Security note:
 * - request headers are treated as hints for client identity, not as strong identity
 * - limits should therefore be layered with auth, origin checks, and auditing
 */
type RateLimitWindow = {
  count: number;
  resetAt: number;
};

const globalForRateLimit = globalThis as typeof globalThis & {
  branchesMapRateLimits?: Map<string, RateLimitWindow>;
};

const rateLimits = globalForRateLimit.branchesMapRateLimits ?? new Map<string, RateLimitWindow>();

if (!globalForRateLimit.branchesMapRateLimits) {
  globalForRateLimit.branchesMapRateLimits = rateLimits;
}

function getClientIp(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  const realIp = headers.get("x-real-ip");
  return realIp?.trim() || "unknown";
}

export function getRateLimitClientIp(headers: Headers) {
  return getClientIp(headers);
}

export function buildRateLimitKey(namespace: string, headers: Headers, extraKey?: string | null) {
  const ip = getClientIp(headers);
  return `${namespace}:${extraKey ?? ip}:${ip}`;
}

export function consumeRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
) {
  const now = Date.now();
  const existing = rateLimits.get(key);

  if (!existing || existing.resetAt <= now) {
    const nextWindow = { count: 1, resetAt: now + windowMs };
    rateLimits.set(key, nextWindow);
    return {
      allowed: true,
      remaining: Math.max(0, limit - nextWindow.count),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  rateLimits.set(key, existing);

  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

export function consumeRateLimitGroup(
  limits: Array<{
    key: string;
    limit: number;
    windowMs: number;
  }>,
) {
  let minimumRemaining = Number.POSITIVE_INFINITY;
  let maximumRetryAfterSeconds = 0;

  for (const entry of limits) {
    const result = consumeRateLimit(entry.key, {
      limit: entry.limit,
      windowMs: entry.windowMs,
    });

    minimumRemaining = Math.min(minimumRemaining, result.remaining);
    maximumRetryAfterSeconds = Math.max(maximumRetryAfterSeconds, result.retryAfterSeconds);

    if (!result.allowed) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: result.retryAfterSeconds,
      };
    }
  }

  return {
    allowed: true,
    remaining: Number.isFinite(minimumRemaining) ? minimumRemaining : 0,
    retryAfterSeconds: maximumRetryAfterSeconds,
  };
}

export async function consumeDistributedRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
) {
  // The UPSERT keeps the hot path in the database so rate limits remain coherent
  // across multiple server instances in production.
  const resetAt = new Date(Date.now() + windowMs);

  const rows = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>(Prisma.sql`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt", "createdAt", "updatedAt")
    VALUES (${key}, 1, ${resetAt}, NOW(), NOW())
    ON CONFLICT ("key")
    DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."resetAt" <= NOW() THEN 1
        ELSE "RateLimitBucket"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimitBucket"."resetAt" <= NOW() THEN ${resetAt}
        ELSE "RateLimitBucket"."resetAt"
      END,
      "updatedAt" = NOW()
    RETURNING "count", "resetAt"
  `);

  const row = rows[0];
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((new Date(row.resetAt).getTime() - Date.now()) / 1000),
  );

  if (row.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - row.count),
    retryAfterSeconds,
  };
}

export async function consumeDistributedRateLimitGroup(
  limits: Array<{
    key: string;
    limit: number;
    windowMs: number;
  }>,
) {
  let minimumRemaining = Number.POSITIVE_INFINITY;
  let maximumRetryAfterSeconds = 0;

  for (const entry of limits) {
    const result = await consumeDistributedRateLimit(entry.key, {
      limit: entry.limit,
      windowMs: entry.windowMs,
    });

    minimumRemaining = Math.min(minimumRemaining, result.remaining);
    maximumRetryAfterSeconds = Math.max(maximumRetryAfterSeconds, result.retryAfterSeconds);

    if (!result.allowed) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: result.retryAfterSeconds,
      };
    }
  }

  return {
    allowed: true,
    remaining: Number.isFinite(minimumRemaining) ? minimumRemaining : 0,
    retryAfterSeconds: maximumRetryAfterSeconds,
  };
}
