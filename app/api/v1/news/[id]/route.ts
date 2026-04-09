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
 * GET /api/v1/news/[id] — get article by id or slug
 * PATCH /api/v1/news/[id] — update article
 * DELETE /api/v1/news/[id] — delete article
 */

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyApiKey(req, "news:read");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  // Support lookup by id or slug
  const article = await prisma.news.findFirst({
    where: { OR: [{ id: params.id }, { slug: params.id }] },
  });
  if (!article) return NextResponse.json({ success: false, error: "News article not found" }, { status: 404 });

  return NextResponse.json({ success: true, data: article });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyApiKey(req, "news:write");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const existing = await prisma.news.findFirst({
    where: { OR: [{ id: params.id }, { slug: params.id }] },
    select: { id: true, isPublished: true, publishedAt: true },
  });
  if (!existing) return NextResponse.json({ success: false, error: "News article not found" }, { status: 404 });

  const body = await req.json();
  const update: Record<string, unknown> = {};

  const stringFields = ["title", "titleEn", "excerpt", "excerptEn", "content", "contentEn", "coverImage"];
  for (const key of stringFields) {
    if (body[key] !== undefined) update[key] = normalizeText(body[key]);
  }

  // Slug change — check uniqueness
  if (body.slug !== undefined) {
    const newSlug = slugify(body.slug?.trim() || "");
    if (!newSlug) return NextResponse.json({ success: false, error: "Invalid slug" }, { status: 400 });
    const dup = await prisma.news.findUnique({ where: { slug: newSlug } });
    if (dup && dup.id !== existing.id) {
      return NextResponse.json(
        { success: false, error: `Slug "${newSlug}" is already used by another article (id: ${dup.id})` },
        { status: 409 }
      );
    }
    update.slug = newSlug;
  }

  // Publishing logic
  if (typeof body.isPublished === "boolean") {
    update.isPublished = body.isPublished;
    if (body.isPublished && !existing.publishedAt) {
      update.publishedAt = new Date();
    } else if (!body.isPublished) {
      update.publishedAt = null;
    }
  }

  const updated = await prisma.news.update({ where: { id: existing.id }, data: update });

  return NextResponse.json({ success: true, data: updated, message: "News article updated" });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyApiKey(req, "news:write");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const existing = await prisma.news.findFirst({
    where: { OR: [{ id: params.id }, { slug: params.id }] },
    select: { id: true, title: true },
  });
  if (!existing) return NextResponse.json({ success: false, error: "News article not found" }, { status: 404 });

  await prisma.news.delete({ where: { id: existing.id } });

  return NextResponse.json({ success: true, message: `News article "${existing.title}" deleted` });
}
