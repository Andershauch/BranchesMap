import assert from "node:assert/strict";
import test from "node:test";

import postgresConnection from "../lib/server/postgres-connection.ts";

const { makePostgresSslModeExplicit } = postgresConnection;

test("normalizes legacy PostgreSQL SSL modes without changing channel binding", () => {
  for (const mode of ["prefer", "require", "verify-ca"]) {
    const result = new URL(
      makePostgresSslModeExplicit(`postgresql://user:pass@db.example/app?sslmode=${mode}&channel_binding=require`),
    );
    assert.equal(result.searchParams.get("sslmode"), "verify-full");
    assert.equal(result.searchParams.get("channel_binding"), "require");
  }
});

test("leaves absent and already explicit PostgreSQL SSL modes unchanged", () => {
  const withoutMode = "postgresql://user:pass@localhost/app";
  const explicitMode = "postgresql://user:pass@db.example/app?sslmode=verify-full";

  assert.equal(makePostgresSslModeExplicit(withoutMode), withoutMode);
  assert.equal(makePostgresSslModeExplicit(explicitMode), explicitMode);
});
