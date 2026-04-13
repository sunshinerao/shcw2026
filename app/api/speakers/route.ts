import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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
    const limit = Math.min(1000, parseInt(searchParams.get("limit") || "10", 10));
    const skip = (page - 1) * limit;
    
    // 搜索参数
    const search = searchParams.get("search") || "";
    const organization = (searchParams.get("organization") || "").trim();
    const isKeynote = searchParams.get("isKeynote");
    const isVisible = searchParams.get("isVisible");
    const includeHidden = searchParams.get("includeHidden") === "true";
    const includeFilterOptions = searchParams.get("includeFilterOptions") === "true";
    
    // includeHidden=true 仅允许嘉宾管理权限用户查看隐藏嘉宾
    if (includeHidden) {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "unauthorized") },
          { status: 401 }
        );
      }
      const permission = await checkSpeakerPermission(session.user.id, requestLocale);
      if (!permission.allowed) {
        return NextResponse.json(
          { success: false, error: permission.error },
          { status: permission.status }
        );
      }
    }

    // 构建查询条件
    const where: Prisma.SpeakerWhereInput = {};
    const andConditions: Prisma.SpeakerWhereInput[] = [];

    if (!includeHidden) {
      andConditions.push({ isVisible: true });
    }

    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { nameEn: { contains: search, mode: "insensitive" } },
          { organization: { contains: search, mode: "insensitive" } },
          { organizationEn: { contains: search, mode: "insensitive" } },
        ],
      });
    }
    if (organization) {
      andConditions.push({
        OR: [
          { organization: { equals: organization, mode: "insensitive" } },
          { organizationEn: { equals: organization, mode: "insensitive" } },
        ],
      });
    }

    if (isKeynote !== null && isKeynote !== undefined) {
      andConditions.push({ isKeynote: isKeynote === "true" });
    }

    if (isVisible !== null && isVisible !== undefined) {
      andConditions.push({ isVisible: isVisible === "true" });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
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
        slug: true,
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
        summary: true,
        summaryEn: true,
        countryOrRegion: true,
        countryOrRegionEn: true,
        relevanceToShcw: true,
        relevanceToShcwEn: true,
        expertiseTags: true,
        linkedin: true,
        twitter: true,
        website: true,
        isKeynote: true,
        isVisible: true,
        order: true,
        institutionId: true,
        institution: {
          select: { id: true, slug: true, name: true, nameEn: true, logo: true },
        },
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            agendaItems: true,
          },
        },
      },
    });
    
    const filterOptions = includeFilterOptions
      ? {
          organizations: await prisma.speaker.findMany({
            where: includeHidden ? undefined : { isVisible: true },
            select: {
              organization: true,
              organizationEn: true,
            },
            distinct: ["organization"],
            orderBy: {
              organization: "asc",
            },
          }),
        }
      : undefined;

    return NextResponse.json({
      success: true,
      data: speakers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      ...(filterOptions ? { filterOptions } : {}),
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
      summary,
      summaryEn,
      countryOrRegion,
      countryOrRegionEn,
      relevanceToShcw,
      relevanceToShcwEn,
      expertiseTags,
      slug,
      institutionId,
      roles,
      email,
      linkedin,
      twitter,
      website,
      avatar,
      isKeynote,
      isVisible,
      order,
    } = body;
    
    // 验证必填字段
    if (!name || !title || !organization) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "speakerRequired") },
        { status: 400 }
      );
    }

    if (slug?.trim()) {
      const slugConflict = await prisma.speaker.findFirst({
        where: { slug: slug.trim() },
        select: { id: true, name: true },
      });
      if (slugConflict) {
        return NextResponse.json(
          {
            success: false,
            error: `Slug "${slug.trim()}" is already used by speaker "${slugConflict.name}" (id: ${slugConflict.id})`,
          },
          { status: 409 }
        );
      }
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
        summary: summary || null,
        summaryEn: summaryEn || null,
        countryOrRegion: countryOrRegion || null,
        countryOrRegionEn: countryOrRegionEn || null,
        relevanceToShcw: relevanceToShcw || null,
        relevanceToShcwEn: relevanceToShcwEn || null,
        expertiseTags: expertiseTags ?? null,
        slug: slug?.trim() || null,
        institutionId: institutionId || null,
        email: email || null,
        linkedin: linkedin || null,
        twitter: twitter || null,
        website: website || null,
        avatar: avatar || null,
        isKeynote: isKeynote || false,
        isVisible: isVisible !== undefined ? Boolean(isVisible) : true,
        order: order || 0,
      },
    });

    // 如果提供了 roles，创建历史职务
    if (Array.isArray(roles) && roles.length > 0) {
      const validRoles = (roles as Array<Record<string, unknown>>).filter(
        (r) => typeof r.title === "string" && r.title.trim() && typeof r.organization === "string" && r.organization.trim()
      );
      if (validRoles.length > 0) {
        await prisma.speakerRole.createMany({
          data: validRoles.map((r, idx) => ({
            speakerId: speaker.id,
            title: (r.title as string).trim(),
            titleEn: typeof r.titleEn === "string" ? r.titleEn.trim() || null : null,
            organization: (r.organization as string).trim(),
            organizationEn: typeof r.organizationEn === "string" ? r.organizationEn.trim() || null : null,
            startYear: typeof r.startYear === "number" ? r.startYear : null,
            endYear: typeof r.endYear === "number" && !r.isCurrent ? r.endYear : null,
            isCurrent: !!r.isCurrent,
            order: typeof r.order === "number" ? r.order : idx,
          })),
        });
      }
    }
    
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
