import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readWorkspaceFile(relativePath: string): Promise<string> {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("events list keeps EVENT_MANAGER in unpublished visibility set", async () => {
  const content = await readWorkspaceFile("app/api/events/route.ts");

  assert.match(
    content,
    /const canViewAllEvents\s*=\s*isAdmin\s*\|\|\s*isStaff\s*\|\|\s*isEventManager/,
    "EVENT_MANAGER should remain in canViewAllEvents"
  );
});

test("events update allows EVENT_MANAGER to edit unpublished events", async () => {
  const content = await readWorkspaceFile("app/api/events/[id]/route.ts");

  assert.match(
    content,
    /existingEvent\.managerUserId\s*===\s*currentUser\.id\s*\|\|\s*!existingEvent\.isPublished/,
    "PUT /events/[id] should allow EVENT_MANAGER to manage unpublished events"
  );
});

test("events delete remains assigned-only for EVENT_MANAGER", async () => {
  const content = await readWorkspaceFile("app/api/events/[id]/route.ts");
  const deleteStart = content.indexOf("export async function DELETE(");
  assert.notEqual(deleteStart, -1, "DELETE function should exist in events/[id] route");
  const deleteBlock = content.slice(deleteStart);

  assert.match(
    deleteBlock,
    /EVENT_MANAGER\s*&&\s*existingEvent\.managerUserId\s*===\s*currentUser\.id/,
    "DELETE /events/[id] should remain assigned-only for EVENT_MANAGER"
  );
  assert.doesNotMatch(
    deleteBlock,
    /EVENT_MANAGER[\s\S]{0,120}!existingEvent\.isPublished/,
    "DELETE /events/[id] should not allow unpublished-wide delete for EVENT_MANAGER"
  );
});

test("faq GET keeps non-manager published-only filter", async () => {
  const content = await readWorkspaceFile("app/api/faqs/route.ts");

  assert.match(
    content,
    /const whereFilter\s*=\s*isManager[\s\S]*:\s*\{\s*isPublished:\s*true\s*\}/,
    "FAQ GET should force published-only for non-manager callers"
  );
});

test("user detail API does not expose passCode field", async () => {
  const content = await readWorkspaceFile("app/api/users/[id]/route.ts");
  const getStart = content.indexOf("export async function GET(");
  const putStart = content.indexOf("export async function PUT(");

  assert.notEqual(getStart, -1, "GET function should exist in users/[id] route");
  assert.notEqual(putStart, -1, "PUT function should exist in users/[id] route");

  const getBlock = content.slice(getStart, putStart);

  assert.doesNotMatch(
    getBlock,
    /passCode\s*:\s*true/,
    "GET /api/users/[id] must not return passCode in select"
  );
});

test("event registration APIs include registrant organization details", async () => {
  const checks = [
    "app/api/events/[id]/registrations/route.ts",
    "app/api/v1/events/[id]/registrations/route.ts",
  ];

  for (const file of checks) {
    const content = await readWorkspaceFile(file);
    assert.match(
      content,
      /organization\s*:\s*\{\s*select\s*:\s*\{[\s\S]*name\s*:\s*true/,
      `${file} should include user organization details in registration results`
    );
  }
});

test("poster templates API enforces requirePosterAdmin in GET and POST", async () => {
  const content = await readWorkspaceFile("app/api/posters/templates/route.ts");

  const occurrences = (content.match(/requirePosterAdmin\(\)/g) || []).length;
  assert.ok(
    occurrences >= 2,
    "Poster templates route should call requirePosterAdmin for both GET and POST"
  );
});

test("agenda admin page loads the full speaker library for the picker", async () => {
  const content = await readWorkspaceFile("app/[locale]/admin/events/[id]/page.tsx");

  assert.match(
    content,
    /while\s*\(page\s*<=\s*totalPages\)/,
    "Agenda speaker picker should paginate through all speaker pages"
  );

  assert.match(
    content,
    /includeHidden=true/,
    "Agenda speaker picker should request hidden speakers when the current user can manage them"
  );
});

test("v1 institutions detail route keeps orgType whitelist", async () => {
  const content = await readWorkspaceFile("app/api/v1/institutions/[id]/route.ts");

  assert.match(content, /const VALID_ORG_TYPES\s*=\s*new Set\(/);
  assert.match(content, /VALID_ORG_TYPES\.has\(trimmed\)/);
});

test("v1 API routes keep verifyApiKey scope mapping", async () => {
  const checks: Array<{ file: string; scopes: string[] }> = [
    { file: "app/api/v1/events/route.ts", scopes: ["events:read", "events:write"] },
    { file: "app/api/v1/events/[id]/route.ts", scopes: ["events:read", "events:write"] },
    { file: "app/api/v1/events/[id]/registrations/route.ts", scopes: ["events:read", "events:write"] },
    { file: "app/api/v1/speakers/route.ts", scopes: ["speakers:read", "speakers:write"] },
    { file: "app/api/v1/news/route.ts", scopes: ["news:read", "news:write"] },
    { file: "app/api/v1/insights/route.ts", scopes: ["insights:read", "insights:write"] },
    { file: "app/api/v1/partners/route.ts", scopes: ["partners:read", "partners:write"] },
    { file: "app/api/v1/institutions/route.ts", scopes: ["institutions:read", "institutions:write"] },
    { file: "app/api/v1/users/route.ts", scopes: ["users:read", "users:write"] },
    { file: "app/api/v1/users/[id]/route.ts", scopes: ["users:read", "users:write"] },
    { file: "app/api/v1/users/[id]/role/route.ts", scopes: ["users:write"] },
    { file: "app/api/v1/users/[id]/points/route.ts", scopes: ["users:read", "users:write"] },
    { file: "app/api/v1/users/reset-password/route.ts", scopes: ["users:write"] },
  ];

  for (const check of checks) {
    const content = await readWorkspaceFile(check.file);
    for (const scope of check.scopes) {
      assert.match(
        content,
        new RegExp(`verifyApiKey\\(req,\\s*"${scope}"\\)`),
        `${check.file} should require ${scope}`
      );
    }
  }
});
