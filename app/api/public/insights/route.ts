import { NextRequest, NextResponse } from "next/server";
import { AccessType, KnowledgeAssetType, PublishStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(30, Math.max(1, Number.parseInt(searchParams.get("pageSize") || "12", 10)));
    const type = searchParams.get("type");
    const year = searchParams.get("year");
    const trackId = searchParams.get("trackId");
    const institutionId = searchParams.get("institutionId");
    const freeOnly = searchParams.get("freeOnly") === "true";
    const relatedEventId = searchParams.get("relatedEventId");

    const where: any = {
      status: PublishStatus.PUBLISHED,
      accessType: { not: AccessType.HIDDEN },
    };

    if (type && Object.values(KnowledgeAssetType).includes(type as KnowledgeAssetType)) where.type = type;
    if (freeOnly) {
      where.OR = [
        { accessType: AccessType.PUBLIC },
        { accessType: AccessType.LOGIN_REQUIRED },
      ];
    }
    if (year) {
      const y = Number.parseInt(year, 10);
      if (!Number.isNaN(y)) {
        where.publishDate = {
          gte: new Date(`${y}-01-01T00:00:00.000Z`),
          lt: new Date(`${y + 1}-01-01T00:00:00.000Z`),
        };
      }
    }
    if (trackId) {
      where.tracks = { some: { trackId } };
    }
    if (institutionId) {
      where.institutions = { some: { institutionId } };
    }
    if (relatedEventId) {
      where.events = { some: { eventId: relatedEventId } };
    }

    const [items, total] = await Promise.all([
      prisma.knowledgeAsset.findMany({
        where,
        orderBy: [{ isFeatured: "desc" }, { isHighlight: "desc" }, { publishDate: "desc" }, { sortOrder: "asc" }],
        include: {
          events: { include: { event: { select: { id: true, title: true, titleEn: true } } } },
          institutions: { include: { institution: { select: { id: true, slug: true, name: true, nameEn: true } } } },
          tracks: { include: { track: { select: { id: true, name: true, nameEn: true } } } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.knowledgeAsset.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: { items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } },
    });
  } catch (error) {
    console.error("Public insight list error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch insights" }, { status: 500 });
  }
}
