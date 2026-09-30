import assert from "node:assert/strict";
import test from "node:test";

import inputValidation from "../lib/server/input-validation.ts";

const {
  isRecordId,
  isSimpleSlug,
  parseBoundedInt,
  parseEnumValue,
  parseNormalizedEmail,
  parseOptionalString,
  parseSafeRedirectPath,
} = inputValidation;

test("normalizes optional strings and email addresses", () => {
  assert.equal(parseOptionalString("  hello  "), "hello");
  assert.equal(parseOptionalString("  "), null);
  assert.equal(parseNormalizedEmail("  USER@EXAMPLE.COM  "), "user@example.com");
});

test("accepts only expected slug and record id shapes", () => {
  assert.equal(isSimpleSlug("sjaelland-01"), true);
  assert.equal(isSimpleSlug("X"), false);
  assert.equal(isSimpleSlug("bad/slug"), false);
  assert.equal(isRecordId("Abcdef123456"), true);
  assert.equal(isRecordId("short"), false);
});

test("keeps redirects within the selected locale", () => {
  assert.equal(parseSafeRedirectPath("da", "/da/follows?created=1", "/da/follows"), "/da/follows?created=1");
  assert.equal(parseSafeRedirectPath("da", "https://evil.example/", "/da/follows"), "/da/follows");
  assert.equal(parseSafeRedirectPath("da", "//evil.example/", "/da/follows"), "/da/follows");
  assert.equal(parseSafeRedirectPath("da", "/en/follows", "/da/follows"), "/da/follows");
});

test("bounds integer input and falls back for absent values", () => {
  const bounds = { fallback: 25, min: 1, max: 100 };
  assert.equal(parseBoundedInt("12", bounds), 12);
  assert.equal(parseBoundedInt("1000", bounds), 100);
  assert.equal(parseBoundedInt("0", bounds), 1);
  assert.equal(parseBoundedInt(null, bounds), 25);
  assert.equal(parseBoundedInt("nope", bounds), 25);
});

test("uses only allowed enum values", () => {
  assert.equal(parseEnumValue("en", ["da", "en"], "da"), "en");
  assert.equal(parseEnumValue("fr", ["da", "en"], "da"), "da");
});
