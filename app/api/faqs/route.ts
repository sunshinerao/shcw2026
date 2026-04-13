import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageFaq } from "@/lib/permissions";

export const dynamic = "force-dynamic";

function parseBoolean(value: string | null) {
  return value === "true" ? true : value === "false" ? false : undefined;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const publishedOnly = parseBoolean(searchParams.get("publishedOnly"));
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.max(1, Math.min(50, Number.parseInt(limitParam, 10) || 0)) : undefined;

    // Determine if the caller can see unpublished items
    const session = await getServerSession(authOptions);
    let sessionUser = null;
    if (session?.user?.id) {
      sessionUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true, staffPermissions: true },
      });
    }
    const isManager = canManageFaq(sessionUser?.role, sessionUser?.staffPermissions);
    // Non-managers always see published items only
    const whereFilter = isManager
      ? publishedOnly !== undefined ? { isPublished: publishedOnly } : undefined
      : { isPublished: true };

    const items = await prisma.faqItem.findMany({
      where: whereFilter,
      orderBy: [
        { isPinned: "desc" },
        { sortOrder: "asc" },
        { updatedAt: "desc" },
      ],
      ...(limit ? { take: limit } : {}),
    });

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error("[faqs GET]", error);
    return NextResponse.json({ success: false, error: "Failed to fetch FAQs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, staffPermissions: true },
    });
    if (!canManageFaq(user?.role, user?.staffPermissions)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      category,
      categoryEn,
      question,
      questionEn,
      summary,
      summaryEn,
      answer,
      answerEn,
      attachmentUrl,
      attachmentName,
      isPinned,
      isPublished,
      sortOrder,
    } = body;

    if (!category || !question || !summary || !answer) {
      return NextResponse.json({ success: false, error: "Category, question, summary, and answer are required" }, { status: 400 });
    }

    const item = await prisma.faqItem.create({
      data: {
        category,
        categoryEn: categoryEn || null,
        question,
        questionEn: questionEn || null,
        summary,
        summaryEn: summaryEn || null,
        answer,
        answerEn: answerEn || null,
        attachmentUrl: attachmentUrl || null,
        attachmentName: attachmentName || null,
        isPinned: Boolean(isPinned),
        isPublished: isPublished ?? true,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      },
    });

    return NextResponse.json({ success: true, data: item, message: "FAQ created successfully" }, { status: 201 });
  } catch (error) {
    console.error("[faqs POST]", error);
    return NextResponse.json({ success: false, error: "Failed to create FAQ" }, { status: 500 });
  }
}