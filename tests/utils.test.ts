import test from "node:test";
import assert from "node:assert/strict";

import { generatePassCode, getRoleLabel } from "../lib/utils";

test("generatePassCode returns SCW-prefixed uppercase code", () => {
  const passCode = generatePassCode();

  assert.match(passCode, /^SCW[A-Z0-9]{8}$/);
  assert.equal(passCode.length, 11);
});

test("getRoleLabel returns localized label and falls back to raw role", () => {
  assert.equal(getRoleLabel("ADMIN"), "管理员");
  assert.equal(getRoleLabel("ADMIN", "en"), "Administrator");
  assert.equal(getRoleLabel("VERIFIER", "en"), "Verifier");
  assert.equal(getRoleLabel("UNKNOWN_ROLE"), "UNKNOWN_ROLE");
});