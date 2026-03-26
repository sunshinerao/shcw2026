import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";
import { prisma } from "@/lib/prisma";

/**
 * 获取用户积分历史和交易记录
 * GET /api/users/[id]/points
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestLocale = resolveRequestLocale(req, new URL(req.url).searchParams.get("locale"));

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "unauthorized") },
        { status: 401 }
      );
    }

    const userId = params.id;

    // 用户只能查看自己的积分，管理员可以查看所有人的
    if (session.user.id !== userId && session.user.role !== "ADMIN" && session.user.role !== "STAFF") {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "pointsViewForbidden") },
        { status: 403 }
      );
    }

    // 获取用户积分和交易记录
    const [user, transactions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          points: true,
          climatePassportId: true,
          _count: {
            select: {
              registrations: {
                where: { status: "ATTENDED" },
              },
            },
          },
        },
      }),
      prisma.pointTransaction.findMany({
        where: { userId },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              startDate: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    if (!user) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "userNotFound") },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          points: user.points,
          climatePassportId: user.climatePassportId,
          attendedEvents: user._count.registrations,
        },
        transactions: transactions,
      },
    });
  } catch (error) {
    console.error("获取积分记录失败:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "pointsFetchFailed") },
      { status: 500 }
    );
  }
}

/**
 * 管理员调整用户积分
 * POST /api/users/[id]/points
 * 
 * 请求体:
 * {
 *   points: number,      // 正数为增加，负数为减少
 *   description: string, // 调整原因
 *   type: "MANUAL_ADD" | "MANUAL_DEDUCT" | "BONUS"
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let requestLocale = resolveRequestLocale(req);

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "unauthorized") },
        { status: 401 }
      );
    }

    // 只有管理员可以调整积分
    if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "checkinForbidden") },
        { status: 403 }
      );
    }

    const userId = params.id;
    const body = await req.json();
    requestLocale = resolveRequestLocale(req, body.locale);
    const { points, description, type = "MANUAL_ADD" } = body;

    // 验证参数
    if (typeof points !== "number" || points === 0) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "pointsInvalidValue") },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "pointsReasonRequired") },
        { status: 400 }
      );
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "userNotFound") },
        { status: 404 }
      );
    }

    // 检查积分是否足够（如果是扣除）
    if (points < 0 && user.points + points < 0) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "pointsInsufficient") },
        { status: 400 }
      );
    }

    // 执行积分调整（事务）
    const result = await prisma.$transaction(async (tx) => {
      // 1. 更新用户积分
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          points: {
            increment: points,
          },
        },
        select: {
          id: true,
          name: true,
          points: true,
        },
      });

      // 2. 创建积分交易记录
      const transaction = await tx.pointTransaction.create({
        data: {
          userId,
          points,
          type,
          description,
          createdBy: session.user.id,
        },
      });

      return { user: updatedUser, transaction };
    });

    return NextResponse.json({
      success: true,
      data: result,
      message:
        points > 0
          ? requestLocale === "en"
            ? `Added ${points} points successfully.`
            : `成功增加 ${points} 积分`
          : requestLocale === "en"
            ? `Deducted ${Math.abs(points)} points successfully.`
            : `成功扣除 ${Math.abs(points)} 积分`,
    });
  } catch (error) {
    console.error("调整积分失败:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "pointsAdjustFailed") },
      { status: 500 }
    );
  }
}
