import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";

// 检查用户是否为管理员或工作人员
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

  return { allowed: true, userRole: currentUser.role };
}

// 获取赞助商列表
export async function GET(req: NextRequest) {
  try {
    const requestLocale = resolveRequestLocale(req);
    const { searchParams } = new URL(req.url);
    
    // 筛选参数
    const tier = searchParams.get("tier");
    const isActive = searchParams.get("isActive");
    const showOnHomepage = searchParams.get("showOnHomepage");
    
    // 排序参数
    const sortBy = searchParams.get("sortBy") || "order"; // order | createdAt | name
    const order = searchParams.get("order") || "asc"; // asc | desc
    
    // 构建查询条件
    const where: any = {};
    
    if (tier) {
      where.tier = tier;
    }
    
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true";
    }
    
    if (showOnHomepage !== null && showOnHomepage !== undefined) {
      where.showOnHomepage = showOnHomepage === "true";
    }
    
    // 构建排序条件
    const orderBy: any = {};
    if (sortBy === "createdAt") {
      orderBy.createdAt = order;
    } else if (sortBy === "name") {
      orderBy.name = order;
    } else {
      orderBy.order = order;
    }
    
    // 查询赞助商列表
    const sponsors = await prisma.sponsor.findMany({
      where,
      orderBy: [
        { tier: "asc" }, // 先按级别排序（platinum > gold > silver > bronze > partner）
        orderBy,
      ],
    });
    
    return NextResponse.json({
      success: true,
      data: sponsors,
      count: sponsors.length,
    });
  } catch (error) {
    console.error("Failed to fetch sponsors:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(resolveRequestLocale(req), "sponsorListFetchFailed") },
      { status: 500 }
    );
  }
}

// 创建新赞助商
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const requestLocale = resolveRequestLocale(req, body.locale);
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
      name,
      nameEn,
      logo,
      website,
      description,
      descriptionEn,
      tier,
      order,
      isActive,
      showOnHomepage,
    } = body;
    
    // 验证必填字段
    if (!name || !logo || !tier) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "sponsorRequired") },
        { status: 400 }
      );
    }
    
    // 验证 tier 值
    const validTiers = ["platinum", "gold", "silver", "bronze", "partner"];
    if (!validTiers.includes(tier)) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "sponsorInvalidTier") },
        { status: 400 }
      );
    }
    
    // 创建赞助商
    const sponsor = await prisma.sponsor.create({
      data: {
        name,
        nameEn: nameEn || null,
        logo,
        website,
        description,
        descriptionEn: descriptionEn || null,
        tier,
        order: order ?? 0,
        isActive: isActive ?? true,
        showOnHomepage: showOnHomepage ?? false,
      },
    });
    
    return NextResponse.json({
      success: true,
      message: apiMessage(requestLocale, "sponsorCreateSuccess"),
      data: sponsor,
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create sponsor:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(resolveRequestLocale(req), "sponsorCreateFailed") },
      { status: 500 }
    );
  }
}
