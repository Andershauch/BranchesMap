import { test } from "node:test";
import assert from "node:assert/strict";

import { getAccountCopy } from "@/lib/i18n/account-copy";
import { locales } from "@/lib/i18n/config";

test("account recovery copy covers every supported locale", () => {
  for (const locale of locales) {
    const copy = getAccountCopy(locale);
    const strings = [
      ...Object.values(copy.verifyEmail),
      ...Object.values(copy.confirmEmail),
      ...Object.values(copy.forgotPassword),
      ...Object.values(copy.resetPassword),
      ...Object.values(copy.login),
    ];

    assert.ok(strings.every((value) => value.trim().length > 0), `${locale} has missing account copy`);
  }
});
