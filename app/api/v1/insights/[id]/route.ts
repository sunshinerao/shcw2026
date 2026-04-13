import { NextRequest, NextResponse } from "next/server";
import { AccessType, KnowledgeAssetType, PublishStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/openclaw-auth";

async function resolveInsightId(idOrSlug: string) {
  const existing = await prisma.knowledgeAsset.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { id: true },
  });
  return existing?.id || null;
}

/**
 * GET /api/v1/insights/[id] — get insight by id or slug
 * PATCH /api/v1/insights/[id] — update insight
 * DELETE /api/v1/insights/[id] — delete insight
 */

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyApiKey(req, "insights:read");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const id = await resolveInsightId(params.id);
  if (!id) return NextResponse.json({ success: false, error: "Insight not found" }, { status: 404 });

  const item = await prisma.knowledgeAsset.findUnique({
    where: { id },
    include: {
      events: { include: { event: { select: { id: true, title: true, titleEn: true } } } },
      institutions: { include: { institution: { select: { id: true, slug: true, name: true, nameEn: true } } } },
      speakers: { include: { speaker: { select: { id: true, name: true, nameEn: true } } } },
      tracks: { include: { track: { select: { id: true, name: true, nameEn: true } } } },
      versions: { orderBy: { createdAt: "desc" } },
    },
  });

  return NextResponse.json({ success: true, data: item });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyApiKey(req, "insights:write");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const id = await resolveInsightId(params.id);
  if (!id) return NextResponse.json({ success: false, error: "Insight not found" }, { status: 404 });

  const body = await req.json();
  const {
    relatedEventIds,
    relatedInstitutionIds,
    relatedSpeakerIds,
    relatedTrackIds,
    createVersion,
    versionLabel,
    versionChangeLog,
    ...rest
  } = body;

  if (rest.slug !== undefined) {
    const normalizedSlug = String(rest.slug).trim();
    const duplicate = await prisma.knowledgeAsset.findFirst({
      where: { slug: normalizedSlug, NOT: { id } },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json({ success: false, error: `slug '${normalizedSlug}' already exists` }, { status: 409 });
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (Array.isArray(relatedEventIds)) {
      await tx.knowledgeAssetEvent.deleteMany({ where: { knowledgeAssetId: id } });
      if (relatedEventIds.length > 0) {
        await tx.knowledgeAssetEvent.createMany({ data: relatedEventIds.map((eventId: string) => ({ knowledgeAssetId: id, eventId })) });
      }
    }
    if (Array.isArray(relatedInstitutionIds)) {
      await tx.knowledgeAssetInstitution.deleteMany({ where: { knowledgeAssetId: id } });
      if (relatedInstitutionIds.length > 0) {
        await tx.knowledgeAssetInstitution.createMany({ data: relatedInstitutionIds.map((institutionId: string) => ({ knowledgeAssetId: id, institutionId })) });
      }
    }
    if (Array.isArray(relatedSpeakerIds)) {
      await tx.knowledgeAssetSpeaker.deleteMany({ where: { knowledgeAssetId: id } });
      if (relatedSpeakerIds.length > 0) {
        await tx.knowledgeAssetSpeaker.createMany({ data: relatedSpeakerIds.map((speakerId: string) => ({ knowledgeAssetId: id, speakerId })) });
      }
    }
    if (Array.isArray(relatedTrackIds)) {
      await tx.knowledgeAssetTrack.deleteMany({ where: { knowledgeAssetId: id } });
      if (relatedTrackIds.length > 0) {
        await tx.knowledgeAssetTrack.createMany({ data: relatedTrackIds.map((trackId: string) => ({ knowledgeAssetId: id, trackId })) });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (rest.title !== undefined) updateData.title = String(rest.title).trim();
    if (rest.titleEn !== undefined) updateData.titleEn = rest.titleEn ? String(rest.titleEn).trim() : null;
    if (rest.subtitle !== undefined) updateData.subtitle = rest.subtitle ? String(rest.subtitle).trim() : null;
    if (rest.subtitleEn !== undefined) updateData.subtitleEn = rest.subtitleEn ? String(rest.subtitleEn).trim() : null;
    if (rest.slug !== undefined) updateData.slug = String(rest.slug).trim();
    if (rest.type !== undefined && Object.values(KnowledgeAssetType).includes(rest.type)) updateData.type = rest.type;
    if (rest.language !== undefined) updateData.language = String(rest.language || "zh");
    if (rest.coverImage !== undefined) updateData.coverImage = rest.coverImage ? String(rest.coverImage).trim() : null;
    if (rest.publishDate !== undefined) updateData.publishDate = rest.publishDate ? new Date(rest.publishDate) : null;
    if (rest.summary !== undefined) updateData.summary = rest.summary || null;
    if (rest.summaryEn !== undefined) updateData.summaryEn = rest.summaryEn || null;
    if (rest.content !== undefined) updateData.content = rest.content || null;
    if (rest.contentEn !== undefined) updateData.contentEn = rest.contentEn || null;
    if (rest.keyPoints !== undefined) updateData.keyPoints = Array.isArray(rest.keyPoints) ? rest.keyPoints : undefined;
    if (rest.keyPointsEn !== undefined) updateData.keyPointsEn = Array.isArray(rest.keyPointsEn) ? rest.keyPointsEn : undefined;
    if (rest.references !== undefined) updateData.references = Array.isArray(rest.references) ? rest.references : undefined;
    if (rest.fileUrl !== undefined) updateData.fileUrl = rest.fileUrl ? String(rest.fileUrl).trim() : null;
    if (rest.fileFormat !== undefined) updateData.fileFormat = rest.fileFormat ? String(rest.fileFormat).trim() : null;
    if (rest.fileSize !== undefined) updateData.fileSize = typeof rest.fileSize === "number" ? rest.fileSize : null;
    if (rest.accessType !== undefined && Object.values(AccessType).includes(rest.accessType)) updateData.accessType = rest.accessType;
    if (rest.price !== undefined) updateData.price = rest.price !== null && `${rest.price}` !== "" ? Number(rest.price) : null;
    if (rest.currency !== undefined) updateData.currency = rest.currency ? String(rest.currency).trim() : "CNY";
    if (rest.downloadEnabled !== undefined) updateData.downloadEnabled = Boolean(rest.downloadEnabled);
    if (rest.previewEnabled !== undefined) updateData.previewEnabled = Boolean(rest.previewEnabled);
    if (rest.previewPages !== undefined) updateData.previewPages = typeof rest.previewPages === "number" ? rest.previewPages : null;
    if (rest.watermark !== undefined) updateData.watermark = Boolean(rest.watermark);
    if (rest.doi !== undefined) updateData.doi = rest.doi ? String(rest.doi).trim() : null;
    if (rest.citation !== undefined) updateData.citation = rest.citation ? String(rest.citation) : null;
    if (rest.isFeatured !== undefined) updateData.isFeatured = Boolean(rest.isFeatured);
    if (rest.isHighlight !== undefined) updateData.isHighlight = Boolean(rest.isHighlight);
    if (rest.sortOrder !== undefined) updateData.sortOrder = typeof rest.sortOrder === "number" ? rest.sortOrder : 0;
    if (rest.status !== undefined && Object.values(PublishStatus).includes(rest.status)) updateData.status = rest.status;

    const result = await tx.knowledgeAsset.update({ where: { id }, data: updateData });

    if (createVersion) {
      await tx.knowledgeAssetVersion.create({
        data: {
          knowledgeAssetId: id,
          versionLabel: versionLabel ? String(versionLabel) : `v${Date.now()}`,
          changeLog: versionChangeLog ? String(versionChangeLog) : null,
          contentSnapshot: result.content || null,
          fileUrl: result.fileUrl || null,
        },
      });
    }

    return result;
  });

  return NextResponse.json({ success: true, data: updated, message: "Insight updated" });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyApiKey(req, "insights:write");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const id = await resolveInsightId(params.id);
  if (!id) return NextResponse.json({ success: false, error: "Insight not found" }, { status: 404 });

  await prisma.knowledgeAsset.delete({ where: { id } });
  return NextResponse.json({ success: true, message: "Insight deleted" });
}
