import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";
import { prisma } from "@/lib/prisma";

/**
 * 获取当前用户的报名和收藏活动
 * GET /api/user/registrations
 * 
 * 返回用户报名的活动和收藏的活动列表
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

    const userId = session.user.id;

    // 并行获取报名记录和收藏记录
    const [registrations, wishlist] = await Promise.all([
      // 获取用户的报名记录
      prisma.registration.findMany({
        where: {
          userId: userId,
          status: {
            not: "CANCELLED", // 排除已取消的报名
          },
        },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              titleEn: true,
              date: true,
              startTime: true,
              endTime: true,
              venue: true,
              type: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      
      // 获取用户的收藏记录
      prisma.wishlist.findMany({
        where: {
          userId: userId,
        },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              titleEn: true,
              date: true,
              startTime: true,
              endTime: true,
              venue: true,
              type: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    // 获取已报名活动的ID列表，用于过滤收藏列表
    const registeredEventIds = new Set(registrations.map(r => r.eventId));
    
    // 过滤收藏列表，排除已报名的活动
    const filteredWishlist = wishlist.filter(w => !registeredEventIds.has(w.eventId));

    return NextResponse.json({
      success: true,
      data: {
        registrations: registrations.map(r => ({
          id: r.id,
          status: r.status,
          notes: r.notes,
          dietaryReq: r.dietaryReq,
          checkedInAt: r.checkedInAt,
          checkedInBy: r.checkedInBy,
          pointsEarned: r.pointsEarned,
          createdAt: r.createdAt,
          event: r.event,
        })),
        wishlist: filteredWishlist.map(w => ({
          id: w.id,
          createdAt: w.createdAt,
          event: w.event,
        })),
      },
    });
  } catch (error) {
    console.error("获取用户活动记录失败:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "userActivitiesFetchFailed") },
      { status: 500 }
    );
  }
}

/**
 * 添加/取消收藏活动
 * POST /api/user/registrations
 * 
 * 请求体:
 * {
 *   action: "add_wishlist" | "remove_wishlist",
 *   eventId: string
 * }
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

    const userId = session.user.id;
    const body = await req.json();
    requestLocale = resolveRequestLocale(req, body.locale);
    const { action, eventId } = body;

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "eventIdRequired") },
        { status: 400 }
      );
    }

    if (action === "add_wishlist") {
      // 检查是否已经收藏
      const existing = await prisma.wishlist.findUnique({
        where: {
          userId_eventId: {
            userId: userId,
            eventId: eventId,
          },
        },
      });

      if (existing) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "wishlistAlreadyExists") },
          { status: 400 }
        );
      }

      // 创建收藏记录
      const wishlist = await prisma.wishlist.create({
        data: {
          userId: userId,
          eventId: eventId,
        },
      });

      return NextResponse.json({
        success: true,
        data: wishlist,
        message: apiMessage(requestLocale, "wishlistAddSuccess"),
      });
    } else if (action === "remove_wishlist") {
      // 删除收藏记录
      await prisma.wishlist.delete({
        where: {
          userId_eventId: {
            userId: userId,
            eventId: eventId,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: apiMessage(requestLocale, "wishlistRemoveSuccess"),
      });
    } else {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "unsupportedAction") },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("操作收藏失败:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "wishlistOperationFailed") },
      { status: 500 }
    );
  }
}
