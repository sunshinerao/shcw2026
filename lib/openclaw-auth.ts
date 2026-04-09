import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export const ALL_PERMISSIONS = [
  "events:read",
  "events:write",
  "speakers:read",
  "speakers:write",
  "news:read",
  "news:write",
  "partners:read",
  "partners:write",
] as const;

export type ApiKeyPermission = (typeof ALL_PERMISSIONS)[number];

export type ApiKeyAuthResult =
  | { ok: true; keyId: string; permissions: ApiKeyPermission[] }
  | { ok: false; status: 401 | 403; error: string };

/** SHA-256 hash of the raw key. */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

/** Generate a new random API key: sk_oc_<32 hex chars> */
export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const random = crypto.randomBytes(16).toString("hex"); // 32 chars
  const raw = `sk_oc_${random}`;
  const hash = hashApiKey(raw);
  const prefix = raw.slice(0, 12); // "sk_oc_" + first 6 hex chars
  return { raw, hash, prefix };
}

/** Extract the client IP from common reverse-proxy headers. */
function extractClientIp(req: NextRequest): string {
  // x-forwarded-for may contain a comma-separated list; take the first entry
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xRealIp = req.headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();
  return "unknown";
}

/** Check whether the client IP is in a simple exact-match allowlist. */
function isIpAllowed(clientIp: string, allowlist: string[]): boolean {
  return allowlist.includes(clientIp);
}

/**
 * Verify an incoming API key from the request headers and check that the
 * caller has the required permission and is connecting from an allowed IP.
 *
 * Accepted header formats:
 *   Authorization: Bearer <key>
 *   x-api-key: <key>
 */
export async function verifyApiKey(
  req: NextRequest,
  requiredPermission: ApiKeyPermission
): Promise<ApiKeyAuthResult> {
  // --- Extract raw key from header ---
  const authHeader = req.headers.get("authorization");
  const xApiKey = req.headers.get("x-api-key");
  let rawKey: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    rawKey = authHeader.slice(7).trim();
  } else if (xApiKey) {
    rawKey = xApiKey.trim();
  }

  if (!rawKey) {
    return { ok: false, status: 401, error: "Missing API key (use Authorization: Bearer <key> or x-api-key header)" };
  }

  // --- Hash and look up in DB ---
  const keyHash = hashApiKey(rawKey);
  const record = await prisma.apiKey.findUnique({ where: { keyHash } });

  if (!record || !record.isActive) {
    return { ok: false, status: 401, error: "Invalid or revoked API key" };
  }

  // --- IP allowlist check ---
  const allowlist = record.ipAllowlist as string[] | null;
  if (allowlist && allowlist.length > 0) {
    const clientIp = extractClientIp(req);
    if (!isIpAllowed(clientIp, allowlist)) {
      return { ok: false, status: 403, error: `IP ${clientIp} is not in the allowed list for this API key` };
    }
  }

  // --- Permission check ---
  const permissions = record.permissions as ApiKeyPermission[];
  if (!permissions.includes(requiredPermission)) {
    return {
      ok: false,
      status: 403,
      error: `This API key does not have the '${requiredPermission}' permission`,
    };
  }

  // --- Update usage stats (fire-and-forget to avoid latency impact) ---
  void prisma.apiKey.update({
    where: { id: record.id },
    data: {
      lastUsedAt: new Date(),
      usageCount: { increment: 1 },
    },
  });

  return {
    ok: true,
    keyId: record.id,
    permissions,
  };
}
