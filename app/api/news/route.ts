import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/news — Public: list published news. Admin: list all.
 * POST /api/news — Admin only: create news.
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10)));
    const published = searchParams.get("published");

    const session = await getServerSession(authOptions);
    let isAdmin = false;
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });
      isAdmin = user?.role === "ADMIN";
    }

    const where: any = {};
    if (!isAdmin) {
      where.isPublished = true;
    } else if (published === "true") {
      where.isPublished = true;
    } else if (published === "false") {
      where.isPublished = false;
    }

    const [news, total] = await Promise.all([
      prisma.news.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.news.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: { news, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } },
    });
  } catch (error) {
    console.error("Get news error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch news" }, { status: 500 });
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
      select: { role: true },
    });
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { title, titleEn, slug, excerpt, excerptEn, content, contentEn, coverImage, isPublished } = body;

    if (!title || !slug || !content) {
      return NextResponse.json({ success: false, error: "Title, slug, and content are required" }, { status: 400 });
    }

    // Check slug uniqueness
    const existing = await prisma.news.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ success: false, error: "Slug already exists" }, { status: 400 });
    }

    const news = await prisma.news.create({
      data: {
        title,
        titleEn: titleEn || null,
        slug,
        excerpt: excerpt || null,
        excerptEn: excerptEn || null,
        content,
        contentEn: contentEn || null,
        coverImage: coverImage || null,
        isPublished: Boolean(isPublished),
        publishedAt: isPublished ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true, data: news }, { status: 201 });
  } catch (error) {
    console.error("Create news error:", error);
    return NextResponse.json({ success: false, error: "Failed to create news" }, { status: 500 });
  }
}
