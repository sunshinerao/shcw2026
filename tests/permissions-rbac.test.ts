import test from "node:test";
import assert from "node:assert/strict";

import {
  canAccessAdminSection,
  canAssignAgendaPeople,
  canCreateSpeakerProfiles,
  canManageEvents,
  canManageFaq,
  canManageInsights,
  canManageInstitutions,
  canManageMessages,
  canManageNews,
  canManagePosters,
  canManageSpecialPassApplications,
  canManageSpeakers,
  canManageTracks,
  getAdminLandingPath,
  isAdminConsoleRole,
  isAdminOnlySection,
  parseStaffPermissions,
  type StaffPermissionKey,
} from "../lib/permissions";

test("parseStaffPermissions keeps only valid permission keys", () => {
  const parsed = parseStaffPermissions(JSON.stringify(["speakers", "news", "invalid", 1]));

  assert.deepEqual(parsed, ["speakers", "news"]);
  assert.deepEqual(parseStaffPermissions("not-json"), []);
  assert.deepEqual(parseStaffPermissions(null), []);
});

test("isAdminConsoleRole follows role and staffPermissions rules", () => {
  assert.equal(isAdminConsoleRole("ADMIN", null), true);
  assert.equal(isAdminConsoleRole("EVENT_MANAGER", null), true);
  assert.equal(isAdminConsoleRole("SPECIAL_PASS_MANAGER", null), true);
  assert.equal(isAdminConsoleRole("STAFF", null), true);

  assert.equal(
    isAdminConsoleRole("ATTENDEE", JSON.stringify(["news"])),
    true
  );
  assert.equal(isAdminConsoleRole("ATTENDEE", null), false);
});

test("resource management helpers grant expected permissions", () => {
  const staffFaqOnly = JSON.stringify(["faq"] satisfies StaffPermissionKey[]);

  assert.equal(canManageEvents("ADMIN"), true);
  assert.equal(canManageEvents("EVENT_MANAGER"), true);
  assert.equal(canManageEvents("STAFF"), false);

  assert.equal(canManageSpecialPassApplications("ADMIN"), true);
  assert.equal(canManageSpecialPassApplications("SPECIAL_PASS_MANAGER"), true);
  assert.equal(canManageSpecialPassApplications("EVENT_MANAGER"), false);

  assert.equal(canManageTracks("ADMIN"), true);
  assert.equal(canManageTracks("EVENT_MANAGER"), false);

  assert.equal(canManageSpeakers("ADMIN", null), true);
  assert.equal(canManageSpeakers("STAFF", JSON.stringify(["speakers"])), true);
  assert.equal(canManageSpeakers("STAFF", null), false);
  assert.equal(canManageSpeakers("EVENT_MANAGER", null), false);

  assert.equal(canAssignAgendaPeople("ADMIN"), true);
  assert.equal(canAssignAgendaPeople("EVENT_MANAGER"), true);
  assert.equal(canAssignAgendaPeople("STAFF"), false);

  assert.equal(canCreateSpeakerProfiles("ADMIN", null), true);
  assert.equal(canCreateSpeakerProfiles("EVENT_MANAGER", null), true);
  assert.equal(canCreateSpeakerProfiles("STAFF", JSON.stringify(["speakers"])), true);
  assert.equal(canCreateSpeakerProfiles("STAFF", null), false);

  assert.equal(canManageNews("STAFF", JSON.stringify(["news"])), true);
  assert.equal(canManageInsights("STAFF", JSON.stringify(["insights"])), true);
  assert.equal(canManagePosters("STAFF", JSON.stringify(["posters"])), true);
  assert.equal(canManageInstitutions("STAFF", JSON.stringify(["institutions"])), true);
  assert.equal(canManageMessages("STAFF", JSON.stringify(["messages"])), true);
  assert.equal(canManageFaq("STAFF", staffFaqOnly), true);
  assert.equal(canManageFaq("STAFF", null), false);
});

test("canAccessAdminSection enforces dashboard and section visibility", () => {
  const staffPerms = JSON.stringify(["news", "faq"] satisfies StaffPermissionKey[]);

  assert.equal(canAccessAdminSection("ADMIN", "settings", null), true);

  assert.equal(canAccessAdminSection("EVENT_MANAGER", "events", null), true);
  assert.equal(canAccessAdminSection("EVENT_MANAGER", "invitations", null), true);
  assert.equal(canAccessAdminSection("EVENT_MANAGER", "users", null), false);

  assert.equal(canAccessAdminSection("STAFF", "dashboard", staffPerms), true);
  assert.equal(canAccessAdminSection("STAFF", "news", staffPerms), true);
  assert.equal(canAccessAdminSection("STAFF", "faq", staffPerms), true);
  assert.equal(canAccessAdminSection("STAFF", "messages", staffPerms), false);

  assert.equal(canAccessAdminSection("ATTENDEE", "dashboard", staffPerms), true);
  assert.equal(canAccessAdminSection("ATTENDEE", "news", staffPerms), true);
  assert.equal(canAccessAdminSection("ATTENDEE", "events", staffPerms), false);
});

test("getAdminLandingPath returns role-aware default path", () => {
  assert.equal(getAdminLandingPath("ADMIN", null), "/admin");
  assert.equal(getAdminLandingPath("EVENT_MANAGER", null), "/admin/events");
  assert.equal(getAdminLandingPath("SPECIAL_PASS_MANAGER", null), "/admin/special-pass");

  assert.equal(
    getAdminLandingPath("STAFF", JSON.stringify(["faq"] satisfies StaffPermissionKey[])),
    "/admin/faq"
  );
  assert.equal(
    getAdminLandingPath("ATTENDEE", JSON.stringify(["news"] satisfies StaffPermissionKey[])),
    "/admin/news"
  );
  assert.equal(getAdminLandingPath("ATTENDEE", null), "/admin");
});

test("isAdminOnlySection marks high-privilege admin sections", () => {
  assert.equal(isAdminOnlySection("users"), true);
  assert.equal(isAdminOnlySection("apiKeys"), true);
  assert.equal(isAdminOnlySection("events"), false);
  assert.equal(isAdminOnlySection("specialPass"), false);
});
