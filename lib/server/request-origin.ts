import "server-only";

import type { NextRequest } from "next/server";

/**
 * Canonical origin helpers for redirects, absolute URLs, and security checks.
 *
 * Production rule:
 * - APP_BASE_URL is the source of truth and must be configured
 *
 * Development rule:
 * - local requests may fall back to the active host so local QA remains simple
 *
 * This file exists to prevent ad hoc URL building from loosely trusted request
 * headers in auth and mutation flows.
 */
function normalizeConfiguredBaseUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value.trim());
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function normalizeLocalHost(host: string | null) {
  if (!host) {
    return "localhost:3000";
  }

  const trimmed = host.trim().toLowerCase();

  if (!trimmed || trimmed.startsWith("0.0.0.0") || trimmed.startsWith("[::]")) {
    return "localhost:3000";
  }

  return trimmed;
}

function getConfiguredBaseUrl() {
  return (
    normalizeConfiguredBaseUrl(process.env.APP_BASE_URL) ??
    normalizeConfiguredBaseUrl(process.env.AUTH_URL) ??
    normalizeConfiguredBaseUrl(process.env.NEXTAUTH_URL)
  );
}

function isLocalBaseUrl(url: URL) {
  return isLocalHost(url.hostname);
}

function getDevelopmentBaseUrl(request?: NextRequest) {
  const requestUrl = request?.nextUrl;
  const requestHost = request?.headers.get("host") ?? requestUrl?.host ?? null;
  const host = normalizeLocalHost(requestHost);
  const hostname = host.split(":")[0] ?? host;
  const protocol = isLocalHost(hostname) ? "http" : "https";

  return new URL(`${protocol}://${host}`);
}

export function getTrustedAppBaseUrl(request?: NextRequest) {
  const configured = getConfiguredBaseUrl();

  if (process.env.NODE_ENV !== "production") {
    if (configured && isLocalBaseUrl(configured)) {
      return configured;
    }

    return getDevelopmentBaseUrl(request);
  }

  if (configured) {
    return configured;
  }

  throw new Error(
    "APP_BASE_URL is required in production so redirects and origin checks use a canonical app origin.",
  );
}

export function getTrustedAppOrigin(request?: NextRequest) {
  return getTrustedAppBaseUrl(request).origin;
}

export function buildAppUrl(request: NextRequest, pathname: string) {
  return new URL(pathname, getTrustedAppBaseUrl(request));
}

export function buildAppRedirectUrl(request: NextRequest, pathOrRelativeUrl: string) {
  return pathOrRelativeUrl.startsWith("/")
    ? buildAppUrl(request, pathOrRelativeUrl)
    : new URL(pathOrRelativeUrl, getTrustedAppBaseUrl(request));
}
