import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

const baseUrl = process.env.LIVE_TEST_BASE_URL || "http://127.0.0.1:3017";
const locale = process.env.LIVE_TEST_LOCALE || "en";

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

  const sessionResponse = await request(jar, "/api/auth/session");
  const sessionData = await sessionResponse.json() as { user?: { email?: string } };

  if (sessionData.user?.email !== email) {
    throw new Error(`Session missing after login: ${JSON.stringify(sessionData)}`);
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
  const email = `live-user-${timestamp}@example.com`;
  const password = "User12345!";
  const initialName = `Live User ${timestamp}`;
  const updatedBio = `Updated bio ${timestamp}`;
  const summary: Array<Record<string, unknown>> = [];

  const attendeeJar = createCookieJar();

  const publishedEvent = await prisma.event.findFirst({
    where: { isPublished: true },
    orderBy: [{ startDate: "asc" }, { startTime: "asc" }],
    select: { id: true, title: true, titleEn: true },
  });

  if (!publishedEvent) {
    throw new Error("No published event available for user journey check.");
  }

  let createdUserId: string | null = null;

  try {
    const registerResponse = await request(attendeeJar, "/api/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locale,
        name: initialName,
        email,
        password,
        role: "ATTENDEE",
      }),
    });
    const registerData = await registerResponse.json() as Record<string, any>;

    if (!registerResponse.ok || !registerData.success) {
      throw new Error(`Registration failed: ${JSON.stringify(registerData)}`);
    }

    createdUserId = registerData.user?.id || null;
    summary.push({
      step: "register-user",
      ok: true,
      userId: createdUserId,
      climatePassportId: registerData.user?.climatePassportId,
      passCodePrefix: typeof registerData.user?.passCode === "string" ? registerData.user.passCode.slice(0, 3) : null,
    });

    if (!registerData.user?.climatePassportId || !registerData.user?.passCode) {
      throw new Error(`Registration missing passport data: ${JSON.stringify(registerData)}`);
    }

    await login(attendeeJar, email, password, "/en/dashboard");
    summary.push({ step: "login-registered-user", ok: true, email });

    const profile = await assertJson(attendeeJar, "/api/user/profile");
    summary.push({
      step: "profile-get",
      ok: true,
      role: profile.data?.role,
      status: profile.data?.status,
      climatePassportId: profile.data?.climatePassportId,
      points: profile.data?.points,
    });

    const profileUpdate = await assertJson(attendeeJar, "/api/user/profile", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ bio: updatedBio }),
    });
    summary.push({
      step: "profile-update",
      ok: true,
      bio: profileUpdate.data?.bio,
    });

    const passportQr = await assertJson(attendeeJar, `/api/qrcode?type=passport&locale=${locale}`);
    summary.push({
      step: "passport-qrcode",
      ok: true,
      hasSvg: Boolean(passportQr.data?.qrCode),
      qrDataPrefix: typeof passportQr.data?.qrData === "string" ? passportQr.data.qrData.split("/").slice(0, 3).join("/") : null,
    });

    const beforeWishlist = await assertJson(attendeeJar, `/api/user/registrations?locale=${locale}`);
    summary.push({
      step: "registrations-initial",
      ok: true,
      registrations: Array.isArray(beforeWishlist.data?.registrations) ? beforeWishlist.data.registrations.length : 0,
      wishlist: Array.isArray(beforeWishlist.data?.wishlist) ? beforeWishlist.data.wishlist.length : 0,
    });

    const wishlistAdd = await assertJson(attendeeJar, "/api/user/registrations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locale,
        action: "add_wishlist",
        eventId: publishedEvent.id,
      }),
    });
    summary.push({
      step: "wishlist-add",
      ok: true,
      wishlistId: wishlistAdd.data?.id,
      message: wishlistAdd.message,
    });

    const afterWishlist = await assertJson(attendeeJar, `/api/user/registrations?locale=${locale}`);
    summary.push({
      step: "registrations-after-wishlist",
      ok: true,
      registrations: Array.isArray(afterWishlist.data?.registrations) ? afterWishlist.data.registrations.length : 0,
      wishlist: Array.isArray(afterWishlist.data?.wishlist) ? afterWishlist.data.wishlist.length : 0,
      wishlistContainsEvent: Array.isArray(afterWishlist.data?.wishlist)
        ? afterWishlist.data.wishlist.some((item: Record<string, any>) => item.event?.id === publishedEvent.id)
        : false,
    });

    const wishlistRemove = await assertJson(attendeeJar, "/api/user/registrations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locale,
        action: "remove_wishlist",
        eventId: publishedEvent.id,
      }),
    });
    summary.push({
      step: "wishlist-remove",
      ok: true,
      message: wishlistRemove.message,
    });

    const eventRegistration = await assertJson(attendeeJar, `/api/events/${publishedEvent.id}/register`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locale,
        notes: "Live user journey event registration",
        dietaryReq: "Vegetarian",
      }),
    });
    summary.push({
      step: "event-registration",
      ok: true,
      registrationId: eventRegistration.data?.id,
      eventId: publishedEvent.id,
    });

    const afterRegistration = await assertJson(attendeeJar, `/api/user/registrations?locale=${locale}`);
    summary.push({
      step: "registrations-after-registration",
      ok: true,
      registrations: Array.isArray(afterRegistration.data?.registrations) ? afterRegistration.data.registrations.length : 0,
      wishlist: Array.isArray(afterRegistration.data?.wishlist) ? afterRegistration.data.wishlist.length : 0,
      wishlistContainsEvent: Array.isArray(afterRegistration.data?.wishlist)
        ? afterRegistration.data.wishlist.some((item: Record<string, any>) => item.event?.id === publishedEvent.id)
        : false,
      registeredEventTitle: afterRegistration.data?.registrations?.[0]?.event?.titleEn || afterRegistration.data?.registrations?.[0]?.event?.title,
    });

    const eventQr = await assertJson(attendeeJar, `/api/qrcode?type=event&eventId=${publishedEvent.id}&locale=${locale}`);
    summary.push({
      step: "event-pass-qrcode",
      ok: true,
      hasSvg: Boolean(eventQr.data?.qrCode),
      eventId: publishedEvent.id,
    });

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    if (createdUserId) {
      await prisma.user.delete({ where: { id: createdUserId } }).catch(async () => {
        const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
        if (existing) {
          await prisma.user.delete({ where: { id: existing.id } }).catch(() => undefined);
        }
      });
    }
  }
}

main().catch((error) => {
  console.error("LIVE_USER_PASSPORT_JOURNEY_CHECK_FAILED");
  console.error(error);
  process.exitCode = 1;
});