import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

const baseUrl = process.env.LIVE_TEST_BASE_URL || "http://127.0.0.1:3014";
const email = process.env.LIVE_TEST_EMAIL || "user@example.com";
const originalPassword = process.env.LIVE_TEST_PASSWORD || "user12345";
const temporaryPassword = process.env.LIVE_TEST_TEMP_PASSWORD || "User12346";
const compliantPassword = process.env.LIVE_TEST_COMPLIANT_PASSWORD || "User12347";
const locale = process.env.LIVE_TEST_LOCALE || "en";
const temporaryBio = `integration-check-${Date.now()}`;

let originalBio: string | null = null;

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

async function login(password: string) {
  const csrfResponse = await request("/api/auth/csrf");
  const csrfData = await csrfResponse.json() as { csrfToken?: string };

  if (!csrfResponse.ok || !csrfData.csrfToken) {
    throw new Error(`Failed to get CSRF token: ${JSON.stringify(csrfData)}`);
  }

  const form = new URLSearchParams({
    csrfToken: csrfData.csrfToken,
    email,
    password,
    callbackUrl: `${baseUrl}/en/dashboard`,
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
    throw new Error(`Login failed (${loginResponse.status}): ${rawText}`);
  }

  const sessionResponse = await request("/api/auth/session");
  const session = await sessionResponse.json() as {
    user?: { email?: string; role?: string };
  };

  if (!session?.user?.email) {
    throw new Error(`Session missing after login: ${JSON.stringify(session)}`);
  }

  return session;
}

async function cleanup() {
  try {
    const hashedOriginalPassword = await bcrypt.hash(originalPassword, 12);

    await prisma.user.update({
      where: { email },
      data: {
        bio: originalBio,
        password: hashedOriginalPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });
  } catch {
    // Ignore cleanup failures in the manual health-check script.
  }
}

async function main() {
  const summary: Array<Record<string, unknown>> = [];

  cookieJar.clear();
  cookieJar.set("NEXT_LOCALE", locale);
  const firstSession = await login(originalPassword);
  summary.push({
    step: "login-original",
    ok: true,
    user: firstSession.user?.email,
    role: firstSession.user?.role,
  });

  const profileResponse = await request("/api/user/profile");
  const profileData = await profileResponse.json() as {
    data?: { name?: string; email?: string; bio?: string | null };
  };

  if (!profileResponse.ok || !profileData?.data?.email) {
    throw new Error(`Profile GET failed: ${JSON.stringify(profileData)}`);
  }

  summary.push({
    step: "profile-get",
    ok: true,
    name: profileData.data.name,
    email: profileData.data.email,
  });

  originalBio = profileData.data.bio ?? null;

  const updateResponse = await request("/api/user/profile", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ bio: temporaryBio }),
  });
  const updateData = await updateResponse.json() as {
    data?: { bio?: string | null };
  };

  if (!updateResponse.ok || updateData.data?.bio !== temporaryBio) {
    throw new Error(`Profile PUT failed: ${JSON.stringify(updateData)}`);
  }

  summary.push({ step: "profile-put", ok: true, bio: updateData.data?.bio });

  const revertProfileResponse = await request("/api/user/profile", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ bio: originalBio }),
  });
  const revertProfileData = await revertProfileResponse.json() as {
    data?: { bio?: string | null };
  };

  if (!revertProfileResponse.ok) {
    throw new Error(`Profile revert failed: ${JSON.stringify(revertProfileData)}`);
  }

  summary.push({ step: "profile-revert", ok: true, bio: revertProfileData.data?.bio ?? null });

  const forgotResponse = await request("/api/forgot-password", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ email, locale }),
  });
  const forgotData = await forgotResponse.json() as Record<string, unknown>;
  summary.push({ step: "forgot-password", status: forgotResponse.status, body: forgotData });

  let resetTokenRecord = await prisma.user.findUnique({
    where: { email },
    select: { resetToken: true, resetTokenExpiry: true },
  });

  let tokenSource = "api";

  if (!resetTokenRecord?.resetToken) {
    tokenSource = "manual-fixture";
    resetTokenRecord = await prisma.user.update({
      where: { email },
      data: {
        resetToken: `manual-reset-${Date.now()}`,
        resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
      },
      select: { resetToken: true, resetTokenExpiry: true },
    });
  }

  const resetToken = resetTokenRecord.resetToken;
  summary.push({ step: "reset-token-ready", ok: Boolean(resetToken), source: tokenSource });

  if (!resetToken) {
    throw new Error("Reset token is missing after preparation.");
  }

  const validateResponse = await request(`/api/reset-password?token=${encodeURIComponent(resetToken)}&locale=${encodeURIComponent(locale)}`);
  const validateData = await validateResponse.json() as Record<string, unknown>;

  if (!validateResponse.ok || !validateData.success) {
    throw new Error(`Reset token validation failed: ${JSON.stringify(validateData)}`);
  }

  summary.push({ step: "reset-validate", ok: true, body: validateData });

  const resetResponse = await request("/api/reset-password", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ token: resetToken, password: temporaryPassword, locale }),
  });
  const resetData = await resetResponse.json() as Record<string, unknown>;

  if (!resetResponse.ok || !resetData.success) {
    throw new Error(`Reset password failed: ${JSON.stringify(resetData)}`);
  }

  summary.push({ step: "reset-password", ok: true, body: resetData });

  cookieJar.clear();
  cookieJar.set("NEXT_LOCALE", locale);
  const tempSession = await login(temporaryPassword);
  summary.push({ step: "login-temporary-password", ok: true, user: tempSession.user?.email });

  const changePasswordResponse = await request("/api/user/password", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ oldPassword: temporaryPassword, newPassword: compliantPassword }),
  });
  const changePasswordData = await changePasswordResponse.json() as Record<string, unknown>;

  if (!changePasswordResponse.ok || !changePasswordData.success) {
    throw new Error(`Restore password failed: ${JSON.stringify(changePasswordData)}`);
  }

  summary.push({ step: "change-password", ok: true, body: changePasswordData });

  cookieJar.clear();
  cookieJar.set("NEXT_LOCALE", locale);
  const compliantSession = await login(compliantPassword);
  summary.push({ step: "login-compliant-password", ok: true, user: compliantSession.user?.email });

  const hashedOriginalPassword = await bcrypt.hash(originalPassword, 12);
  await prisma.user.update({
    where: { email },
    data: {
      password: hashedOriginalPassword,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  cookieJar.clear();
  cookieJar.set("NEXT_LOCALE", locale);
  const restoredSession = await login(originalPassword);
  summary.push({ step: "login-restored-password", ok: true, user: restoredSession.user?.email });

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch(async (error) => {
    console.error("INTEGRATION_TEST_FAILED");
    console.error(error);
    await cleanup();
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });