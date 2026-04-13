import { NextRequest, NextResponse } from "next/server";
import { AccessType, KnowledgeAssetType, Prisma, PublishStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireInsightAdmin } from "@/lib/insight-auth";
import { translateMissingInsightFieldsToEnglish } from "@/lib/ai-translation";

const INSIGHT_INCLUDE = {
  events: { include: { event: { select: { id: true, title: true, titleEn: true } } } },
  institutions: { include: { institution: { select: { id: true, name: true, nameEn: true, slug: true } } } },
  speakers: { include: { speaker: { select: { id: true, name: true, nameEn: true } } } },
  tracks: { include: { track: { select: { id: true, name: true, nameEn: true } } } },
};

export async function GET(req: NextRequest) {
  try {
    const admin = await requireInsightAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(50, Math.max(1, Number.parseInt(searchParams.get("pageSize") || "20", 10)));

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { titleEn: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }
    if (type && Object.values(KnowledgeAssetType).includes(type as KnowledgeAssetType)) {
      where.type = type as KnowledgeAssetType;
    }
    if (status && Object.values(PublishStatus).includes(status as PublishStatus)) {
      where.status = status as PublishStatus;
    }

    const [items, total] = await Promise.all([
      prisma.knowledgeAsset.findMany({
        where,
        include: INSIGHT_INCLUDE,
        orderBy: [{ sortOrder: "asc" }, { publishDate: "desc" }, { createdAt: "desc" }],
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
    console.error("Get insights error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch insights" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireInsightAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

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
      chapters,
      chaptersEn,
      recommendations,
      recommendationsEn,
      tags,
      tagsEn,
      author,
      pullQuote,
      pullQuoteEn,
      pullQuoteCaption,
      pullQuoteCaptionEn,
      aboutUs,
      aboutUsEn,
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
      primaryTemplateId,
      webTemplateId,
      relatedEventIds,
      relatedInstitutionIds,
      relatedSpeakerIds,
      relatedTrackIds,
    } = body;

    const normalizedTitle = title?.trim();
    const normalizedSlug = slug?.trim();
    const normalizedSubtitle = subtitle?.trim() || normalizedTitle;
    const normalizedSummary = summary?.trim() || null;
    const normalizedContent = typeof content === "string" ? content : null;

    if (!normalizedTitle || !normalizedSlug) {
      return NextResponse.json({ success: false, error: "title and slug are required" }, { status: 400 });
    }

    const existing = await prisma.knowledgeAsset.findUnique({ where: { slug: normalizedSlug } });
    if (existing) {
      return NextResponse.json({ success: false, error: "slug already exists" }, { status: 409 });
    }

    const titleEnInput = titleEn?.trim() || "";
    const subtitleEnInput = subtitleEn?.trim() || "";
    const summaryEnInput = summaryEn?.trim() || "";
    const contentEnInput = typeof contentEn === "string" ? contentEn : "";

    let translated = {
      titleEn: "",
      subtitleEn: "",
      summaryEn: "",
      contentEn: "",
    };

    if (!titleEnInput || !subtitleEnInput || !summaryEnInput || !contentEnInput) {
      const aiTranslated = await translateMissingInsightFieldsToEnglish({
        title: normalizedTitle,
        subtitle: normalizedSubtitle,
        summary: normalizedSummary,
        content: normalizedContent,
      });
      translated = {
        titleEn: aiTranslated.titleEn || "",
        subtitleEn: aiTranslated.subtitleEn || "",
        summaryEn: aiTranslated.summaryEn || "",
        contentEn: aiTranslated.contentEn || "",
      };
    }

    const finalTitleEn = titleEnInput || translated.titleEn || normalizedTitle;
    const finalSubtitleEn = subtitleEnInput || translated.subtitleEn || normalizedSubtitle || null;
    const finalSummaryEn = summaryEnInput || translated.summaryEn || normalizedSummary;
    const finalContentEn = contentEnInput || translated.contentEn || normalizedContent;
    const finalPublishDate = publishDate ? new Date(publishDate) : new Date();

    const created = await prisma.knowledgeAsset.create({
      data: {
        title: normalizedTitle,
        titleEn: finalTitleEn || null,
        subtitle: normalizedSubtitle || null,
        subtitleEn: finalSubtitleEn,
        slug: normalizedSlug,
        type: (Object.values(KnowledgeAssetType).includes(type) ? type : KnowledgeAssetType.REPORT) as KnowledgeAssetType,
        language: language?.trim() || "zh",
        coverImage: coverImage?.trim() || null,
        publishDate: finalPublishDate,
        summary: normalizedSummary,
        summaryEn: finalSummaryEn || null,
        content: normalizedContent,
        contentEn: finalContentEn || null,
        keyPoints: Array.isArray(keyPoints) ? keyPoints : Prisma.JsonNull,
        keyPointsEn: Array.isArray(keyPointsEn) ? keyPointsEn : Prisma.JsonNull,
        references: Array.isArray(references) ? references : Prisma.JsonNull,
        chapters: Array.isArray(chapters) ? chapters : Prisma.JsonNull,
        chaptersEn: Array.isArray(chaptersEn) ? chaptersEn : Prisma.JsonNull,
        recommendations: recommendations?.trim() || null,
        recommendationsEn: recommendationsEn?.trim() || null,
        tags: tags?.trim() || null,
        tagsEn: tagsEn?.trim() || null,
        author: author?.trim() || null,
        pullQuote: pullQuote?.trim() || null,
        pullQuoteEn: pullQuoteEn?.trim() || null,
        pullQuoteCaption: pullQuoteCaption?.trim() || null,
        pullQuoteCaptionEn: pullQuoteCaptionEn?.trim() || null,
        aboutUs: aboutUs?.trim() || null,
        aboutUsEn: aboutUsEn?.trim() || null,
        fileUrl: fileUrl?.trim() || null,
        fileFormat: fileFormat?.trim() || null,
        fileSize: typeof fileSize === "number" ? fileSize : null,
        accessType: (Object.values(AccessType).includes(accessType) ? accessType : AccessType.PUBLIC) as AccessType,
        price: price !== undefined && price !== null && `${price}` !== "" ? Number(price) : null,
        currency: currency?.trim() || "CNY",
        downloadEnabled: typeof downloadEnabled === "boolean" ? downloadEnabled : true,
        previewEnabled: typeof previewEnabled === "boolean" ? previewEnabled : true,
        previewPages: typeof previewPages === "number" ? previewPages : null,
        watermark: typeof watermark === "boolean" ? watermark : false,
        doi: doi?.trim() || null,
        citation: citation?.trim() || null,
        isFeatured: Boolean(isFeatured),
        isHighlight: Boolean(isHighlight),
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
        status: (Object.values(PublishStatus).includes(status) ? status : PublishStatus.PUBLISHED) as PublishStatus,
        primaryTemplateId: primaryTemplateId?.trim() || null,
        webTemplateId: webTemplateId?.trim() || null,
        events: Array.isArray(relatedEventIds) && relatedEventIds.length
          ? { createMany: { data: relatedEventIds.map((eventId: string) => ({ eventId })) } }
          : undefined,
        institutions: Array.isArray(relatedInstitutionIds) && relatedInstitutionIds.length
          ? { createMany: { data: relatedInstitutionIds.map((institutionId: string) => ({ institutionId })) } }
          : undefined,
        speakers: Array.isArray(relatedSpeakerIds) && relatedSpeakerIds.length
          ? { createMany: { data: relatedSpeakerIds.map((speakerId: string) => ({ speakerId })) } }
          : undefined,
        tracks: Array.isArray(relatedTrackIds) && relatedTrackIds.length
          ? { createMany: { data: relatedTrackIds.map((trackId: string) => ({ trackId })) } }
          : undefined,
      },
      include: INSIGHT_INCLUDE,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("Create insight error:", error);
    return NextResponse.json({ success: false, error: "Failed to create insight" }, { status: 500 });
  }
}
