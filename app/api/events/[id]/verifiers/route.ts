import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 管理活动验证人员分配
 *
 * GET    /api/events/[id]/verifiers         - 获取该活动的验证人员列表
 * POST   /api/events/[id]/verifiers         - 分配验证人员到活动
 * DELETE /api/events/[id]/verifiers         - 移除验证人员
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

    const verifiers = await prisma.eventVerifier.findMany({
      where: { eventId: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
          },
        },
      },
      orderBy: { userId: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: verifiers.map((v) => ({
        userId: v.userId,
        eventId: v.eventId,
        assignedAt: v.createdAt,
        user: v.user,
      })),
    });
  } catch (error) {
    console.error("获取验证人员列表失败:", error);
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

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!adminUser || !["ADMIN", "STAFF"].includes(adminUser.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    // Verify user exists and is a VERIFIER
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (targetUser.role !== "VERIFIER") {
      return NextResponse.json(
        { success: false, error: "User must have VERIFIER role" },
        { status: 400 }
      );
    }

    // Check if already assigned
    const existing = await prisma.eventVerifier.findUnique({
      where: { userId_eventId: { userId, eventId: params.id } },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Verifier already assigned to this event" },
        { status: 409 }
      );
    }

    await prisma.eventVerifier.create({
      data: {
        userId,
        eventId: params.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: { userId, eventId: params.id, userName: targetUser.name },
    });
  } catch (error) {
    console.error("分配验证人员失败:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!adminUser || !["ADMIN", "STAFF"].includes(adminUser.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    await prisma.eventVerifier.delete({
      where: { userId_eventId: { userId, eventId: params.id } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("移除验证人员失败:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
