import { NextRequest } from "next/server";

import { isAdminAuthenticated } from "@/lib/server/admin-auth";
import { buildRateLimitKey, consumeDistributedRateLimit } from "@/lib/server/rate-limit";
import { recordSecurityEvent } from "@/lib/server/security-events";
import { checkActiveSearchFollows, checkSearchFollow } from "@/lib/server/search-follows";
import { jsonSecurityResponse } from "@/lib/server/security";

/**
 * Admin/operations endpoint for follow change detection.
 *
 * Access model:
 * - local development requests are allowed for QA convenience
 * - production requires either the follow-check secret or an authenticated admin
 *
 * Operational note:
 * - the endpoint is rate-limited because it can trigger expensive batch work
 * - responses are JSON so scripts and scheduled jobs can call it directly
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getConfiguredSecret() {
  return process.env.FOLLOW_CHECK_SECRET?.trim() || null;
}

function isLocalDevelopmentRequest(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  const hostname = request.nextUrl.hostname;
  const hostHeader = request.headers.get("host")?.toLowerCase() ?? "";

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostHeader.startsWith("localhost:") ||
    hostHeader.startsWith("127.0.0.1:")
  );
}

async function isAuthorized(request: NextRequest) {
  if (isLocalDevelopmentRequest(request)) {
    return true;
  }

  const configuredSecret = getConfiguredSecret();
  const headerSecret = request.headers.get("x-follows-check-secret")?.trim() || null;

  if (configuredSecret && headerSecret === configuredSecret) {
    return true;
  }

  return isAdminAuthenticated();
}

function getLimit(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("limit");
  if (!raw) {
    return undefined;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export async function POST(request: NextRequest) {
  const rateLimit = await consumeDistributedRateLimit(
    buildRateLimitKey("follows-check", request.headers),
    {
      limit: 20,
      windowMs: 60 * 1000,
    },
  );

  if (!rateLimit.allowed) {
    await recordSecurityEvent({
      action: "rate_limited",
      entityType: "SearchFollow",
      metadata: {
        route: "/api/follows/check",
      },
    });

    return jsonSecurityResponse(
      {
        ok: false,
        error: "Too many follow-check requests.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  if (!(await isAuthorized(request))) {
    await recordSecurityEvent({
      action: "unauthorized_request",
      entityType: "SearchFollow",
      metadata: {
        route: "/api/follows/check",
      },
    });

    return jsonSecurityResponse(
      {
        ok: false,
        error: "Not authorized to run follow checks.",
      },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as { followId?: string } | null;
  const followId = typeof body?.followId === "string" && body.followId ? body.followId : request.nextUrl.searchParams.get("followId");

  if (followId) {
    const result = await checkSearchFollow({ followId });

    return jsonSecurityResponse({
      ok: result.ok,
      mode: "single",
      result,
    });
  }

  const result = await checkActiveSearchFollows({ limit: getLimit(request) });

  return jsonSecurityResponse({
    ok: true,
    mode: "batch",
    ...result,
  });
}
