import "server-only";

import type { NextRequest } from "next/server";

import { getTrustedAppOrigin } from "@/lib/server/request-origin";

/**
 * Minimal same-origin guard for state-changing requests.
 *
 * The guard compares the request Origin header to the canonical app origin.
 * Missing Origin headers are currently allowed because some same-site form POSTs
 * and local workflows can omit it, but malformed or mismatched origins are
 * rejected by callers and should be treated as security-relevant events.
 */
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

export function isTrustedMutationRequest(request: NextRequest) {
  const origin = normalizeOrigin(request.headers.get("origin"));

  if (!origin) {
    return true;
  }

  return origin === getTrustedAppOrigin(request);
}
