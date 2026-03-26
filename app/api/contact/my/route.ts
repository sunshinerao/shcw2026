import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";

// GET /api/contact/my — list own messages (logged-in user)
export async function GET(req: NextRequest) {
  const locale = resolveRequestLocale(req);
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: apiMessage(locale, "unauthorized") },
      { status: 401 }
    );
  }

  try {
    // Find messages by userId OR by email (to include messages sent before registration)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: apiMessage(locale, "userNotFound") },
        { status: 404 }
      );
    }

    const messages = await prisma.contactMessage.findMany({
      where: {
        OR: [
          { userId: user.id },
          { email: user.email },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        organization: true,
        category: true,
        subject: true,
        message: true,
        status: true,
        adminReply: true,
        repliedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: messages });
  } catch (err) {
    console.error("Fetch own messages error:", err);
    return NextResponse.json(
      { success: false, error: apiMessage(locale, "contactFailed") },
      { status: 500 }
    );
  }
}
