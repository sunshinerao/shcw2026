import { NextRequest, NextResponse } from "next/server";
import { AccessType, KnowledgeAssetType, PublishStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/openclaw-auth";

/**
 * GET /api/v1/insights — list knowledge assets
 * POST /api/v1/insights — create knowledge asset
 */

export async function GET(req: NextRequest) {
  const auth = await verifyApiKey(req, "insights:read");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const accessType = searchParams.get("accessType");
  const search = searchParams.get("search")?.trim();
  const includeRelations = searchParams.get("includeRelations") !== "false";

  const where: any = {};

  if (type && Object.values(KnowledgeAssetType).includes(type as KnowledgeAssetType)) {
    where.type = type as KnowledgeAssetType;
  }
  if (status && Object.values(PublishStatus).includes(status as PublishStatus)) {
    where.status = status as PublishStatus;
  }
  if (accessType && Object.values(AccessType).includes(accessType as AccessType)) {
    where.accessType = accessType as AccessType;
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { titleEn: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.knowledgeAsset.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { publishDate: "desc" }, { createdAt: "desc" }],
      include: includeRelations
        ? {
            events: { include: { event: { select: { id: true, title: true, titleEn: true } } } },
            institutions: { include: { institution: { select: { id: true, slug: true, name: true, nameEn: true } } } },
            speakers: { include: { speaker: { select: { id: true, name: true, nameEn: true } } } },
            tracks: { include: { track: { select: { id: true, name: true, nameEn: true } } } },
          }
        : undefined,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.knowledgeAsset.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

export async function POST(req: NextRequest) {
  const auth = await verifyApiKey(req, "insights:write");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const body = await req.json();
  const {
    title,
    titleEn,
    subtitle,
    subtitleEn,
    slug,
    type,
    language,
    coverImage,
    publishDate,
    summary,
    summaryEn,
    content,
    contentEn,
    keyPoints,
    keyPointsEn,
    references,
    fileUrl,
    fileFormat,
    fileSize,
    accessType,
    price,
    currency,
    downloadEnabled,
    previewEnabled,
    previewPages,
    watermark,
    doi,
    citation,
    isFeatured,
    isHighlight,
    sortOrder,
    status,
    relatedEventIds,
    relatedInstitutionIds,
    relatedSpeakerIds,
    relatedTrackIds,
  } = body;

  if (!title?.trim()) return NextResponse.json({ success: false, error: "title is required" }, { status: 400 });
  if (!slug?.trim()) return NextResponse.json({ success: false, error: "slug is required" }, { status: 400 });

  const duplicate = await prisma.knowledgeAsset.findUnique({ where: { slug: slug.trim() }, select: { id: true } });
  if (duplicate) {
    return NextResponse.json({ success: false, error: `slug '${slug.trim()}' already exists` }, { status: 409 });
  }

  const created = await prisma.knowledgeAsset.create({
    data: {
      title: title.trim(),
      titleEn: typeof titleEn === "string" ? titleEn.trim() || null : null,
      subtitle: typeof subtitle === "string" ? subtitle.trim() || null : null,
      subtitleEn: typeof subtitleEn === "string" ? subtitleEn.trim() || null : null,
      slug: slug.trim(),
      type: Object.values(KnowledgeAssetType).includes(type) ? type : KnowledgeAssetType.REPORT,
      language: typeof language === "string" && language.trim() ? language.trim() : "zh",
      coverImage: typeof coverImage === "string" ? coverImage.trim() || null : null,
      publishDate: publishDate ? new Date(publishDate) : null,
      summary: typeof summary === "string" ? summary : null,
      summaryEn: typeof summaryEn === "string" ? summaryEn : null,
      content: typeof content === "string" ? content : null,
      contentEn: typeof contentEn === "string" ? contentEn : null,
      keyPoints: Array.isArray(keyPoints) ? keyPoints : undefined,
      keyPointsEn: Array.isArray(keyPointsEn) ? keyPointsEn : undefined,
      references: Array.isArray(references) ? references : undefined,
      fileUrl: typeof fileUrl === "string" ? fileUrl.trim() || null : null,
      fileFormat: typeof fileFormat === "string" ? fileFormat.trim() || null : null,
      fileSize: typeof fileSize === "number" ? fileSize : null,
      accessType: Object.values(AccessType).includes(accessType) ? accessType : AccessType.PUBLIC,
      price: price !== undefined && price !== null && `${price}` !== "" ? Number(price) : null,
      currency: typeof currency === "string" && currency.trim() ? currency.trim() : "CNY",
      downloadEnabled: typeof downloadEnabled === "boolean" ? downloadEnabled : true,
      previewEnabled: typeof previewEnabled === "boolean" ? previewEnabled : true,
      previewPages: typeof previewPages === "number" ? previewPages : null,
      watermark: typeof watermark === "boolean" ? watermark : false,
      doi: typeof doi === "string" ? doi.trim() || null : null,
      citation: typeof citation === "string" ? citation : null,
      isFeatured: Boolean(isFeatured),
      isHighlight: Boolean(isHighlight),
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      status: Object.values(PublishStatus).includes(status) ? status : PublishStatus.DRAFT,
      events: Array.isArray(relatedEventIds) && relatedEventIds.length > 0 ? { createMany: { data: relatedEventIds.map((eventId: string) => ({ eventId })) } } : undefined,
      institutions: Array.isArray(relatedInstitutionIds) && relatedInstitutionIds.length > 0 ? { createMany: { data: relatedInstitutionIds.map((institutionId: string) => ({ institutionId })) } } : undefined,
      speakers: Array.isArray(relatedSpeakerIds) && relatedSpeakerIds.length > 0 ? { createMany: { data: relatedSpeakerIds.map((speakerId: string) => ({ speakerId })) } } : undefined,
      tracks: Array.isArray(relatedTrackIds) && relatedTrackIds.length > 0 ? { createMany: { data: relatedTrackIds.map((trackId: string) => ({ trackId })) } } : undefined,
    },
    include: {
      events: { include: { event: { select: { id: true, title: true, titleEn: true } } } },
      institutions: { include: { institution: { select: { id: true, slug: true, name: true, nameEn: true } } } },
      speakers: { include: { speaker: { select: { id: true, name: true, nameEn: true } } } },
      tracks: { include: { track: { select: { id: true, name: true, nameEn: true } } } },
    },
  });

  return NextResponse.json({ success: true, data: created, message: "Insight created" }, { status: 201 });
}
