import test from "node:test";
import assert from "node:assert/strict";

import { normalizeUserEmail, normalizeUserName } from "../lib/user-identity";

test("normalizeUserEmail trims and lowercases the email", () => {
  assert.equal(normalizeUserEmail("  Alice.Example@Example.COM  "), "alice.example@example.com");
});

test("normalizeUserName trims and collapses internal whitespace", () => {
  assert.equal(normalizeUserName("  Alice    Zhang  "), "Alice Zhang");
  assert.equal(normalizeUserName(" 张   三 "), "张 三");
});
