import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/openclaw-auth";

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s]+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * GET /api/v1/news — list news (published by default)
 * POST /api/v1/news — create news article
 */

export async function GET(req: NextRequest) {
  const auth = await verifyApiKey(req, "news:read");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
  const published = searchParams.get("published"); // "true" | "false" | "all"

  const where: Record<string, unknown> = {};
  if (published === "all") {
    // no filter
  } else if (published === "false") {
    where.isPublished = false;
  } else {
    where.isPublished = true;
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
    data: news,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

export async function POST(req: NextRequest) {
  const auth = await verifyApiKey(req, "news:write");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { title, titleEn, slug: rawSlug, excerpt, excerptEn, content, contentEn, coverImage, isPublished } = body;

  if (!title?.trim()) return NextResponse.json({ success: false, error: "title is required" }, { status: 400 });
  if (!content?.trim()) return NextResponse.json({ success: false, error: "content is required" }, { status: 400 });

  // Derive slug from title if not provided
  const resolvedSlug = rawSlug?.trim() || slugify(title.trim());
  if (!resolvedSlug) {
    return NextResponse.json({ success: false, error: "Could not derive a valid slug from title" }, { status: 400 });
  }

  // Duplicate slug check
  const existing = await prisma.news.findUnique({ where: { slug: resolvedSlug }, select: { id: true } });
  if (existing) {
    return NextResponse.json(
      { success: false, error: `A news article with slug "${resolvedSlug}" already exists (id: ${existing.id})` },
      { status: 409 }
    );
  }

  const published = isPublished === true;

  const article = await prisma.news.create({
    data: {
      title: title.trim(),
      titleEn: normalizeText(titleEn),
      slug: resolvedSlug,
      excerpt: normalizeText(excerpt),
      excerptEn: normalizeText(excerptEn),
      content: content.trim(),
      contentEn: normalizeText(contentEn),
      coverImage: normalizeText(coverImage),
      isPublished: published,
      publishedAt: published ? new Date() : null,
    },
  });

  return NextResponse.json({ success: true, data: article, message: "News article created" }, { status: 201 });
}
