import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateApiKey, ALL_PERMISSIONS, type ApiKeyPermission } from "@/lib/openclaw-auth";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  return user?.role === "ADMIN" ? user : null;
}

function safePermissions(raw: unknown): ApiKeyPermission[] {
  if (!Array.isArray(raw)) return [];
  const valid = new Set<string>(ALL_PERMISSIONS);
  return raw.filter((p): p is ApiKeyPermission => typeof p === "string" && valid.has(p));
}

function safeIpAllowlist(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const ips = raw.filter((ip): ip is string => typeof ip === "string" && ip.trim().length > 0);
  return ips.length > 0 ? ips.map((ip) => ip.trim()) : null;
}

/**
 * GET /api/admin/api-keys — list all API keys (admin only)
 * POST /api/admin/api-keys — create a new API key (admin only)
 */

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
  }

  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      permissions: true,
      ipAllowlist: true,
      isActive: true,
      lastUsedAt: true,
      usageCount: true,
      note: true,
      createdAt: true,
      updatedAt: true,
      // keyHash is intentionally excluded
    },
  });

  return NextResponse.json({ success: true, data: keys });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
  }

  const body = await req.json();
  const { name, permissions: rawPerms, ipAllowlist: rawIps, note } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });
  }

  const permissions = safePermissions(rawPerms);
  if (permissions.length === 0) {
    return NextResponse.json(
      { success: false, error: `permissions must be a non-empty array of: ${ALL_PERMISSIONS.join(", ")}` },
      { status: 400 }
    );
  }

  const ipAllowlist = safeIpAllowlist(rawIps);

  const { raw, hash, prefix } = generateApiKey();

  const record = await prisma.apiKey.create({
    data: {
      name: name.trim(),
      keyHash: hash,
      keyPrefix: prefix,
      permissions,
      ipAllowlist: ipAllowlist ?? Prisma.JsonNull,
      note: typeof note === "string" && note.trim() ? note.trim() : null,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      permissions: true,
      ipAllowlist: true,
      isActive: true,
      usageCount: true,
      note: true,
      createdAt: true,
    },
  });

  // Return the raw key ONE TIME only — it is never stored in plaintext
  return NextResponse.json(
    {
      success: true,
      message: "API key created. Save the rawKey now — it will not be shown again.",
      data: { ...record, rawKey: raw },
    },
    { status: 201 }
  );
}
