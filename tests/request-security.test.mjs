import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

import originGuard from "../lib/server/origin-guard.ts";
import requestOrigin from "../lib/server/request-origin.ts";
import security from "../lib/server/security.ts";

const { isTrustedMutationRequest } = originGuard;
const { getTrustedAppOrigin } = requestOrigin;
const { jsonSecurityResponse } = security;
process.env.APP_BASE_URL = "https://preview.example.test";

function request(origin) {
  const headers = new Headers({ host: "preview.example.test" });
  if (origin !== undefined) headers.set("origin", origin);
  return new NextRequest("https://preview.example.test/api/mutation", { headers });
}

test("allows same-origin requests and rejects cross-origin requests", () => {
  assert.equal(isTrustedMutationRequest(request("https://preview.example.test")), true);
  assert.equal(isTrustedMutationRequest(request("https://attacker.example")), false);
});

test("rejects malformed Origin while allowing a missing Origin header", () => {
  assert.equal(isTrustedMutationRequest(request("not a URL")), false);
  assert.equal(isTrustedMutationRequest(request(undefined)), true);
});

test("uses Vercel's branch URL for Preview even when APP_BASE_URL points to production", (t) => {
  const keys = ["NODE_ENV", "VERCEL_ENV", "VERCEL_BRANCH_URL", "VERCEL_URL", "APP_BASE_URL"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  t.after(() => {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });

  process.env.NODE_ENV = "production";
  process.env.VERCEL_ENV = "preview";
  process.env.VERCEL_BRANCH_URL = "branches-map-git-staging.example.vercel.app";
  process.env.VERCEL_URL = "branches-map-commit-hash.example.vercel.app";
  process.env.APP_BASE_URL = "https://production.example.com";

  assert.equal(getTrustedAppOrigin(), "https://branches-map-git-staging.example.vercel.app");
});

test("JSON API responses carry baseline security headers", () => {
  const response = jsonSecurityResponse({ ok: true });
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(response.headers.get("X-Frame-Options"), "DENY");
  assert.match(response.headers.get("Content-Security-Policy") ?? "", /frame-ancestors 'none'/);
  assert.equal(response.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
});
