import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/permissions";
import {
  getInvitationTemplateSettings,
  updateInvitationTemplateSettings,
} from "@/lib/invitation-settings";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (!user || !isAdminRole(user.role)) return null;
  return user;
}

/** GET /api/admin/invitation-template — load current template settings */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const settings = await getInvitationTemplateSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("Get invitation template settings error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

/** PUT /api/admin/invitation-template — save template settings */
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const updated = await updateInvitationTemplateSettings(body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update invitation template settings error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
