import test from "node:test";
import assert from "node:assert/strict";

import {
  getLocalizedOrganizationIndustry,
  getLocalizedOrganizationName,
  getLocalizedOrganizationTitle,
  getLocalizedUserBio,
  getLocalizedUserName,
  getUserEventName,
  mockUsers,
} from "../lib/data/users";

test("localized user helpers return English content when available", () => {
  const adminUser = mockUsers.find((user) => user.id === "1");

  assert.ok(adminUser);
  assert.equal(getLocalizedUserName(adminUser, "en"), "Michael Zhang");
  assert.equal(
    getLocalizedOrganizationName(adminUser, "en"),
    "Shanghai Climate Week Organizing Committee"
  );
  assert.equal(getLocalizedOrganizationTitle(adminUser, "en"), "Technical Director");
  assert.equal(
    getLocalizedOrganizationIndustry(adminUser, "en"),
    "Environmental organization"
  );
  assert.equal(
    getLocalizedUserBio(adminUser, "en"),
    "Senior environmental technology expert focused on climate tech and digital transformation."
  );
});

test("localized user helpers fall back to Chinese when English content is missing", () => {
  const attendeeUser = mockUsers.find((user) => user.id === "5");

  assert.ok(attendeeUser);
  assert.equal(getLocalizedUserName(attendeeUser, "en"), "Lucy Liu");
  assert.equal(getLocalizedUserBio(attendeeUser, "en"), undefined);
  assert.equal(getLocalizedOrganizationName(attendeeUser, "zh"), "创新咨询");
  assert.equal(getLocalizedOrganizationTitle(attendeeUser, "zh"), "顾问");
});

test("getUserEventName returns locale-specific event labels", () => {
  assert.equal(getUserEventName("12", "zh"), "上海气候周2026 盛大开幕仪式");
  assert.equal(getUserEventName("12", "en"), "Shanghai Climate Week 2026 Grand Opening");
  assert.equal(getUserEventName("999", "zh"), "活动 #999");
  assert.equal(getUserEventName("999", "en"), "Event #999");
});