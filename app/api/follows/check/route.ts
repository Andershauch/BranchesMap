import { NextRequest, NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/server/admin-auth";
import { checkActiveSearchFollows, checkSearchFollow } from "@/lib/server/search-follows";

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
  if (!(await isAuthorized(request))) {
    return NextResponse.json(
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

    return NextResponse.json({
      ok: result.ok,
      mode: "single",
      result,
    });
  }

  const result = await checkActiveSearchFollows({ limit: getLimit(request) });

  return NextResponse.json({
    ok: true,
    mode: "batch",
    ...result,
  });
}
