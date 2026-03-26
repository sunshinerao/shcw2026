import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import QRCode from "qrcode";
import { authOptions } from "@/lib/auth";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";
import { EVENT_PASS_QR_TTL_MS, getEventPassState } from "@/lib/climate-passport";
import { prisma } from "@/lib/prisma";

/**
 * 生成用户通行证二维码
 * GET /api/qrcode?type=passport|event&eventId=xxx
 * 
 * type=passport: 生成气候护照二维码（包含用户ID和passCode）
 * type=event: 生成活动通行证二维码（包含用户ID、eventId和registrationId）
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

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "passport";
    const eventId = searchParams.get("eventId");

    let qrData: string;
    
    if (type === "passport") {
      // 生成气候护照二维码
      // 包含可读信息：护照ID、姓名、有效状态（不含敏感信息）
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          name: true,
          passCode: true,
          climatePassportId: true,
          organization: { select: { name: true } },
        },
      });
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "userNotFound") },
          { status: 404 }
        );
      }

      const passportId = user.climatePassportId || "PENDING";
      
      // 格式: SCW2026://PASSPORT/{userId}/{passCode}
      // 此格式与 checkin API 解析格式一致
      qrData = `SCW2026://PASSPORT/${session.user.id}/${user.passCode}`;
    } else if (type === "event") {
      // 生成活动通行证二维码
      if (!eventId) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "qrMissingEventId") },
          { status: 400 }
        );
      }
      
      // 检查用户是否已报名该活动
      const registration = await prisma.registration.findUnique({
        where: {
          userId_eventId: {
            userId: session.user.id,
            eventId: eventId,
          },
        },
        include: {
          event: {
            select: { title: true, startDate: true, startTime: true, endTime: true },
          },
        },
      });
      
      if (!registration) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "qrEventNotRegistered") },
          { status: 403 }
        );
      }
      
      if (registration.status === "CANCELLED") {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "qrRegistrationCancelled") },
          { status: 403 }
        );
      }

      const passState = getEventPassState({
        startDate: registration.event.startDate,
        startTime: registration.event.startTime,
        endTime: registration.event.endTime,
        checkedInAt: registration.checkedInAt,
      });

      if (passState === "checkedIn") {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "qrAlreadyUsed") },
          { status: 403 }
        );
      }

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
      
      // 格式: SCW2026://EVENT/{eventId}/{userId}/{registrationId}/{timestamp}
      const timestamp = Date.now();
      qrData = `SCW2026://EVENT/${eventId}/${session.user.id}/${registration.id}/${timestamp}`;
    } else {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "qrUnsupportedType") },
        { status: 400 }
      );
    }

    // 生成二维码图片 (SVG格式，更高清)
    const qrCodeSvg = await QRCode.toString(qrData, {
      type: "svg",
      width: 400,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        qrCode: qrCodeSvg,
        type: type,
        expiresInMs: type === "event" ? EVENT_PASS_QR_TTL_MS : null,
      },
    });
  } catch (error) {
    console.error("生成二维码失败:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "qrGenerateFailed") },
      { status: 500 }
    );
  }
}
