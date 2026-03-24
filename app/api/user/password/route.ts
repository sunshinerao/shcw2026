import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";

// PUT: 修改密码（需要旧密码验证）
export async function PUT(req: NextRequest) {
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

    const { oldPassword, newPassword } = body;

    // 验证必填字段
    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "oldAndNewPasswordRequired") },
        { status: 400 }
      );
    }

    // 验证新密码长度
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "passwordMin") },
        { status: 400 }
      );
    }

    // 验证新旧密码不能相同
    if (oldPassword === newPassword) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "newPasswordCannotSame") },
        { status: 400 }
      );
    }

    // 查询用户（包含密码字段）
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "passwordUpdateUserMissing") },
        { status: 404 }
      );
    }

    // 验证旧密码
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "oldPasswordIncorrect") },
        { status: 400 }
      );
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 更新密码
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        password: hashedPassword,
      },
    });

    return NextResponse.json({
      success: true,
      message: apiMessage(requestLocale, "passwordChangeSuccess"),
    });
  } catch (error) {
    console.error("Change password error:", error);
    const requestLocale = resolveRequestLocale(req);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "passwordChangeFailed") },
      { status: 500 }
    );
  }
}
