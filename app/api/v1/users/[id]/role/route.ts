import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/openclaw-auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyApiKey(req, "users:write");
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "Request body must be valid JSON" }, { status: 400 });
  }

  const role = (body as Record<string, unknown>).role;
  if (!role || !Object.values(UserRole).includes(role as UserRole)) {
    return NextResponse.json({ success: false, error: "role is invalid" }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, email: true },
  });

  if (!existingUser) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  const updatedUser = await prisma.user.update({
    where: { id: params.id },
    data: {
      role: role as UserRole,
      ...(role === UserRole.ADMIN ? { staffPermissions: null } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      climatePassportId: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: updatedUser,
    message: "User role updated successfully.",
  });
}
