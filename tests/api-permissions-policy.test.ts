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

test("forgot-password route normalizes email before lookup", async () => {
  const content = await readWorkspaceFile("app/api/forgot-password/route.ts");

  assert.match(
    content,
    /normalizeUserEmail|email\.trim\(\)\.toLowerCase\(\)/,
    "Forgot-password route should normalize email before querying the user"
  );
});

test("event detail page keeps all poster and QR share actions visible", async () => {
  const pageContent = await readWorkspaceFile("app/[locale]/events/[id]/page.tsx");
  const routeContent = await readWorkspaceFile("app/api/events/[id]/route.ts");

  assert.match(
    pageContent,
    /handleGenerateQr\("event-poster"\)|shareEventPoster/,
    "Event detail page should offer a dedicated full event poster action"
  );

  assert.match(
    pageContent,
    /handleGenerateQr\("poster"\)/,
    "Event detail page should keep the original poster-with-QR action"
  );

  assert.match(
    pageContent,
    /handleGenerateQr\("qr"\)/,
    "Event detail page should keep the original QR-only action"
  );

  assert.doesNotMatch(
    pageContent,
    /DropdownMenuSubTrigger>\{t\("register\.shareQr"\)\}<\/DropdownMenuSubTrigger>/,
    "The old share actions should stay directly visible instead of being hidden in a submenu"
  );

  assert.match(
    routeContent,
    /institutions\s*:\s*\{/,
    "Public event detail route should expose related institutions for poster generation"
  );
});

test("event pass opens within 24 hours and disables 60-second QR refresh", async () => {
  const passportLib = await readWorkspaceFile("lib/climate-passport.ts");
  const passPage = await readWorkspaceFile("app/[locale]/dashboard/pass/page.tsx");
  const qrRoute = await readWorkspaceFile("app/api/qrcode/route.ts");
  const checkinRoute = await readWorkspaceFile("app/api/checkin/route.ts");

  assert.match(
    passportLib,
    /EVENT_PASS_ENTRY_WINDOW_MS\s*=\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/,
    "Event pass QR availability should open 24 hours before the activity starts"
  );

  assert.doesNotMatch(
    passPage,
    /setInterval\([\s\S]*EVENT_PASS_QR_TTL_MS/,
    "Pass page should no longer auto-refresh the QR code every 60 seconds"
  );

  assert.doesNotMatch(
    passPage,
    /RefreshCw|qrRefreshWindow|qrRefreshed/,
    "Pass page should no longer show the manual refresh affordance or 60-second refresh messaging"
  );

  assert.doesNotMatch(
    qrRoute,
    /SCW2026:\/\/EVENT\/\$\{eventId\}\/\$\{session\.user\.id\}\/\$\{registration\.id\}\/\$\{timestamp\}/,
    "New event QR codes should no longer depend on a 60-second timestamp suffix"
  );

  assert.doesNotMatch(
    checkinRoute,
    /now\s*-\s*timestamp\s*>\s*EVENT_PASS_QR_TTL_MS/,
    "Verifier check-in should no longer reject a valid event pass just because a 60-second TTL elapsed"
  );
});

test("event pass timing stays timezone-stable and refreshes when the window opens", async () => {
  const passportLib = await readWorkspaceFile("lib/climate-passport.ts");
  const passPage = await readWorkspaceFile("app/[locale]/dashboard/pass/page.tsx");

  assert.match(
    passportLib,
    /Date\.UTC|getUTCFullYear|getUTCDate/,
    "Pass state calculation should be based on a timezone-stable date conversion instead of server-local clock rules"
  );

  assert.doesNotMatch(
    passportLib,
    /combined\.setHours\(/,
    "Pass timing should not depend on mutating a local-time Date object because deployment timezone can shift the QR opening window"
  );

  assert.match(
    passPage,
    /setTimeout\(|visibilitychange|addEventListener\("focus"/,
    "Pass page should re-check eligibility when the 24-hour window opens or the user returns to the page"
  );
});

test("check-in flow writes back climate passport progress and rewards", async () => {
  const checkinRoute = await readWorkspaceFile("app/api/checkin/route.ts");
  const passportPage = await readWorkspaceFile("app/[locale]/dashboard/climate-passport/page.tsx");

  assert.match(
    checkinRoute,
    /checkedInAt\s*:\s*new Date\(\)/,
    "Verifier check-in should persist the attended timestamp"
  );

  assert.match(
    checkinRoute,
    /points\s*:\s*\{[\s\S]*increment\s*:\s*pointsToAward/,
    "Verifier check-in should award climate passport points"
  );

  assert.match(
    checkinRoute,
    /pointTransaction\.create\(/,
    "Verifier check-in should record a points transaction for auditability"
  );

  assert.match(
    passportPage,
    /buildPassportAchievements\([\s\S]*attendedCount[\s\S]*profile\?\.points/,
    "Climate passport achievements should unlock from attended events and accumulated points"
  );
});

test("dashboard and user menu expose a verifier entry", async () => {
  const dashboardContent = await readWorkspaceFile("app/[locale]/dashboard/page.tsx");
  const navbarContent = await readWorkspaceFile("components/navbar.tsx");

  assert.match(
    dashboardContent,
    /href="\/verifier"/,
    "Dashboard quick actions should include a direct verifier entry"
  );

  assert.match(
    navbarContent,
    /href="\/verifier"/,
    "Logged-in user menu should include a verifier entry for authorized roles"
  );
});

test("admin registrations support exporting registrant lists", async () => {
  const pageContent = await readWorkspaceFile("app/[locale]/admin/events/[id]/registrations/page.tsx");
  const routeContent = await readWorkspaceFile("app/api/events/[id]/registrations/route.ts");

  assert.match(
    pageContent,
    /handleExport|exportRegistrations|download.*csv/i,
    "The admin registrations page should expose a direct export action"
  );

  assert.match(
    pageContent,
    /fetch\([\s\S]*format=\\"csv\\"|response\.blob\(|URL\.createObjectURL/,
    "The export action should download the CSV through an authenticated blob request so browsers reliably save the file"
  );

  assert.match(
    routeContent,
    /text\/csv|Content-Disposition|registrations\.csv/i,
    "The registrations API should be able to return a downloadable CSV export"
  );
});

test("README hides default admin and verifier passwords", async () => {
  const readme = await readWorkspaceFile("README.md");

  assert.doesNotMatch(readme, /admin123/, "README should not expose the default administrator password");
  assert.doesNotMatch(readme, /verifier123/, "README should not expose the default verifier password");
});

test("admin agenda page shows continuous display numbering", async () => {
  const content = await readWorkspaceFile("app/[locale]/admin/events/[id]/page.tsx");

  assert.match(
    content,
    /agendaItems\.map\(\(item,\s*index\)/,
    "Agenda list should use the rendered list index when showing the front number"
  );

  assert.doesNotMatch(
    content,
    /\{item\.order \+ 1\}/,
    "Agenda badge should not expose the raw order field because gaps appear after deletions"
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
