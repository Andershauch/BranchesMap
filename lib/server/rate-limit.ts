import "server-only";

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
