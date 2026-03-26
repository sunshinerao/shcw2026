import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiMessage, resolveRequestLocale, type ApiLocale } from "@/lib/api-i18n";

async function requireAdmin(locale: ApiLocale) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ success: false, error: apiMessage(locale, "unauthorized") }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, name: true },
  });
  if (!user || !["ADMIN", "STAFF"].includes(user.role)) {
    return { error: NextResponse.json({ success: false, error: apiMessage(locale, "adminOnly") }, { status: 403 }) };
  }
  return { user };
}

// GET /api/contact/admin — list all contact messages (admin only)
export async function GET(req: NextRequest) {
  const locale = resolveRequestLocale(req);
  const { user, error } = await requireAdmin(locale);
  if (error) return error;

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "20")));
  const status = url.searchParams.get("status") || undefined;
  const category = url.searchParams.get("category") || undefined;
  const search = url.searchParams.get("search") || undefined;

  const where: Record<string, unknown> = {};
  if (status && ["PENDING", "REPLIED", "CLOSED"].includes(status)) {
    where.status = status;
  }
  if (category) {
    where.category = category;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { subject: { contains: search, mode: "insensitive" } },
    ];
  }

  const [messages, total] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.contactMessage.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: messages,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

// PUT /api/contact/admin — reply to or update a message (admin only)
export async function PUT(req: NextRequest) {
  const locale = resolveRequestLocale(req);
  const { user, error } = await requireAdmin(locale);
  if (error) return error;

  try {
    const body = await req.json();
    const { id, adminReply, adminNotes, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: apiMessage(locale, "contactMissingId") }, { status: 400 });
    }

    const existing = await prisma.contactMessage.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: apiMessage(locale, "contactNotFound") }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (adminReply !== undefined) {
      updateData.adminReply = adminReply;
      updateData.status = "REPLIED";
      updateData.repliedAt = new Date();
      updateData.repliedBy = user!.id;
    }

    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    if (status && ["PENDING", "REPLIED", "CLOSED"].includes(status)) {
      updateData.status = status;
    }

    const updated = await prisma.contactMessage.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("Update contact message error:", err);
    return NextResponse.json(
      { success: false, error: apiMessage(locale, "contactFailed") },
      { status: 500 }
    );
  }
}
