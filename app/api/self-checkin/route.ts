import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiMessage, resolveRequestLocale, type ApiLocale } from "@/lib/api-i18n";
import { getEventPassState } from "@/lib/climate-passport";
import { prisma } from "@/lib/prisma";

/**
 * 观众自助签到接口（扫描现场二维码打卡）
 * POST /api/self-checkin
 *
 * 请求体:
 * {
 *   eventId: string,
 *   secret: string,
 *   locale?: string
 * }
 *
 * 权限: 已登录用户（必须已报名该活动）
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

    const body = await req.json();
    requestLocale = resolveRequestLocale(req, body.locale);
    const { eventId, secret } = body;

    if (!eventId || !secret) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "checkinQrDataRequired") },
        { status: 400 }
      );
    }

    // 验证活动存在且 secret 匹配
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        titleEn: true,
        startDate: true,
        endDate: true,
        startTime: true,
        endTime: true,
        type: true,
        venue: true,
        venueCheckinSecret: true,
        eventDateSlots: { orderBy: [{ scheduleDate: "asc" }] },
      },
    });

    if (!event || event.venueCheckinSecret !== secret) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "invalidQrFormat") },
        { status: 400 }
      );
    }

    // 查找用户的报名记录
    const registration = await prisma.registration.findUnique({
      where: {
        userId_eventId: {
          userId: session.user.id,
          eventId: eventId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            climatePassportId: true,
            passCode: true,
          },
        },
      },
    });

    if (!registration) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "selfCheckinNotRegistered") },
        { status: 403 }
      );
    }

    if (registration.status === "CANCELLED" || registration.status === "REJECTED") {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "qrRegistrationCancelled") },
        { status: 403 }
      );
    }

    if (registration.status === "PENDING_APPROVAL") {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "qrRegistrationPendingApproval") },
        { status: 403 }
      );
    }

    // 检查活动时间窗口
    const passState = getEventPassState({
      startDate: event.startDate,
      endDate: event.endDate,
      startTime: event.startTime,
      endTime: event.endTime,
      eventDateSlots: event.eventDateSlots,
      checkedInAt: registration.checkedInAt,
    });

    if (passState === "upcoming") {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "qrNotActiveYet") },
        { status: 403 }
      );
    }

    if (passState === "expired") {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "qrEventEnded") },
        { status: 403 }
      );
    }

    // 已签到
    if (registration.checkedInAt) {
      return NextResponse.json({
        success: true,
        data: {
          alreadyCheckedIn: true,
          event: { id: event.id, title: event.title, titleEn: event.titleEn, venue: event.venue },
          registration: {
            id: registration.id,
            status: registration.status,
            checkedInAt: registration.checkedInAt,
            pointsEarned: registration.pointsEarned,
          },
          message: apiMessage(requestLocale, "alreadyCheckedIn"),
        },
      });
    }

    // 积分
    const eventTypePoints: Record<string, number> = {
      ceremony: 20,
      forum: 15,
      workshop: 10,
      conference: 15,
      networking: 5,
    };
    const pointsToAward = eventTypePoints[event.type] ?? 10;

    // 事务签到
    const updatedRegistration = await prisma.$transaction(async (tx) => {
      const freshReg = await tx.registration.findUnique({
        where: { id: registration.id },
        select: { checkedInAt: true },
      });
      if (freshReg?.checkedInAt) return null;

      const updated = await tx.registration.update({
        where: { id: registration.id },
        data: {
          status: "ATTENDED",
          checkedInAt: new Date(),
          checkedInBy: session.user.id,
          checkInMethod: "VENUE_QR",
          pointsEarned: pointsToAward,
        },
      });

      await tx.checkIn.create({
        data: {
          userId: session.user.id,
          eventId: eventId,
          scannedBy: session.user.id,
          method: "VENUE_QR",
        },
      });

      await tx.user.update({
        where: { id: session.user.id },
        data: { points: { increment: pointsToAward } },
      });

      await tx.pointTransaction.create({
        data: {
          userId: session.user.id,
          points: pointsToAward,
          type: "EVENT_ATTENDANCE",
          eventId: eventId,
          registrationId: registration.id,
          description:
            requestLocale === "en"
              ? `Earned points for attending "${event.titleEn || event.title}"`
              : `参加 "${event.title}" 获得积分`,
          createdBy: session.user.id,
        },
      });

      return updated;
    });

    if (!updatedRegistration) {
      return NextResponse.json({
        success: true,
        data: {
          alreadyCheckedIn: true,
          event: { id: event.id, title: event.title, titleEn: event.titleEn, venue: event.venue },
          registration: {
            id: registration.id,
            status: registration.status,
            checkedInAt: registration.checkedInAt,
            pointsEarned: registration.pointsEarned,
          },
          message: apiMessage(requestLocale, "alreadyCheckedIn"),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        alreadyCheckedIn: false,
        event: { id: event.id, title: event.title, titleEn: event.titleEn, venue: event.venue },
        registration: {
          id: updatedRegistration.id,
          status: updatedRegistration.status,
          checkedInAt: updatedRegistration.checkedInAt,
          pointsEarned: updatedRegistration.pointsEarned,
        },
        pointsAwarded: pointsToAward,
        message: apiMessage(requestLocale, "checkinSuccess"),
      },
    });
  } catch (error) {
    console.error("自助签到失败:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "checkinFailed") },
      { status: 500 }
    );
  }
}
