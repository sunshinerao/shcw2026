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

// 获取单个赞助商详情
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestLocale = resolveRequestLocale(req);
    const { id } = params;
    
    const sponsor = await prisma.sponsor.findUnique({
      where: { id },
    });
    
    if (!sponsor) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "sponsorNotFound") },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: sponsor,
    });
  } catch (error) {
    console.error("Failed to fetch sponsor:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(resolveRequestLocale(req), "sponsorDetailFetchFailed") },
      { status: 500 }
    );
  }
}

// 更新赞助商信息
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { id } = params;
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
    
    // 检查赞助商是否存在
    const existingSponsor = await prisma.sponsor.findUnique({
      where: { id },
    });
    
    if (!existingSponsor) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "sponsorNotFound") },
        { status: 404 }
      );
    }
    
    // 验证 tier 值（如果提供了）
    if (tier) {
      const validTiers = ["platinum", "gold", "silver", "bronze", "partner"];
      if (!validTiers.includes(tier)) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "sponsorInvalidTier") },
          { status: 400 }
        );
      }
    }
    
    // 构建更新数据（只更新提供的字段）
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (nameEn !== undefined) updateData.nameEn = nameEn || null;
    if (logo !== undefined) updateData.logo = logo;
    if (website !== undefined) updateData.website = website;
    if (description !== undefined) updateData.description = description;
    if (descriptionEn !== undefined) updateData.descriptionEn = descriptionEn || null;
    if (tier !== undefined) updateData.tier = tier;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (showOnHomepage !== undefined) updateData.showOnHomepage = showOnHomepage;
    
    // 更新赞助商
    const sponsor = await prisma.sponsor.update({
      where: { id },
      data: updateData,
    });
    
    return NextResponse.json({
      success: true,
      message: apiMessage(requestLocale, "sponsorUpdateSuccess"),
      data: sponsor,
    });
  } catch (error) {
    console.error("Failed to update sponsor:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(resolveRequestLocale(req), "sponsorUpdateFailed") },
      { status: 500 }
    );
  }
}

// 删除赞助商
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestLocale = resolveRequestLocale(req);
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

    const { id } = params;
    
    // 检查赞助商是否存在
    const existingSponsor = await prisma.sponsor.findUnique({
      where: { id },
    });
    
    if (!existingSponsor) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "sponsorNotFound") },
        { status: 404 }
      );
    }
    
    // 删除赞助商
    await prisma.sponsor.delete({
      where: { id },
    });
    
    return NextResponse.json({
      success: true,
      message: apiMessage(requestLocale, "sponsorDeleteSuccess"),
    });
  } catch (error) {
    console.error("Failed to delete sponsor:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(resolveRequestLocale(req), "sponsorDeleteFailed") },
      { status: 500 }
    );
  }
}
