import test from "node:test";
import assert from "node:assert/strict";

import { buildPasswordResetUrl, getBaseUrl } from "../lib/mailer";

test("getBaseUrl prefers APP_URL and strips trailing slash", () => {
  const originalAppUrl = process.env.APP_URL;
  const originalNextAuthUrl = process.env.NEXTAUTH_URL;

  process.env.APP_URL = "https://events.example.com/";
  process.env.NEXTAUTH_URL = "https://fallback.example.com";

  assert.equal(getBaseUrl(), "https://events.example.com");

  process.env.APP_URL = originalAppUrl;
  process.env.NEXTAUTH_URL = originalNextAuthUrl;
});

test("buildPasswordResetUrl generates localized reset link", () => {
  const originalAppUrl = process.env.APP_URL;

  process.env.APP_URL = "https://events.example.com";

  assert.equal(
    buildPasswordResetUrl("token with space"),
    "https://events.example.com/zh/auth/reset-password?token=token%20with%20space"
  );

  assert.equal(
    buildPasswordResetUrl("token with space", "en"),
    "https://events.example.com/en/auth/reset-password?token=token%20with%20space"
  );

  process.env.APP_URL = originalAppUrl;
});