import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

/**
 * 更新用户角色（仅管理员可操作）
 * PUT /api/users/[id]/role
 * 
 * 请求体:
 * {
 *   role: UserRole
 * }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let requestLocale = resolveRequestLocale(req);

  try {
    const session = await getServerSession(authOptions);

    // 检查登录状态
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "unauthorized") },
        { status: 401 }
      );
    }

    // 检查管理员权限
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "adminOnly") },
        { status: 403 }
      );
    }

    const userId = params.id;
    const body = await req.json();
    requestLocale = resolveRequestLocale(req, body.locale);
    const { role } = body;

    // 验证角色
    if (!role || !Object.values(UserRole).includes(role)) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "invalidRoleValue") },
        { status: 400 }
      );
    }

    // 不能修改自己的角色
    if (userId === session.user.id) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "roleSelfUpdateForbidden") },
        { status: 400 }
      );
    }

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "userNotFound") },
        { status: 404 }
      );
    }

    // 更新角色
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        climatePassportId: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: apiMessage(requestLocale, "roleUpdateSuccess"),
    });
  } catch (error) {
    console.error("更新用户角色失败:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "roleUpdateFailed") },
      { status: 500 }
    );
  }
}
