import "server-only";

import type { NextRequest } from "next/server";

function normalizeHost(host: string | null) {
  if (!host) {
    return "localhost:3000";
  }

  const trimmed = host.trim();

  if (!trimmed || trimmed.startsWith("0.0.0.0") || trimmed.startsWith("[::]")) {
    return "localhost:3000";
  }

  return trimmed;
}

function normalizeProtocol(protocol: string | null) {
  return protocol === "https" ? "https" : "http";
}

export function buildAppUrl(request: NextRequest, pathname: string) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = normalizeHost(forwardedHost ?? request.headers.get("host") ?? request.nextUrl.host);
  const protocol = normalizeProtocol(forwardedProtocol ?? request.nextUrl.protocol.replace(":", ""));

  return new URL(pathname, `${protocol}://${host}`);
}

export function buildAppRedirectUrl(request: NextRequest, pathOrRelativeUrl: string) {
  return pathOrRelativeUrl.startsWith("/")
    ? buildAppUrl(request, pathOrRelativeUrl)
    : new URL(pathOrRelativeUrl, buildAppUrl(request, "/"));
}
