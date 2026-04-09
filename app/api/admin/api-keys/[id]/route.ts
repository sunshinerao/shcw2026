import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ALL_PERMISSIONS, type ApiKeyPermission } from "@/lib/openclaw-auth";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  return user?.role === "ADMIN" ? user : null;
}

function safePermissions(raw: unknown): ApiKeyPermission[] | null {
  if (!Array.isArray(raw)) return null;
  const valid = new Set<string>(ALL_PERMISSIONS);
  const filtered = raw.filter((p): p is ApiKeyPermission => typeof p === "string" && valid.has(p));
  return filtered.length > 0 ? filtered : null;
}

function safeIpAllowlist(raw: unknown): string[] | null | undefined {
  if (raw === null) return null; // explicit null = clear the allowlist
  if (!Array.isArray(raw)) return undefined; // absent = unchanged
  const ips = raw.filter((ip): ip is string => typeof ip === "string" && ip.trim().length > 0);
  return ips.length > 0 ? ips.map((ip) => ip.trim()) : null;
}

/**
 * PATCH /api/admin/api-keys/[id] — update name, permissions, ipAllowlist, isActive, note
 * DELETE /api/admin/api-keys/[id] — permanently delete a key
 */

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
  }

  const existing = await prisma.apiKey.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ success: false, error: "API key not found" }, { status: 404 });
  }

  const body = await req.json();
  const updateData: Record<string, unknown> = {};

  if (typeof body.name === "string" && body.name.trim()) {
    updateData.name = body.name.trim();
  }

  if (typeof body.isActive === "boolean") {
    updateData.isActive = body.isActive;
  }

  if (typeof body.note === "string") {
    updateData.note = body.note.trim() || null;
  }

  if (body.permissions !== undefined) {
    const perms = safePermissions(body.permissions);
    if (!perms) {
      return NextResponse.json(
        { success: false, error: `permissions must be a non-empty array of: ${ALL_PERMISSIONS.join(", ")}` },
        { status: 400 }
      );
    }
    updateData.permissions = perms;
  }

  if (body.ipAllowlist !== undefined) {
    const ips = safeIpAllowlist(body.ipAllowlist);
    if (ips !== undefined) {
      updateData.ipAllowlist = ips;
    }
  }

  const updated = await prisma.apiKey.update({
    where: { id: params.id },
    data: updateData,
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
    },
  });

  return NextResponse.json({ success: true, data: updated, message: "API key updated" });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
  }

  const existing = await prisma.apiKey.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ success: false, error: "API key not found" }, { status: 404 });
  }

  await prisma.apiKey.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true, message: "API key deleted" });
}
