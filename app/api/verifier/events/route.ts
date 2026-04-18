import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 获取当前验证人员被分配的活动列表
 * GET /api/verifier/events
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // ADMIN/STAFF can verify any event - return all events
    if (user.role === "ADMIN" || user.role === "STAFF") {
      const events = await prisma.event.findMany({
        select: {
          id: true,
          title: true,
          titleEn: true,
          startDate: true,
          endDate: true,
          startTime: true,
          endTime: true,
          venue: true,
          type: true,
        },
        orderBy: { startDate: "asc" },
      });

      return NextResponse.json({ success: true, data: events });
    }

    // VERIFIER - return only assigned events
    if (user.role === "VERIFIER") {
      const assignments = await prisma.eventVerifier.findMany({
        where: { userId: session.user.id },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              titleEn: true,
              startDate: true,
              endDate: true,
              startTime: true,
              endTime: true,
              venue: true,
              type: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const events = assignments.map((a) => a.event);
      return NextResponse.json({ success: true, data: events });
    }

    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  } catch (error) {
    console.error("获取验证人员活动失败:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
