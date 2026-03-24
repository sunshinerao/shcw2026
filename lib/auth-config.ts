export const DEV_ONLY_NEXTAUTH_SECRET = "shcw2026-secret-key-development-only";

export const SESSION_COOKIE_NAME = "next-auth.session-token";

export function isProductionEnvironment() {
  return process.env.NODE_ENV === "production";
}

export function getNextAuthSecret() {
  if (process.env.NEXTAUTH_SECRET) {
    return process.env.NEXTAUTH_SECRET;
  }

  if (isProductionEnvironment()) {
    return undefined;
  }

  return DEV_ONLY_NEXTAUTH_SECRET;
}

export function isAuthDebugEnabled() {
  return !isProductionEnvironment();
}

export function isSecureCookieEnabled() {
  return isProductionEnvironment();
}

export function isDevAuthBypassEnabled() {
  return !isProductionEnvironment() && process.env.ENABLE_DEV_AUTH_BYPASS === "true";
}