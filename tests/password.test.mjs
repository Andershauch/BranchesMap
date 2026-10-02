import assert from "node:assert/strict";
import test from "node:test";

import password from "../lib/server/password.ts";

const { hashPassword, verifyPassword } = password;

test("password hashes verify only the original password", () => {
  const hash = hashPassword("a long test password");
  assert.equal(hash.startsWith("scrypt:"), true);
  assert.equal(verifyPassword("a long test password", hash), true);
  assert.equal(verifyPassword("a different password", hash), false);
});

test("password verifier rejects malformed and unsupported hashes", () => {
  assert.equal(verifyPassword("password", "not-a-hash"), false);
  assert.equal(verifyPassword("password", "bcrypt:salt:hash"), false);
  assert.equal(verifyPassword("password", "scrypt:salt:00"), false);
});
