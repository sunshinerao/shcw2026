import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  id: string;
}

export async function GET(
  request: NextRequest,
  context: { params: Params }
) {
  try {
    const item = await prisma.faqItem.findUnique({ where: { id: context.params.id } });
    if (!item) {
      return NextResponse.json({ success: false, error: "FAQ not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error("[faqs/:id GET]", error);
    return NextResponse.json({ success: false, error: "Failed to fetch FAQ" }, { status: 500 });
  }
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    return { ok: false as const, response: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true as const };
}

export async function PUT(
  request: NextRequest,
  context: { params: Params }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return auth.response;
    }

    const existing = await prisma.faqItem.findUnique({ where: { id: context.params.id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "FAQ not found" }, { status: 404 });
    }

    const body = await request.json();
    const item = await prisma.faqItem.update({
      where: { id: context.params.id },
      data: {
        ...(body.category !== undefined && { category: body.category }),
        ...(body.categoryEn !== undefined && { categoryEn: body.categoryEn || null }),
        ...(body.question !== undefined && { question: body.question }),
        ...(body.questionEn !== undefined && { questionEn: body.questionEn || null }),
        ...(body.summary !== undefined && { summary: body.summary || null }),
        ...(body.summaryEn !== undefined && { summaryEn: body.summaryEn || null }),
        ...(body.answer !== undefined && { answer: body.answer }),
        ...(body.answerEn !== undefined && { answerEn: body.answerEn || null }),
        ...(body.attachmentUrl !== undefined && { attachmentUrl: body.attachmentUrl || null }),
        ...(body.attachmentName !== undefined && { attachmentName: body.attachmentName || null }),
        ...(body.isPinned !== undefined && { isPinned: Boolean(body.isPinned) }),
        ...(body.isPublished !== undefined && { isPublished: Boolean(body.isPublished) }),
        ...(body.sortOrder !== undefined && { sortOrder: Number.isFinite(body.sortOrder) ? body.sortOrder : 0 }),
      },
    });

    return NextResponse.json({ success: true, data: item, message: "FAQ updated successfully" });
  } catch (error) {
    console.error("[faqs/:id PUT]", error);
    return NextResponse.json({ success: false, error: "Failed to update FAQ" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Params }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return auth.response;
    }

    const existing = await prisma.faqItem.findUnique({ where: { id: context.params.id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "FAQ not found" }, { status: 404 });
    }

    await prisma.faqItem.delete({ where: { id: context.params.id } });
    return NextResponse.json({ success: true, message: "FAQ deleted successfully" });
  } catch (error) {
    console.error("[faqs/:id DELETE]", error);
    return NextResponse.json({ success: false, error: "Failed to delete FAQ" }, { status: 500 });
  }
}