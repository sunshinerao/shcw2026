import test from "node:test";
import assert from "node:assert/strict";

import {
  DEV_ONLY_NEXTAUTH_SECRET,
  getNextAuthSecret,
  isDevAuthBypassEnabled,
} from "../lib/auth-config";

test("getNextAuthSecret falls back only outside production", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSecret = process.env.NEXTAUTH_SECRET;

  delete process.env.NEXTAUTH_SECRET;
  process.env.NODE_ENV = "development";

  assert.equal(getNextAuthSecret(), DEV_ONLY_NEXTAUTH_SECRET);

  process.env.NODE_ENV = "production";

  assert.equal(getNextAuthSecret(), undefined);

  process.env.NODE_ENV = originalNodeEnv;
  process.env.NEXTAUTH_SECRET = originalSecret;
});

test("isDevAuthBypassEnabled requires explicit opt-in outside production", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalBypassFlag = process.env.ENABLE_DEV_AUTH_BYPASS;

  process.env.NODE_ENV = "development";
  delete process.env.ENABLE_DEV_AUTH_BYPASS;
  assert.equal(isDevAuthBypassEnabled(), false);

  process.env.ENABLE_DEV_AUTH_BYPASS = "true";
  assert.equal(isDevAuthBypassEnabled(), true);

  process.env.NODE_ENV = "production";
  assert.equal(isDevAuthBypassEnabled(), false);

  process.env.NODE_ENV = originalNodeEnv;
  process.env.ENABLE_DEV_AUTH_BYPASS = originalBypassFlag;
});