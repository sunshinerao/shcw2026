import test from "node:test";
import assert from "node:assert/strict";

import { withApiVersioning } from "../lib/api-versioning";

test("withApiVersioning adds X-API-Version header", async () => {
  const response = new Response(JSON.stringify({ success: true, data: { ok: true } }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

  const wrapped = await withApiVersioning(response, { version: "v2" });

  assert.equal(wrapped.headers.get("x-api-version"), "v2");
  assert.equal(wrapped.status, 200);

  const body = await wrapped.json() as { success: boolean; data: { ok: boolean } };
  assert.equal(body.success, true);
  assert.equal(body.data.ok, true);
});

test("withApiVersioning injects code for v2 JSON error payloads without code", async () => {
  const response = new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
    status: 403,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

  const wrapped = await withApiVersioning(response, {
    version: "v2",
    normalizeJsonErrors: true,
  });

  const body = await wrapped.json() as { success: boolean; error: string; code?: string };
  assert.equal(wrapped.headers.get("x-api-version"), "v2");
  assert.equal(body.success, false);
  assert.equal(body.error, "Forbidden");
  assert.equal(body.code, "FORBIDDEN");
});

test("withApiVersioning keeps existing code untouched", async () => {
  const response = new Response(JSON.stringify({ success: false, error: "Conflict", code: "SLUG_EXISTS" }), {
    status: 409,
    headers: { "content-type": "application/json" },
  });

  const wrapped = await withApiVersioning(response, {
    version: "v2",
    normalizeJsonErrors: true,
  });

  const body = await wrapped.json() as { code?: string };
  assert.equal(body.code, "SLUG_EXISTS");
});

test("withApiVersioning does not modify non-JSON errors", async () => {
  const response = new Response("plain error", {
    status: 500,
    headers: { "content-type": "text/plain" },
  });

  const wrapped = await withApiVersioning(response, {
    version: "v2",
    normalizeJsonErrors: true,
  });

  assert.equal(wrapped.headers.get("x-api-version"), "v2");
  assert.equal(await wrapped.text(), "plain error");
});
