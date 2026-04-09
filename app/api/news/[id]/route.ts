import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { canManageNews } from "@/lib/permissions";

/**
 * GET /api/news/[id] — Public: get single news by id (or slug).
 * PUT /api/news/[id] — Admin only: update news.
 * DELETE /api/news/[id] — Admin only: delete news.
 */

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, staffPermissions: true },
  });
  return user && canManageNews(user.role, user.staffPermissions) ? user : null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const news = await prisma.news.findFirst({
      where: {
        OR: [{ id: params.id }, { slug: params.id }],
      },
    });

    if (!news) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    // Non-admin can only see published
    if (!news.isPublished) {
      const admin = await requireAdmin();
      if (!admin) {
        return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
      }
    }

    // Increment views for published articles
    if (news.isPublished) {
      await prisma.news.update({
        where: { id: news.id },
        data: { views: { increment: 1 } },
      });
    }

    return NextResponse.json({ success: true, data: news });
  } catch (error) {
    console.error("Get news error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch news" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.news.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const { title, titleEn, slug, excerpt, excerptEn, content, contentEn, coverImage, isPublished } = body;

    // Check slug uniqueness if changed
    if (slug && slug !== existing.slug) {
      const slugExists = await prisma.news.findUnique({ where: { slug } });
      if (slugExists) {
        return NextResponse.json({ success: false, error: "Slug already exists" }, { status: 400 });
      }
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (titleEn !== undefined) updateData.titleEn = titleEn || null;
    if (slug !== undefined) updateData.slug = slug;
    if (excerpt !== undefined) updateData.excerpt = excerpt || null;
    if (excerptEn !== undefined) updateData.excerptEn = excerptEn || null;
    if (content !== undefined) updateData.content = content;
    if (contentEn !== undefined) updateData.contentEn = contentEn || null;
    if (coverImage !== undefined) updateData.coverImage = coverImage || null;
    if (isPublished !== undefined) {
      updateData.isPublished = Boolean(isPublished);
      if (isPublished && !existing.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    const news = await prisma.news.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: news });
  } catch (error) {
    console.error("Update news error:", error);
    return NextResponse.json({ success: false, error: "Failed to update news" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await prisma.news.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete news error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete news" }, { status: 500 });
  }
}
