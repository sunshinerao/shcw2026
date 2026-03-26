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
    select: { role: true },
  });

  if (!currentUser) {
    return { allowed: false, status: 401, error: apiMessage(locale, "userNotFound") };
  }

  if (!canManageSpeakers(currentUser.role)) {
    return { allowed: false, status: 403, error: apiMessage(locale, "adminOrEventManagerOnly") };
  }

  return { allowed: true, userRole: currentUser.role };
}

// GET: 获取单个嘉宾详情
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestLocale = resolveRequestLocale(req);
    const { id } = params;
    
    const speaker = await prisma.speaker.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        nameEn: true,
        title: true,
        titleEn: true,
        organization: true,
        organizationEn: true,
        bio: true,
        bioEn: true,
        avatar: true,
        isKeynote: true,
        order: true,
        agendaItems: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                titleEn: true,
                startDate: true,
                venue: true,
              },
            },
          },
          orderBy: {
            startTime: "asc",
          },
        },
      },
    });
    
    if (!speaker) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "speakerNotFound") },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: speaker,
    });
  } catch (error) {
    console.error("Error fetching speaker:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(resolveRequestLocale(req), "speakerDetailFetchFailed") },
      { status: 500 }
    );
  }
}

// PUT: 更新嘉宾信息
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

    // 检查嘉宾管理权限
    const permission = await checkSpeakerPermission(session.user.id, requestLocale);
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
    
    // 检查嘉宾是否存在
    const existingSpeaker = await prisma.speaker.findUnique({
      where: { id },
    });
    
    if (!existingSpeaker) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "speakerNotFound") },
        { status: 404 }
      );
    }
    
    // 验证必填字段
    if (name === "" || title === "" || organization === "") {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "speakerUpdateRequired") },
        { status: 400 }
      );
    }
    
    // 更新嘉宾
    const updatedSpeaker = await prisma.speaker.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(nameEn !== undefined && { nameEn: nameEn || null }),
        ...(title !== undefined && { title }),
        ...(titleEn !== undefined && { titleEn: titleEn || null }),
        ...(organization !== undefined && { organization }),
        ...(organizationEn !== undefined && { organizationEn: organizationEn || null }),
        ...(organizationLogo !== undefined && { organizationLogo: organizationLogo || null }),
        ...(bio !== undefined && { bio: bio || null }),
        ...(bioEn !== undefined && { bioEn: bioEn || null }),
        ...(email !== undefined && { email: email || null }),
        ...(linkedin !== undefined && { linkedin: linkedin || null }),
        ...(twitter !== undefined && { twitter: twitter || null }),
        ...(website !== undefined && { website: website || null }),
        ...(avatar !== undefined && { avatar: avatar || null }),
        ...(isKeynote !== undefined && { isKeynote }),
        ...(order !== undefined && { order }),
      },
    });
    
    return NextResponse.json({
      success: true,
      message: apiMessage(requestLocale, "speakerUpdateSuccess"),
      data: updatedSpeaker,
    });
  } catch (error) {
    console.error("Error updating speaker:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(resolveRequestLocale(req), "speakerUpdateFailed") },
      { status: 500 }
    );
  }
}

// DELETE: 删除嘉宾
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

    // 检查嘉宾管理权限
    const permission = await checkSpeakerPermission(session.user.id, requestLocale);
    if (!permission.allowed) {
      return NextResponse.json(
        { success: false, error: permission.error },
        { status: permission.status }
      );
    }

    const { id } = params;
    
    // 检查嘉宾是否存在
    const existingSpeaker = await prisma.speaker.findUnique({
      where: { id },
    });
    
    if (!existingSpeaker) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "speakerNotFound") },
        { status: 404 }
      );
    }
    
    // 删除嘉宾
    await prisma.speaker.delete({
      where: { id },
    });
    
    return NextResponse.json({
      success: true,
      message: apiMessage(requestLocale, "speakerDeleteSuccess"),
    });
  } catch (error) {
    console.error("Error deleting speaker:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(resolveRequestLocale(req), "speakerDeleteFailed") },
      { status: 500 }
    );
  }
}
