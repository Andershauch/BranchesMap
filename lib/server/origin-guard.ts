import "server-only";

import type { NextRequest } from "next/server";

function normalizeOrigin(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getRequestOrigin(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host") ?? request.nextUrl.host;
  const protocol = forwardedProto === "https" ? "https" : request.nextUrl.protocol.replace(":", "") || "http";

  return normalizeOrigin(`${protocol}://${host}`);
}

export function isTrustedMutationRequest(request: NextRequest) {
  const origin = normalizeOrigin(request.headers.get("origin"));

  if (!origin) {
    return true;
  }

  return origin === getRequestOrigin(request);
}
