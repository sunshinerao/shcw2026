import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";

interface Params {
  id: string;
}

// 检查用户权限
async function checkAdminPermission(
  sessionUserId: string,
  locale: "zh" | "en"
) {
  const currentUser = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { role: true },
  });

  if (!currentUser) {
    return { allowed: false, status: 401, error: apiMessage(locale, "userNotFound") };
  }

  if (
    currentUser.role !== UserRole.ADMIN &&
    currentUser.role !== UserRole.STAFF
  ) {
    return { allowed: false, status: 403, error: apiMessage(locale, "adminOnly") };
  }

  return { allowed: true, userRole: currentUser.role };
}

/**
 * GET /api/cooperation-plans/[id]
 * 获取单个合作方案详情
 */
export async function GET(
  request: NextRequest,
  context: { params: Params }
) {
  try {
    const { id } = context.params;

    const plan = await prisma.cooperationPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Cooperation plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error("[cooperation-plans/:id GET]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch cooperation plan" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/cooperation-plans/[id]
 * 更新合作方案
 */
export async function PUT(
  request: NextRequest,
  context: { params: Params }
) {
  try {
    // 获取请求地区和验证用户
    const body = await request.json();
    const requestLocale = resolveRequestLocale(request, body.locale);

    // 验证用户是否已登录
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "unauthorized") },
        { status: 401 }
      );
    }

    // 检查管理员权限
    const permission = await checkAdminPermission(session.user.id, requestLocale);
    if (!permission.allowed) {
      return NextResponse.json(
        { success: false, error: permission.error },
        { status: permission.status }
      );
    }

    const { id } = context.params;

    // 检查是否存在
    const existingPlan = await prisma.cooperationPlan.findUnique({
      where: { id },
    });

    if (!existingPlan) {
      return NextResponse.json(
        { success: false, error: "Cooperation plan not found" },
        { status: 404 }
      );
    }

    const {
      name,
      nameEn,
      description,
      descriptionEn,
      price,
      features,
      featuresEn,
      order,
      isActive,
    } = body;

    const plan = await prisma.cooperationPlan.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(nameEn !== undefined && { nameEn }),
        ...(description !== undefined && { description }),
        ...(descriptionEn !== undefined && { descriptionEn }),
        ...(price !== undefined && { price }),
        ...(features !== undefined && {
          features: Array.isArray(features) ? features : [],
        }),
        ...(featuresEn !== undefined && {
          featuresEn: Array.isArray(featuresEn) ? featuresEn : [],
        }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({
      success: true,
      data: plan,
      message: "Cooperation plan updated successfully",
    });
  } catch (error) {
    console.error("[cooperation-plans/:id PUT]", error);
    return NextResponse.json(
      { success: false, error: "Failed to update cooperation plan" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cooperation-plans/[id]
 * 删除合作方案
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Params }
) {
  try {
    // 获取请求地区和验证用户
    const requestLocale = resolveRequestLocale(request);

    // 验证用户是否已登录
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "unauthorized") },
        { status: 401 }
      );
    }

    // 检查管理员权限
    const permission = await checkAdminPermission(session.user.id, requestLocale);
    if (!permission.allowed) {
      return NextResponse.json(
        { success: false, error: permission.error },
        { status: permission.status }
      );
    }

    const { id } = context.params;

    // 检查是否存在
    const existingPlan = await prisma.cooperationPlan.findUnique({
      where: { id },
    });

    if (!existingPlan) {
      return NextResponse.json(
        { success: false, error: "Cooperation plan not found" },
        { status: 404 }
      );
    }

    await prisma.cooperationPlan.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Cooperation plan deleted successfully",
    });
  } catch (error) {
    console.error("[cooperation-plans/:id DELETE]", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete cooperation plan" },
      { status: 500 }
    );
  }
}
