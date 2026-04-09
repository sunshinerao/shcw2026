import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";
import { canManageSpeakers } from "@/lib/permissions";

// 检查用户是否有嘉宾管理权限
async function checkSpeakerPermission(sessionUserId: string, locale: "zh" | "en") {
  const currentUser = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { role: true, staffPermissions: true },
  });

  if (!currentUser) {
    return { allowed: false, status: 401, error: apiMessage(locale, "userNotFound") };
  }

  if (!canManageSpeakers(currentUser.role, currentUser.staffPermissions)) {
    return { allowed: false, status: 403, error: apiMessage(locale, "adminOnly") };
  }

  return { allowed: true, userRole: currentUser.role };
}

// GET: 获取嘉宾列表（支持分页、搜索）
export async function GET(req: NextRequest) {
  try {
    const requestLocale = resolveRequestLocale(req);
    const { searchParams } = new URL(req.url);
    
    // 分页参数
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "10", 10));
    const skip = (page - 1) * limit;
    
    // 搜索参数
    const search = searchParams.get("search") || "";
    const isKeynote = searchParams.get("isKeynote");
    
    // 构建查询条件
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { nameEn: { contains: search, mode: "insensitive" } },
        { organization: { contains: search, mode: "insensitive" } },
      ];
    }
    
    if (isKeynote !== null && isKeynote !== undefined) {
      where.isKeynote = isKeynote === "true";
    }
    
    // 获取总数
    const total = await prisma.speaker.count({ where });
    
    // 获取嘉宾列表
    const speakers = await prisma.speaker.findMany({
      where,
      orderBy: [
        { order: "asc" },
        { createdAt: "desc" },
      ],
      skip,
      take: limit,
      select: {
        id: true,
        salutation: true,
        name: true,
        nameEn: true,
        avatar: true,
        title: true,
        titleEn: true,
        organization: true,
        organizationEn: true,
        organizationLogo: true,
        bio: true,
        bioEn: true,
        linkedin: true,
        twitter: true,
        website: true,
        isKeynote: true,
        order: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            agendaItems: true,
          },
        },
      },
    });
    
    return NextResponse.json({
      success: true,
      data: speakers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching speakers:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(resolveRequestLocale(req), "speakerListFetchFailed") },
      { status: 500 }
    );
  }
}

// POST: 创建新嘉宾
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

    // 检查嘉宾管理权限
    const permission = await checkSpeakerPermission(session.user.id, requestLocale);
    if (!permission.allowed) {
      return NextResponse.json(
        { success: false, error: permission.error },
        { status: permission.status }
      );
    }
    const {
      name,
      nameEn,
      salutation,
      title,
      titleEn,
      organization,
      organizationEn,
      organizationLogo,
      bio,
      bioEn,
      email,
      linkedin,
      twitter,
      website,
      avatar,
      isKeynote,
      order,
    } = body;
    
    // 验证必填字段
    if (!name || !title || !organization) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "speakerRequired") },
        { status: 400 }
      );
    }
    
    // 创建嘉宾
    const speaker = await prisma.speaker.create({
      data: {
        salutation: salutation || null,
        name,
        nameEn: nameEn || null,
        title,
        titleEn: titleEn || null,
        organization,
        organizationEn: organizationEn || null,
        organizationLogo: organizationLogo || null,
        bio: bio || null,
        bioEn: bioEn || null,
        email: email || null,
        linkedin: linkedin || null,
        twitter: twitter || null,
        website: website || null,
        avatar: avatar || null,
        isKeynote: isKeynote || false,
        order: order || 0,
      },
    });
    
    return NextResponse.json({
      success: true,
      message: apiMessage(requestLocale, "speakerCreateSuccess"),
      data: speaker,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating speaker:", error);
    const requestLocale = resolveRequestLocale(req);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "speakerCreateFailed") },
      { status: 500 }
    );
  }
}
