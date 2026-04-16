import { NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/server/auth";
import { buildRateLimitKey, consumeDistributedRateLimit } from "@/lib/server/rate-limit";
import {
  listFollowedMunicipalitySlugsForUser,
  listUnreadFollowMunicipalitySlugsForUser,
} from "@/lib/server/search-follows";
import { recordSecurityEvent } from "@/lib/server/security-events";
import { jsonSecurityResponse } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rateLimit = await consumeDistributedRateLimit(
    buildRateLimitKey("home-state-get", request.headers),
    {
      limit: 120,
      windowMs: 60 * 1000,
    },
  );

  if (!rateLimit.allowed) {
    await recordSecurityEvent({
      action: "rate_limited",
      entityType: "HomeStateApi",
      metadata: {
        route: "/api/home-state",
        method: "GET",
      },
    });

    return jsonSecurityResponse(
      {
        ok: false,
        error: "Too many home state requests.",
      },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return jsonSecurityResponse(
      {
        ok: true,
        authenticated: false,
        followedMunicipalitySlugs: [],
        updatedMunicipalitySlugs: [],
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const [followedMunicipalitySlugs, updatedMunicipalitySlugs] = await Promise.all([
    listFollowedMunicipalitySlugsForUser(user.id),
    listUnreadFollowMunicipalitySlugsForUser(user.id),
  ]);

  return jsonSecurityResponse(
    {
      ok: true,
      authenticated: true,
      followedMunicipalitySlugs,
      updatedMunicipalitySlugs,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
