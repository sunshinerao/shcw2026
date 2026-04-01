import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { SpecialPassStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";
import { canManageSpecialPassApplications } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function requireManager(requestLocale: "zh" | "en") {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: apiMessage(requestLocale, "unauthorized") }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, name: true },
  });

  if (!user || !canManageSpecialPassApplications(user.role)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "adminOrSpecialPassManagerOnly") },
        { status: 403 }
      ),
    };
  }

  return { ok: true as const, user };
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  let requestLocale = resolveRequestLocale(req);

  try {
    const permission = await requireManager(requestLocale);
    if (!permission.ok) {
      return permission.response;
    }

    const body = await req.json();
    requestLocale = resolveRequestLocale(req, body.locale);
    const { status, adminNotes } = body;

    if (!status || !Object.values(SpecialPassStatus).includes(status as SpecialPassStatus)) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "无效的审核状态" : "Invalid review status" },
        { status: 400 }
      );
    }

    const existing = await prisma.specialPass.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "申请不存在" : "Application not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.specialPass.update({
      where: { id: params.id },
      data: {
        status: status as SpecialPassStatus,
        adminNotes: typeof adminNotes === "string" && adminNotes.trim() ? adminNotes.trim() : null,
        reviewedBy: permission.user.name,
        reviewedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update admin special pass error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
