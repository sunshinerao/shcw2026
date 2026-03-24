import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";

// POST: 验证 token 并重置密码
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password, locale } = body;
    const requestLocale = resolveRequestLocale(req, locale);

    // 验证必填字段
    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "resetTokenRequired"), message: apiMessage(requestLocale, "resetTokenRequired") },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "newPasswordRequired"), message: apiMessage(requestLocale, "newPasswordRequired") },
        { status: 400 }
      );
    }

    // 验证密码长度
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "passwordMin"), message: apiMessage(requestLocale, "passwordMin") },
        { status: 400 }
      );
    }

    // 查找具有该 token 且 token 未过期的用户
    const user = await prisma.user.findUnique({
      where: { resetToken: token },
      select: {
        id: true,
        resetToken: true,
        resetTokenExpiry: true,
      },
    });

    // 如果没有找到用户或 token 已过期
    if (!user || !user.resetTokenExpiry) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "resetLinkInvalid"), message: apiMessage(requestLocale, "resetLinkInvalid") },
        { status: 404 }
      );
    }

    // 检查 token 是否过期
    if (new Date() > user.resetTokenExpiry) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "resetLinkExpiredRequest"), message: apiMessage(requestLocale, "resetLinkExpiredRequest") },
        { status: 410 }
      );
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(password, 12);

    // 更新用户密码并清除重置 token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: apiMessage(requestLocale, "resetSuccess"),
    });
  } catch (error) {
    console.error("Reset password error:", error);
    const requestLocale = resolveRequestLocale(req);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "resetFailed"), message: apiMessage(requestLocale, "resetFailed") },
      { status: 500 }
    );
  }
}

// GET: 验证重置 token 是否有效（可选，用于前端验证链接有效性）
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const requestLocale = resolveRequestLocale(req, searchParams.get("locale"));

    if (!token) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "resetTokenMissing"), message: apiMessage(requestLocale, "resetTokenMissing") },
        { status: 400 }
      );
    }

    // 查找具有该 token 的用户
    const user = await prisma.user.findUnique({
      where: { resetToken: token },
      select: {
        id: true,
        resetTokenExpiry: true,
      },
    });

    // 如果没有找到用户或 token 已过期
    if (!user || !user.resetTokenExpiry) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "resetLinkInvalid"), message: apiMessage(requestLocale, "resetLinkInvalid") },
        { status: 404 }
      );
    }

    // 检查 token 是否过期
    if (new Date() > user.resetTokenExpiry) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "resetLinkExpired"), message: apiMessage(requestLocale, "resetLinkExpired") },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      message: apiMessage(requestLocale, "resetLinkValid"),
      data: { valid: true },
    });
  } catch (error) {
    console.error("Validate reset token error:", error);
    const requestLocale = resolveRequestLocale(req);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "resetValidateFailed"), message: apiMessage(requestLocale, "resetValidateFailed") },
      { status: 500 }
    );
  }
}
