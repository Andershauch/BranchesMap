import "server-only";

import { NextResponse } from "next/server";

/**
 * Applies baseline HTTP security headers to route responses.
 *
 * Current V1 stance:
 * - CSP is intentionally strict on framing and object/embed surfaces
 * - inline script/style exceptions remain where Next.js runtime behavior still
 *   requires them in this app
 * - API responses should prefer jsonSecurityResponse so headers stay consistent
 */
function getScriptSrcDirective() {
  const values = ["'self'", "'unsafe-inline'"];

  if (process.env.NODE_ENV === "development") {
    values.push("'unsafe-eval'");
  }

  return `script-src ${values.join(" ")}`;
}

function getStyleSrcDirective() {
  return "style-src 'self' 'unsafe-inline'";
}

function buildContentSecurityPolicy() {
  // Next.js still emits inline bootstrap/runtime script blocks, so a strict nonce-based
  // CSP would require a larger framework-level change. For V1 we keep that narrow
  // exception but explicitly disable inline script attributes and all framing.
  const directives = [
    "default-src 'self'",
    getScriptSrcDirective(),
    "script-src-attr 'none'",
    getStyleSrcDirective(),
    "style-src-attr 'unsafe-inline'",
    "style-src-elem 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self'",
    "worker-src 'self' blob:",
    "child-src 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
  ];

  if (process.env.NODE_ENV === "production") {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export function applySecurityHeaders(response: NextResponse) {
  response.headers.set("Content-Security-Policy", buildContentSecurityPolicy());
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  return response;
}

export function jsonSecurityResponse(body: unknown, init?: ResponseInit) {
  return applySecurityHeaders(NextResponse.json(body, init));
}
