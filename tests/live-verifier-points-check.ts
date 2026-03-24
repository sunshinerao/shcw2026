import { prisma } from "../lib/prisma";

const baseUrl = process.env.LIVE_TEST_BASE_URL || "http://127.0.0.1:3017";
const locale = process.env.LIVE_TEST_LOCALE || "en";
const adminEmail = process.env.LIVE_TEST_ADMIN_EMAIL || "admin@shcw2026.org";
const adminPassword = process.env.LIVE_TEST_ADMIN_PASSWORD || "admin123";
const verifierEmail = process.env.LIVE_TEST_VERIFIER_EMAIL || "verifier@shcw2026.org";
const verifierPassword = process.env.LIVE_TEST_VERIFIER_PASSWORD || "verifier123";

type CookieJar = Map<string, string>;

function createCookieJar(): CookieJar {
  return new Map<string, string>([["NEXT_LOCALE", locale]]);
}

function updateCookies(jar: CookieJar, response: Response) {
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
    jar.set(name, value);
  }
}

function cookieHeader(jar: CookieJar) {
  return Array.from(jar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function request(jar: CookieJar, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  const cookies = cookieHeader(jar);

  if (cookies) {
    headers.set("cookie", cookies);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    redirect: "manual",
  });

  updateCookies(jar, response);
  return response;
}

async function login(jar: CookieJar, email: string, password: string, callbackPath: string) {
  const csrfResponse = await request(jar, "/api/auth/csrf");
  const csrfData = await csrfResponse.json() as { csrfToken?: string };

  if (!csrfResponse.ok || !csrfData.csrfToken) {
    throw new Error(`Failed to get CSRF token: ${JSON.stringify(csrfData)}`);
  }

  const form = new URLSearchParams({
    csrfToken: csrfData.csrfToken,
    email,
    password,
    callbackUrl: `${baseUrl}${callbackPath}`,
    json: "true",
  });

  const loginResponse = await request(jar, "/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const rawText = await loginResponse.text();

  if (!(loginResponse.ok || loginResponse.status === 302)) {
    throw new Error(`Login failed (${loginResponse.status}): ${rawText}`);
  }
}

async function assertJson(jar: CookieJar, path: string, init: RequestInit = {}) {
  const response = await request(jar, path, init);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`${init.method || "GET"} ${path} failed: ${JSON.stringify(data)}`);
  }

  return data as Record<string, any>;
}

async function main() {
  const timestamp = Date.now();
  const summary: Array<Record<string, unknown>> = [];
  const tempEmail = `live-verifier-${timestamp}@example.com`;
  const tempPassword = "Verifier123!";
  const tempName = `Verifier Flow ${timestamp}`;

  const publishedEvent = await prisma.event.findFirst({
    where: { isPublished: true },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    select: { id: true, title: true, type: true },
  });

  if (!publishedEvent) {
    throw new Error("No published event available for verifier flow check.");
  }

  const eventPoints: Record<string, number> = {
    ceremony: 20,
    forum: 15,
    workshop: 10,
    conference: 15,
    networking: 5,
  };
  const expectedPoints = eventPoints[publishedEvent.type] ?? 10;

  const attendeeJar = createCookieJar();
  const registerResponse = await request(attendeeJar, "/api/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      locale,
      name: tempName,
      email: tempEmail,
      password: tempPassword,
      role: "ATTENDEE",
    }),
  });
  const registerData = await registerResponse.json() as Record<string, any>;

  if (!registerResponse.ok || !registerData.success || !registerData.user?.id) {
    throw new Error(`Temp user registration failed: ${JSON.stringify(registerData)}`);
  }

  const tempUser = {
    id: registerData.user.id as string,
    climatePassportId: registerData.user.climatePassportId as string | null,
  };

  try {
    await login(attendeeJar, tempEmail, tempPassword, "/en/dashboard/pass");

    const eventRegistration = await assertJson(attendeeJar, `/api/events/${publishedEvent.id}/register`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locale,
        notes: "Live verifier event registration",
      }),
    });
    summary.push({
      step: "event-registration",
      ok: true,
      registrationId: eventRegistration.data?.id,
      eventId: publishedEvent.id,
    });

    const passportQr = await assertJson(attendeeJar, `/api/qrcode?type=passport&locale=${locale}`);
    summary.push({
      step: "passport-qrcode",
      ok: true,
      hasSvg: Boolean(passportQr.data?.qrCode),
    });

    const eventQr = await assertJson(attendeeJar, `/api/qrcode?type=event&eventId=${publishedEvent.id}&locale=${locale}`);
    summary.push({
      step: "event-qrcode",
      ok: true,
      eventId: publishedEvent.id,
      eventType: publishedEvent.type,
    });

    const registrations = await assertJson(attendeeJar, `/api/user/registrations?locale=${locale}`);
    summary.push({
      step: "user-registrations",
      ok: true,
      registrations: Array.isArray(registrations.data?.registrations) ? registrations.data.registrations.length : 0,
    });

    const verifierJar = createCookieJar();
    await login(verifierJar, verifierEmail, verifierPassword, "/en/verifier");

    const checkinHistory = await assertJson(verifierJar, `/api/checkin?limit=5&locale=${locale}`);
    summary.push({
      step: "checkin-history",
      ok: true,
      count: Array.isArray(checkinHistory.data) ? checkinHistory.data.length : 0,
    });

    const passportCheck = await assertJson(verifierJar, "/api/checkin", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ locale, qrData: passportQr.data.qrData }),
    });
    summary.push({
      step: "passport-check",
      ok: true,
      type: passportCheck.data?.type,
      climatePassportId: passportCheck.data?.user?.climatePassportId,
    });

    const eventCheck = await assertJson(verifierJar, "/api/checkin", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ locale, qrData: eventQr.data.qrData }),
    });
    summary.push({
      step: "event-checkin",
      ok: true,
      alreadyCheckedIn: eventCheck.data?.alreadyCheckedIn,
      awarded: eventCheck.data?.pointsAwarded,
      expectedPoints,
    });

    const adminJar = createCookieJar();
    await login(adminJar, adminEmail, adminPassword, "/en/admin/users");

    const pointsDetail = await assertJson(adminJar, `/api/users/${tempUser.id}/points?locale=${locale}`);
    summary.push({
      step: "points-detail",
      ok: true,
      points: pointsDetail.data?.user?.points,
      attendedEvents: pointsDetail.data?.user?.attendedEvents,
      transactionCount: Array.isArray(pointsDetail.data?.transactions) ? pointsDetail.data.transactions.length : 0,
    });

    const roleUpdate = await assertJson(adminJar, `/api/users/${tempUser.id}/role`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ locale, role: "VERIFIER" }),
    });
    summary.push({
      step: "role-update",
      ok: true,
      role: roleUpdate.data?.role,
    });

    const manualPoints = await assertJson(adminJar, `/api/users/${tempUser.id}/points`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locale,
        points: -5,
        description: "Live verifier flow cleanup adjustment",
        type: "MANUAL_DEDUCT",
      }),
    });
    summary.push({
      step: "manual-points-adjustment",
      ok: true,
      points: manualPoints.data?.user?.points,
    });

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await prisma.user.delete({ where: { id: tempUser.id } }).catch(() => undefined);
  }
}

main().catch((error) => {
  console.error("LIVE_VERIFIER_POINTS_CHECK_FAILED");
  console.error(error);
  process.exitCode = 1;
});