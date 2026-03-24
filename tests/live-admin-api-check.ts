const baseUrl = process.env.LIVE_TEST_BASE_URL || "http://127.0.0.1:3015";
const locale = process.env.LIVE_TEST_LOCALE || "en";
const email = process.env.LIVE_TEST_ADMIN_EMAIL || "admin@shcw2026.org";
const password = process.env.LIVE_TEST_ADMIN_PASSWORD || "admin123";

const cookieJar = new Map<string, string>();

function updateCookies(response: Response) {
  const setCookies = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [];

  for (const cookie of setCookies) {
    const [pair] = cookie.split(";");
    const eqIndex = pair.indexOf("=");

    if (eqIndex === -1) {
      continue;
    }

    const name = pair.slice(0, eqIndex).trim();
    const value = pair.slice(eqIndex + 1).trim();
    cookieJar.set(name, value);
  }
}

function cookieHeader() {
  return Array.from(cookieJar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  const cookies = cookieHeader();

  if (cookies) {
    headers.set("cookie", cookies);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    redirect: "manual",
  });

  updateCookies(response);
  return response;
}

async function login() {
  cookieJar.clear();
  cookieJar.set("NEXT_LOCALE", locale);

  const csrfResponse = await request("/api/auth/csrf");
  const csrfData = await csrfResponse.json() as { csrfToken?: string };

  if (!csrfResponse.ok || !csrfData.csrfToken) {
    throw new Error(`Failed to get CSRF token: ${JSON.stringify(csrfData)}`);
  }

  const form = new URLSearchParams({
    csrfToken: csrfData.csrfToken,
    email,
    password,
    callbackUrl: `${baseUrl}/en/admin`,
    json: "true",
  });

  const loginResponse = await request("/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const rawText = await loginResponse.text();

  if (!(loginResponse.ok || loginResponse.status === 302)) {
    throw new Error(`Admin login failed (${loginResponse.status}): ${rawText}`);
  }
}

async function assertJson(path: string, init: RequestInit = {}) {
  const response = await request(path, init);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`${init.method || "GET"} ${path} failed: ${JSON.stringify(data)}`);
  }

  return data as Record<string, unknown>;
}

async function main() {
  const timestamp = Date.now();
  const summary: Array<Record<string, unknown>> = [];

  await login();
  summary.push({ step: "admin-login", ok: true, email });

  const speakersData = await assertJson("/api/speakers?limit=100");
  summary.push({
    step: "speakers-list",
    ok: true,
    count: Array.isArray(speakersData.data) ? speakersData.data.length : 0,
  });

  const createdSpeaker = await assertJson("/api/speakers", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      locale,
      name: `测试嘉宾-${timestamp}`,
      nameEn: `Test Speaker ${timestamp}`,
      title: "测试职位",
      titleEn: "Test Title",
      organization: "测试机构",
      organizationEn: "Test Organization",
      bio: "测试简介",
      bioEn: "Test biography",
      isKeynote: false,
      order: 999,
    }),
  });
  const speakerId = (createdSpeaker.data as { id: string }).id;
  summary.push({ step: "speaker-create", ok: true, id: speakerId });

  const updatedSpeaker = await assertJson(`/api/speakers/${speakerId}`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      locale,
      titleEn: "Updated Title",
      bioEn: "Updated biography",
    }),
  });
  summary.push({
    step: "speaker-update",
    ok: true,
    titleEn: (updatedSpeaker.data as { titleEn?: string }).titleEn,
  });

  const speakerDetail = await assertJson(`/api/speakers/${speakerId}`);
  summary.push({
    step: "speaker-detail",
    ok: true,
    name: (speakerDetail.data as { name?: string }).name,
  });

  await assertJson(`/api/speakers/${speakerId}`, {
    method: "DELETE",
  });
  summary.push({ step: "speaker-delete", ok: true, id: speakerId });

  const sponsorsData = await assertJson("/api/sponsors");
  summary.push({
    step: "sponsors-list",
    ok: true,
    count: Array.isArray(sponsorsData.data) ? sponsorsData.data.length : 0,
  });

  const usersData = await assertJson("/api/users?page=1&pageSize=100");
  summary.push({
    step: "users-list",
    ok: true,
    count: Array.isArray((usersData.data as { users?: unknown[] }).users)
      ? (usersData.data as { users: unknown[] }).users.length
      : 0,
  });

  const createdUser = await assertJson("/api/users", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      locale,
      name: `测试用户-${timestamp}`,
      email: `live-admin-${timestamp}@example.com`,
      password: "testpass123",
      phone: "+86 13800009999",
      title: "测试职位",
      bio: "测试用户简介",
      role: "ATTENDEE",
      status: "ACTIVE",
      organization: {
        name: `测试机构-${timestamp}`,
        industry: "测试行业",
        website: "https://example.com/test-user",
      },
    }),
  });
  const userId = (createdUser.data as { id: string }).id;
  summary.push({ step: "user-create", ok: true, id: userId });

  const updatedUser = await assertJson(`/api/users/${userId}`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      locale,
      status: "SUSPENDED",
      title: "更新后的职位",
    }),
  });
  summary.push({
    step: "user-update",
    ok: true,
    status: (updatedUser.data as { status?: string }).status,
  });

  const userDetail = await assertJson(`/api/users/${userId}`);
  summary.push({
    step: "user-detail",
    ok: true,
    email: (userDetail.data as { email?: string }).email,
  });

  await assertJson(`/api/users/${userId}`, {
    method: "DELETE",
  });
  summary.push({ step: "user-delete", ok: true, id: userId });

  const eventsData = await assertJson("/api/events?page=1&pageSize=100");
  summary.push({
    step: "events-list",
    ok: true,
    count: Array.isArray((eventsData.data as { events?: unknown[] }).events)
      ? (eventsData.data as { events: unknown[] }).events.length
      : 0,
  });

  const createdEvent = await assertJson("/api/events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      locale,
      title: `测试活动-${timestamp}`,
      titleEn: `Test Event ${timestamp}`,
      description: "测试活动描述",
      shortDesc: "测试活动短描述",
      date: "2026-04-22",
      startTime: "09:00",
      endTime: "10:30",
      venue: "测试会场",
      address: "测试地址",
      type: "forum",
      maxAttendees: 88,
      isPublished: false,
      isFeatured: false,
    }),
  });
  const eventId = (createdEvent.data as { id: string }).id;
  summary.push({ step: "event-create", ok: true, id: eventId });

  const updatedEvent = await assertJson(`/api/events/${eventId}`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      locale,
      titleEn: `Updated Test Event ${timestamp}`,
      isPublished: true,
      isFeatured: true,
    }),
  });
  summary.push({
    step: "event-update",
    ok: true,
    isPublished: (updatedEvent.data as { isPublished?: boolean }).isPublished,
    isFeatured: (updatedEvent.data as { isFeatured?: boolean }).isFeatured,
  });

  const eventDetail = await assertJson(`/api/events/${eventId}`);
  summary.push({
    step: "event-detail",
    ok: true,
    title: (eventDetail.data as { title?: string }).title,
  });

  await assertJson(`/api/events/${eventId}`, {
    method: "DELETE",
  });
  summary.push({ step: "event-delete", ok: true, id: eventId });

  const createdSponsor = await assertJson("/api/sponsors", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      locale,
      name: `测试赞助商-${timestamp}`,
      nameEn: `Test Sponsor ${timestamp}`,
      logo: "/images/sponsors/logo1.png",
      website: "https://example.com/test-sponsor",
      description: "测试赞助商简介",
      descriptionEn: "Test sponsor description",
      tier: "partner",
      order: 999,
      isActive: true,
    }),
  });
  const sponsorId = (createdSponsor.data as { id: string }).id;
  summary.push({ step: "sponsor-create", ok: true, id: sponsorId });

  const updatedSponsor = await assertJson(`/api/sponsors/${sponsorId}`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      locale,
      descriptionEn: "Updated sponsor description",
      isActive: false,
    }),
  });
  summary.push({
    step: "sponsor-update",
    ok: true,
    isActive: (updatedSponsor.data as { isActive?: boolean }).isActive,
  });

  const sponsorDetail = await assertJson(`/api/sponsors/${sponsorId}`);
  summary.push({
    step: "sponsor-detail",
    ok: true,
    name: (sponsorDetail.data as { name?: string }).name,
  });

  await assertJson(`/api/sponsors/${sponsorId}`, {
    method: "DELETE",
  });
  summary.push({ step: "sponsor-delete", ok: true, id: sponsorId });

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("LIVE_ADMIN_API_CHECK_FAILED");
  console.error(error);
  process.exitCode = 1;
});