import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";
import { defaultCooperationPlans } from "@/lib/default-cooperation-plans";
import { prisma } from "@/lib/prisma";

async function checkAdminPermission(sessionUserId: string, locale: "zh" | "en") {
  const currentUser = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { role: true },
  });

  if (!currentUser) {
    return { allowed: false, status: 401, error: apiMessage(locale, "userNotFound") };
  }

  if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.STAFF) {
    return { allowed: false, status: 403, error: apiMessage(locale, "adminOnly") };
  }

  return { allowed: true };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const requestLocale = resolveRequestLocale(request, body.locale);
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "unauthorized") },
        { status: 401 }
      );
    }

    const permission = await checkAdminPermission(session.user.id, requestLocale);
    if (!permission.allowed) {
      return NextResponse.json(
        { success: false, error: permission.error },
        { status: permission.status }
      );
    }

    let created = 0;
    let skipped = 0;

    for (const plan of defaultCooperationPlans) {
      const existing = await prisma.cooperationPlan.findUnique({
        where: { tierType: plan.tierType },
        select: { id: true },
      });

      if (existing) {
        skipped += 1;
        continue;
      }

      await prisma.cooperationPlan.create({ data: plan });
      created += 1;
    }

    return NextResponse.json({
      success: true,
      data: { created, skipped, total: defaultCooperationPlans.length },
      message:
        requestLocale === "en"
          ? `Imported ${created} default cooperation plans`
          : `已导入 ${created} 条默认合作方案`,
    });
  } catch (error) {
    console.error("[cooperation-plans/import-defaults POST]", error);
    return NextResponse.json(
      {
        success: false,
        error:
          resolveRequestLocale(request) === "en"
            ? "Failed to import default cooperation plans"
            : "导入默认合作方案失败",
      },
      { status: 500 }
    );
  }
}