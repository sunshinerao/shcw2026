import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/site-content?key=about_us — Public: get a specific content block.
 * PUT /api/site-content — Admin only: upsert a content block.
 */

export async function GET(req: NextRequest) {
  try {
    const key = new URL(req.url).searchParams.get("key");
    if (!key) {
      return NextResponse.json({ success: false, error: "Key is required" }, { status: 400 });
    }

    if (key === "system_settings") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const content = await prisma.siteContent.findUnique({ where: { key } });

    return NextResponse.json({ success: true, data: content });
  } catch (error) {
    console.error("Get site content error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch content" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
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
    const { key, title, titleEn, subtitle, subtitleEn, description, descriptionEn, extra } = body;

    if (!key) {
      return NextResponse.json({ success: false, error: "Key is required" }, { status: 400 });
    }

    const content = await prisma.siteContent.upsert({
      where: { key },
      create: {
        key,
        title: title || null,
        titleEn: titleEn || null,
        subtitle: subtitle || null,
        subtitleEn: subtitleEn || null,
        description: description || null,
        descriptionEn: descriptionEn || null,
        extra: extra || null,
      },
      update: {
        title: title || null,
        titleEn: titleEn || null,
        subtitle: subtitle || null,
        subtitleEn: subtitleEn || null,
        description: description || null,
        descriptionEn: descriptionEn || null,
        extra: extra !== undefined ? extra : undefined,
      },
    });

    return NextResponse.json({ success: true, data: content });
  } catch (error) {
    console.error("Update site content error:", error);
    return NextResponse.json({ success: false, error: "Failed to save content" }, { status: 500 });
  }
}
