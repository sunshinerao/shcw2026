import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiMessage, resolveRequestLocale, type ApiLocale } from "@/lib/api-i18n";
import { EVENT_PASS_QR_TTL_MS, getEventPassState } from "@/lib/climate-passport";
import { prisma } from "@/lib/prisma";

/**
 * 二维码验证和签到接口
 * POST /api/checkin
 * 
 * 请求体:
 * {
 *   qrData: string, // 扫描二维码得到的数据
 *   eventId?: string // 可选，指定验证的活动
 * }
 * 
 * 权限: VERIFIER, STAFF, ADMIN
 */
export async function POST(req: NextRequest) {
  let requestLocale = resolveRequestLocale(req);

  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "unauthorized") },
        { status: 401 }
      );
    }

    // 检查权限
    const allowedRoles = ["ADMIN", "STAFF", "VERIFIER"];
    if (!allowedRoles.includes(session.user.role as string)) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "checkinForbidden") },
        { status: 403 }
      );
    }

    const body = await req.json();
    requestLocale = resolveRequestLocale(req, body.locale);
    const { qrData, eventId: targetEventId } = body;

    if (!qrData) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "checkinQrDataRequired") },
        { status: 400 }
      );
    }

    // 解析二维码数据
    // 格式1: SCW2026://PASSPORT/{userId}/{passCode}
    // 格式2: SCW2026://EVENT/{eventId}/{userId}/{registrationId}/{timestamp}
    
    const passportMatch = qrData.match(/^SCW2026:\/\/PASSPORT\/([^\/]+)\/([^\/]+)$/);
    const eventMatch = qrData.match(/^SCW2026:\/\/EVENT\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(\d+)$/);

    let result;
    
    if (passportMatch) {
      // 气候护照二维码 - 只验证身份
      const [, userId, passCode] = passportMatch;
      result = await verifyPassport(userId, passCode);
    } else if (eventMatch) {
      // 活动通行证二维码 - 验证并签到
      const [, eventId, userId, registrationId, timestamp] = eventMatch;
      result = await verifyAndCheckIn(
        eventId,
        userId,
        registrationId,
        parseInt(timestamp),
        requestLocale,
        session.user.id,
        targetEventId
      );
    } else {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "invalidQrFormat") },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("验码失败:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "checkinFailed") },
      { status: 500 }
    );
  }
}

/**
 * 验证气候护照
 */
async function verifyPassport(userId: string, passCode: string, locale: ApiLocale = "zh") {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      passCode: passCode,
    },
    include: {
      organization: true,
    },
  });

  if (!user) {
    return {
      success: false,
      error: apiMessage(locale, "passportVerificationFailed"),
    };
  }

  return {
    success: true,
    data: {
      type: "PASSPORT",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        climatePassportId: user.climatePassportId,
        organization: user.organization?.name || null,
        title: user.title,
        avatar: user.avatar,
      },
      message: apiMessage(locale, "passportVerificationSuccess"),
    },
  };
}

/**
 * 验证活动通行证并签到
 */
async function verifyAndCheckIn(
  eventId: string,
  userId: string,
  registrationId: string,
  timestamp: number,
  locale: ApiLocale,
  verifierId: string,
  targetEventId?: string
) {
  // 检查二维码是否过期（短时动态有效）
  const now = Date.now();
  
  if (now - timestamp > EVENT_PASS_QR_TTL_MS) {
    return {
      success: false,
      error: apiMessage(locale, "qrExpired"),
    };
  }

  // 如果指定了目标活动，检查是否匹配
  if (targetEventId && targetEventId !== eventId) {
    return {
      success: false,
      error: apiMessage(locale, "qrWrongEvent"),
    };
  }

  // 验证报名记录
  const registration = await prisma.registration.findFirst({
    where: {
      id: registrationId,
      userId: userId,
      eventId: eventId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          climatePassportId: true,
          passCode: true,
          title: true,
          organization: {
            select: { name: true },
          },
        },
      },
      event: {
        select: {
          id: true,
          title: true,
          titleEn: true,
          startDate: true,
          startTime: true,
          endTime: true,
          type: true,
          venue: true,
        },
      },
    },
  });

  if (!registration) {
    return {
      success: false,
      error: apiMessage(locale, "invalidRegistration"),
    };
  }

  if (registration.status === "CANCELLED") {
    return {
      success: false,
      error: apiMessage(locale, "qrRegistrationCancelled"),
    };
  }

  const passState = getEventPassState({
    startDate: registration.event.startDate,
    startTime: registration.event.startTime,
    endTime: registration.event.endTime,
    checkedInAt: registration.checkedInAt,
  });

  if (passState === "upcoming") {
    return {
      success: false,
      error: apiMessage(locale, "qrNotActiveYet"),
    };
  }

  if (passState === "expired") {
    return {
      success: false,
      error: apiMessage(locale, "qrEventEnded"),
    };
  }

  // 检查是否已经验码
  if (registration.checkedInAt) {
    return {
      success: true,
      data: {
        type: "EVENT",
        alreadyCheckedIn: true,
        registration: {
          id: registration.id,
          status: registration.status,
          checkedInAt: registration.checkedInAt,
          pointsEarned: registration.pointsEarned,
        },
        user: registration.user,
        event: registration.event,
        message: apiMessage(locale, "alreadyCheckedIn"),
      },
    };
  }

  // 根据活动类型给予不同积分，未知类型回退到 10 分。
  const eventTypePoints: Record<string, number> = {
    ceremony: 20,    // 开幕式/典礼积分更高
    forum: 15,       // 论坛
    workshop: 10,    // 工作坊
    conference: 15,  // 会议
    networking: 5,   // 社交活动
  };

  const pointsToAward = eventTypePoints[registration.event.type] ?? 10;

  // 执行签到和积分发放（事务）
  const updatedRegistration = await prisma.$transaction(async (tx) => {
    // 1. 更新报名记录为已入场
    const updated = await tx.registration.update({
      where: { id: registrationId },
      data: {
        status: "ATTENDED",
        checkedInAt: new Date(),
        checkedInBy: verifierId,
        checkInMethod: "QR_CODE",
        pointsEarned: pointsToAward,
      },
    });

    // 2. 创建验码记录
    await tx.checkIn.create({
      data: {
        userId: userId,
        eventId: eventId,
        scannedBy: verifierId,
        method: "QR_CODE",
      },
    });

    // 3. 给用户增加积分
    await tx.user.update({
      where: { id: userId },
      data: {
        points: {
          increment: pointsToAward,
        },
      },
    });

    // 4. 记录积分交易
    await tx.pointTransaction.create({
      data: {
        userId: userId,
        points: pointsToAward,
        type: "EVENT_ATTENDANCE",
        eventId: eventId,
        registrationId: registrationId,
        description:
          locale === "en"
            ? `Earned points for attending \"${registration.event.titleEn || registration.event.title}\"`
            : `参加 "${registration.event.title}" 获得积分`,
        createdBy: verifierId,
      },
    });

    return updated;
  });

  return {
    success: true,
    data: {
      type: "EVENT",
      alreadyCheckedIn: false,
      registration: {
        id: updatedRegistration.id,
        status: updatedRegistration.status,
        checkedInAt: updatedRegistration.checkedInAt,
        pointsEarned: updatedRegistration.pointsEarned,
      },
      user: registration.user,
      event: registration.event,
      pointsAwarded: pointsToAward,
      message: apiMessage(locale, "checkinSuccess"),
    },
  };
}

/**
 * 获取验证记录（供验证人员查看）
 * GET /api/checkin?eventId=xxx&limit=50
 */
export async function GET(req: NextRequest) {
  const requestLocale = resolveRequestLocale(req, new URL(req.url).searchParams.get("locale"));

  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "unauthorized") },
        { status: 401 }
      );
    }

    // 检查权限
    const allowedRoles = ["ADMIN", "STAFF", "VERIFIER"];
    if (!allowedRoles.includes(session.user.role as string)) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "checkinForbidden") },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};
    if (eventId) {
      where.eventId = eventId;
    }

    const checkIns = await prisma.checkIn.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            climatePassportId: true,
            avatar: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
          },
        },
      },
      orderBy: {
        scannedAt: "desc",
      },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: checkIns,
    });
  } catch (error) {
    console.error("获取验码记录失败:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "checkinHistoryFetchFailed") },
      { status: 500 }
    );
  }
}
