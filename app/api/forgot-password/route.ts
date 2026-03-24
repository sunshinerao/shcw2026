import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, locale } = body;
    const requestLocale = resolveRequestLocale(req, locale);

    // 验证邮箱格式
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "invalidEmailRequired") },
        { status: 400 }
      );
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // 无论邮箱是否存在，都返回相同消息以保护隐私
    // 如果用户不存在，直接返回成功消息
    if (!user) {
      return NextResponse.json({
        success: true,
        message: apiMessage(requestLocale, "forgotEmailSent"),
      });
    }

    // 生成高熵重置 token
    const resetToken = randomBytes(32).toString("hex");

    // 设置过期时间为 1 小时后
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // 保存 token 到用户记录
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    const mailSent = await sendPasswordResetEmail({
      to: user.email,
      recipientName: user.name,
      resetToken,
      locale,
    });

    if (!mailSent) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "mailUnavailable") },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      message: apiMessage(requestLocale, "forgotEmailSent"),
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    const requestLocale = resolveRequestLocale(req);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "forgotFailed") },
      { status: 500 }
    );
  }
}
