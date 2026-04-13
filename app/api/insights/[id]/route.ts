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
  versions: { orderBy: { createdAt: "desc" as const } },
};

async function resolveAssetId(idOrSlug: string) {
  const existing = await prisma.knowledgeAsset.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { id: true },
  });
  return existing?.id || null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireInsightAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const id = await resolveAssetId(params.id);
    if (!id) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const item = await prisma.knowledgeAsset.findUnique({ where: { id }, include: INSIGHT_INCLUDE });
    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error("Get insight detail error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch insight" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireInsightAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const id = await resolveAssetId(params.id);
    if (!id) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const existingAsset = await prisma.knowledgeAsset.findUnique({
      where: { id },
      select: {
        title: true,
        subtitle: true,
        summary: true,
        content: true,
        titleEn: true,
        subtitleEn: true,
        summaryEn: true,
        contentEn: true,
      },
    });

    if (!existingAsset) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

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
      createVersion,
      versionLabel,
      versionChangeLog,
    } = body;

    if (slug !== undefined) {
      const duplicate = await prisma.knowledgeAsset.findFirst({
        where: { slug: slug.trim(), NOT: { id } },
        select: { id: true },
      });
      if (duplicate) {
        return NextResponse.json({ success: false, error: "slug already exists" }, { status: 409 });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (Array.isArray(relatedEventIds)) {
        await tx.knowledgeAssetEvent.deleteMany({ where: { knowledgeAssetId: id } });
        if (relatedEventIds.length) {
          await tx.knowledgeAssetEvent.createMany({
            data: relatedEventIds.map((eventId: string) => ({ knowledgeAssetId: id, eventId })),
          });
        }
      }

      if (Array.isArray(relatedInstitutionIds)) {
        await tx.knowledgeAssetInstitution.deleteMany({ where: { knowledgeAssetId: id } });
        if (relatedInstitutionIds.length) {
          await tx.knowledgeAssetInstitution.createMany({
            data: relatedInstitutionIds.map((institutionId: string) => ({ knowledgeAssetId: id, institutionId })),
          });
        }
      }

      if (Array.isArray(relatedSpeakerIds)) {
        await tx.knowledgeAssetSpeaker.deleteMany({ where: { knowledgeAssetId: id } });
        if (relatedSpeakerIds.length) {
          await tx.knowledgeAssetSpeaker.createMany({
            data: relatedSpeakerIds.map((speakerId: string) => ({ knowledgeAssetId: id, speakerId })),
          });
        }
      }

      if (Array.isArray(relatedTrackIds)) {
        await tx.knowledgeAssetTrack.deleteMany({ where: { knowledgeAssetId: id } });
        if (relatedTrackIds.length) {
          await tx.knowledgeAssetTrack.createMany({
            data: relatedTrackIds.map((trackId: string) => ({ knowledgeAssetId: id, trackId })),
          });
        }
      }

      const updateData: any = {};
      if (title !== undefined) updateData.title = title?.trim() || "";
      if (titleEn !== undefined) updateData.titleEn = titleEn?.trim() || null;
      if (subtitle !== undefined) {
        const nextTitle = title !== undefined ? title?.trim() : existingAsset.title;
        updateData.subtitle = subtitle?.trim() || nextTitle || null;
      }
      if (subtitleEn !== undefined) updateData.subtitleEn = subtitleEn?.trim() || null;
      if (slug !== undefined) updateData.slug = slug?.trim();
      if (type !== undefined && Object.values(KnowledgeAssetType).includes(type)) updateData.type = type;
      if (language !== undefined) updateData.language = language?.trim() || "zh";
      if (coverImage !== undefined) updateData.coverImage = coverImage?.trim() || null;
      if (publishDate !== undefined) updateData.publishDate = publishDate ? new Date(publishDate) : null;
      if (summary !== undefined) updateData.summary = summary || null;
      if (summaryEn !== undefined) updateData.summaryEn = summaryEn || null;
      if (content !== undefined) updateData.content = content || null;
      if (contentEn !== undefined) updateData.contentEn = contentEn || null;
      if (keyPoints !== undefined) updateData.keyPoints = Array.isArray(keyPoints) ? keyPoints : Prisma.JsonNull;
      if (keyPointsEn !== undefined) updateData.keyPointsEn = Array.isArray(keyPointsEn) ? keyPointsEn : Prisma.JsonNull;
      if (references !== undefined) updateData.references = Array.isArray(references) ? references : Prisma.JsonNull;
      if (chapters !== undefined) updateData.chapters = Array.isArray(chapters) ? chapters : Prisma.JsonNull;
      if (chaptersEn !== undefined) updateData.chaptersEn = Array.isArray(chaptersEn) ? chaptersEn : Prisma.JsonNull;
      if (recommendations !== undefined) updateData.recommendations = recommendations?.trim() || null;
      if (recommendationsEn !== undefined) updateData.recommendationsEn = recommendationsEn?.trim() || null;
      if (tags !== undefined) updateData.tags = tags?.trim() || null;
      if (tagsEn !== undefined) updateData.tagsEn = tagsEn?.trim() || null;
      if (author !== undefined) updateData.author = author?.trim() || null;
      if (pullQuote !== undefined) updateData.pullQuote = pullQuote?.trim() || null;
      if (pullQuoteEn !== undefined) updateData.pullQuoteEn = pullQuoteEn?.trim() || null;
      if (pullQuoteCaption !== undefined) updateData.pullQuoteCaption = pullQuoteCaption?.trim() || null;
      if (pullQuoteCaptionEn !== undefined) updateData.pullQuoteCaptionEn = pullQuoteCaptionEn?.trim() || null;
      if (aboutUs !== undefined) updateData.aboutUs = aboutUs?.trim() || null;
      if (aboutUsEn !== undefined) updateData.aboutUsEn = aboutUsEn?.trim() || null;
      if (fileUrl !== undefined) updateData.fileUrl = fileUrl?.trim() || null;
      if (fileFormat !== undefined) updateData.fileFormat = fileFormat?.trim() || null;
      if (fileSize !== undefined) updateData.fileSize = typeof fileSize === "number" ? fileSize : null;
      if (accessType !== undefined && Object.values(AccessType).includes(accessType)) updateData.accessType = accessType;
      if (price !== undefined) updateData.price = price !== null && `${price}` !== "" ? Number(price) : null;
      if (currency !== undefined) updateData.currency = currency?.trim() || "CNY";
      if (downloadEnabled !== undefined) updateData.downloadEnabled = Boolean(downloadEnabled);
      if (previewEnabled !== undefined) updateData.previewEnabled = Boolean(previewEnabled);
      if (previewPages !== undefined) updateData.previewPages = typeof previewPages === "number" ? previewPages : null;
      if (watermark !== undefined) updateData.watermark = Boolean(watermark);
      if (doi !== undefined) updateData.doi = doi?.trim() || null;
      if (citation !== undefined) updateData.citation = citation?.trim() || null;
      if (isFeatured !== undefined) updateData.isFeatured = Boolean(isFeatured);
      if (isHighlight !== undefined) updateData.isHighlight = Boolean(isHighlight);
      if (sortOrder !== undefined) updateData.sortOrder = typeof sortOrder === "number" ? sortOrder : 0;
      if (status !== undefined && Object.values(PublishStatus).includes(status)) updateData.status = status;
      if (primaryTemplateId !== undefined) updateData.primaryTemplateId = primaryTemplateId?.trim() || null;
      if (webTemplateId !== undefined) updateData.webTemplateId = webTemplateId?.trim() || null;

      const effectiveTitle = (updateData.title ?? existingAsset.title)?.trim();
      const effectiveSubtitle = (updateData.subtitle ?? existingAsset.subtitle ?? effectiveTitle)?.trim();
      const effectiveSummary = (updateData.summary ?? existingAsset.summary ?? "") as string;
      const effectiveContent = (updateData.content ?? existingAsset.content ?? "") as string;

      const effectiveTitleEn = updateData.titleEn ?? existingAsset.titleEn;
      const effectiveSubtitleEn = updateData.subtitleEn ?? existingAsset.subtitleEn;
      const effectiveSummaryEn = updateData.summaryEn ?? existingAsset.summaryEn;
      const effectiveContentEn = updateData.contentEn ?? existingAsset.contentEn;

      const needTranslation =
        !effectiveTitleEn || !effectiveSubtitleEn || !effectiveSummaryEn || !effectiveContentEn;

      if (needTranslation && effectiveTitle) {
        const translated = await translateMissingInsightFieldsToEnglish({
          title: effectiveTitle,
          subtitle: effectiveSubtitle,
          summary: effectiveSummary,
          content: effectiveContent,
        });

        if (!effectiveTitleEn) updateData.titleEn = translated.titleEn || effectiveTitle;
        if (!effectiveSubtitleEn) updateData.subtitleEn = translated.subtitleEn || effectiveSubtitle || effectiveTitle;
        if (!effectiveSummaryEn) updateData.summaryEn = translated.summaryEn || effectiveSummary || null;
        if (!effectiveContentEn) updateData.contentEn = translated.contentEn || effectiveContent || null;
      }

      const result = await tx.knowledgeAsset.update({ where: { id }, data: updateData, include: INSIGHT_INCLUDE });

      if (createVersion) {
        await tx.knowledgeAssetVersion.create({
          data: {
            knowledgeAssetId: id,
            versionLabel: versionLabel?.trim() || `v${Date.now()}`,
            changeLog: versionChangeLog?.trim() || null,
            contentSnapshot: result.content || null,
            fileUrl: result.fileUrl || null,
          },
        });
      }

      return result;
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update insight error:", error);
    return NextResponse.json({ success: false, error: "Failed to update insight" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireInsightAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const id = await resolveAssetId(params.id);
    if (!id) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    await prisma.knowledgeAsset.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete insight error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete insight" }, { status: 500 });
  }
}
