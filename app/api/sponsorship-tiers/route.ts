import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";

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
 * GET /api/sponsorship-tiers
 * 获取所有赞助方案详情
 */
export async function GET(request: NextRequest) {
  try {
    const tiers = await prisma.sponsorshipTier.findMany({
      orderBy: { order: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: tiers,
    });
  } catch (error) {
    console.error("[sponsorship-tiers GET]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch sponsorship tiers" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sponsorship-tiers
 * 创建新的赞助方案
 */
export async function POST(request: NextRequest) {
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

    const {
      tierType,
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

    // 验证必填字段
    if (!tierType || !name || !nameEn || !features || !featuresEn) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 检查 tierType 是否已存在
    const existingTier = await prisma.sponsorshipTier.findUnique({
      where: { tierType },
    });

    if (existingTier) {
      return NextResponse.json(
        { success: false, error: "This tier type already exists" },
        { status: 400 }
      );
    }

    const tier = await prisma.sponsorshipTier.create({
      data: {
        tierType,
        name,
        nameEn,
        description: description || null,
        descriptionEn: descriptionEn || null,
        price: price || null,
        features: Array.isArray(features) ? features : [],
        featuresEn: Array.isArray(featuresEn) ? featuresEn : [],
        order: order ?? 0,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: tier,
        message: "Sponsorship tier created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[sponsorship-tiers POST]", error);
    return NextResponse.json(
      { success: false, error: "Failed to create sponsorship tier" },
      { status: 500 }
    );
  }
}
