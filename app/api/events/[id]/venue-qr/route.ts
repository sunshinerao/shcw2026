import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

/**
 * 管理活动现场签到二维码密钥
 * 
 * GET  /api/events/[id]/venue-qr  - 获取当前 venueCheckinSecret
 * POST /api/events/[id]/venue-qr  - 生成/重新生成 venueCheckinSecret
 * 
 * 权限: ADMIN, STAFF
 */

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !["ADMIN", "STAFF"].includes(user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        titleEn: true,
        venueCheckinSecret: true,
      },
    });

    if (!event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        eventId: event.id,
        title: event.title,
        titleEn: event.titleEn,
        venueCheckinSecret: event.venueCheckinSecret,
        hasSecret: !!event.venueCheckinSecret,
      },
    });
  } catch (error) {
    console.error("获取现场二维码密钥失败:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !["ADMIN", "STAFF"].includes(user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    // Generate a cryptographically random secret
    const secret = randomBytes(16).toString("hex");

    const updated = await prisma.event.update({
      where: { id: params.id },
      data: { venueCheckinSecret: secret },
      select: {
        id: true,
        title: true,
        titleEn: true,
        venueCheckinSecret: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        eventId: updated.id,
        title: updated.title,
        titleEn: updated.titleEn,
        venueCheckinSecret: updated.venueCheckinSecret,
      },
    });
  } catch (error) {
    console.error("生成现场二维码密钥失败:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
