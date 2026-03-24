import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  getNextAuthSecret,
  isDevAuthBypassEnabled,
  isSecureCookieEnabled,
  SESSION_COOKIE_NAME,
} from "./auth-config";

export async function verifyAuth(req: NextRequest): Promise<{ userId: string } | null> {
  try {
    const secret = getNextAuthSecret();

    if (!secret) {
      console.error("NEXTAUTH_SECRET is required in production.");
      return null;
    }

    const token = await getToken({
      req,
      secret,
      cookieName: SESSION_COOKIE_NAME,
      secureCookie: isSecureCookieEnabled(),
    });

    if (token?.sub) {
      return { userId: token.sub };
    }

    return null;
  } catch (error) {
    console.error("Auth verification error:", error);
    return null;
  }
}

export async function verifyAuthDev(req: NextRequest): Promise<{ userId: string } | null> {
  const devUserId = req.headers.get("x-dev-user-id");
  if (devUserId && isDevAuthBypassEnabled()) {
    console.log("Dev mode: using header user id:", devUserId);
    return { userId: devUserId };
  }

  const auth = await verifyAuth(req);
  if (auth) return auth;

  return null;
}
