import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Vercel serverless functions reject requests with headers > 16KB (494 error).
// Edge Middleware runs at a higher limit and can intercept these requests first.
// If the Cookie header is dangerously large (bloated JWT from old sessions),
// we clear the session cookies and redirect the user to re-login.
const COOKIE_SIZE_LIMIT = 11 * 1024; // 11 KB — safe margin below Vercel's 16 KB limit

const SESSION_COOKIE_NAMES = [
  "__Secure-next-auth.session-token", // production (HTTPS)
  "next-auth.session-token",          // development
];

export default function middleware(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";

  if (cookieHeader.length > COOKIE_SIZE_LIMIT) {
    // Detect locale from path prefix, default to "zh"
    const pathParts = req.nextUrl.pathname.split("/").filter(Boolean);
    const locale = pathParts[0] === "en" ? "en" : "zh";

    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = `/${locale}/auth/login`;
    redirectUrl.search = "";

    const response = NextResponse.redirect(redirectUrl);

    // Clear bloated session cookies — browser processes Set-Cookie before following redirect
    for (const name of SESSION_COOKIE_NAMES) {
      response.headers.append(
        "Set-Cookie",
        `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`
      );
    }

    return response;
  }

  return intlMiddleware(req);
}

export const config = {
  // Match all pathnames except for
  // - /api routes
  // - /_next (Next.js internals)
  // - /_static (inside /public)
  // - /images (inside /public)
  // - all root files inside /public (e.g. /favicon.ico)
  matcher: [
    "/((?!api|_next|_static|images|old_website_files|.*\\..*).*)",
  ],
};
