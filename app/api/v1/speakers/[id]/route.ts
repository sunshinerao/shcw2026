import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/openclaw-auth";

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

const SPEAKER_FIELDS = {
  id: true, slug: true, salutation: true, name: true, nameEn: true, avatar: true,
  title: true, titleEn: true, organization: true, organizationEn: true,
  organizationLogo: true, bio: true, bioEn: true,
  summary: true, summaryEn: true,
  countryOrRegion: true, countryOrRegionEn: true,
  relevanceToShcw: true, relevanceToShcwEn: true,
  expertiseTags: true,
  linkedin: true, twitter: true, website: true, isKeynote: true, isVisible: true, order: true,
  createdAt: true, updatedAt: true,
};

/**
 * GET /api/v1/speakers/[id]
 * PATCH /api/v1/speakers/[id]
 * DELETE /api/v1/speakers/[id]
 */

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyApiKey(req, "speakers:read");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const speaker = await prisma.speaker.findFirst({
    where: { OR: [{ id: params.id }, { slug: params.id }] },
    select: {
      ...SPEAKER_FIELDS,
      roles: { orderBy: [{ isCurrent: "desc" }, { order: "asc" }] },
    },
  });
  if (!speaker) return NextResponse.json({ success: false, error: "Speaker not found" }, { status: 404 });

  return NextResponse.json({ success: true, data: speaker });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyApiKey(req, "speakers:write");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const existing = await prisma.speaker.findFirst({
    where: { OR: [{ id: params.id }, { slug: params.id }] },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ success: false, error: "Speaker not found" }, { status: 404 });
  const speakerId = existing.id;

  const body = await req.json();
  const update: Record<string, unknown> = {};

  const stringFields = [
    "name", "nameEn", "title", "titleEn", "organization", "organizationEn",
    "organizationLogo", "salutation", "bio", "bioEn",
    "summary", "summaryEn", "countryOrRegion", "countryOrRegionEn",
    "relevanceToShcw", "relevanceToShcwEn", "slug",
    "email", "linkedin", "twitter", "website",
  ];
  for (const key of stringFields) {
    if (body[key] !== undefined) update[key] = normalizeText(body[key]);
  }
  if (Array.isArray(body.expertiseTags)) update.expertiseTags = body.expertiseTags;

  if (typeof body.isKeynote === "boolean") update.isKeynote = body.isKeynote;
  if (typeof body.isVisible === "boolean") update.isVisible = body.isVisible;
  if (typeof body.order === "number") update.order = body.order;

  // Prevent renaming to a duplicate name
  if (update.name) {
    const normalizedName = (update.name as string).toLowerCase().replace(/[\s\-.]/g, "");
    const all = await prisma.speaker.findMany({ where: { NOT: { id: speakerId } }, select: { id: true, name: true } });
    const dup = all.find((s) => s.name.toLowerCase().replace(/[\s\-.]/g, "") === normalizedName);
    if (dup) {
      return NextResponse.json(
        { success: false, error: `Another speaker with similar name already exists: "${dup.name}" (id: ${dup.id})` },
        { status: 409 }
      );
    }
  }

  // Prevent duplicate slug
  if (update.slug) {
    const slugDup = await prisma.speaker.findFirst({
      where: { slug: update.slug as string, NOT: { id: speakerId } },
      select: { id: true, name: true },
    });
    if (slugDup) {
      return NextResponse.json(
        { success: false, error: `Slug "${update.slug as string}" is already used by speaker "${slugDup.name}" (id: ${slugDup.id})` },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.speaker.update({
    where: { id: speakerId },
    data: update,
    select: SPEAKER_FIELDS,
  });

  return NextResponse.json({ success: true, data: updated, message: "Speaker updated" });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyApiKey(req, "speakers:write");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const existing = await prisma.speaker.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!existing) return NextResponse.json({ success: false, error: "Speaker not found" }, { status: 404 });

  // Check if speaker is assigned to any agenda items
  const usageCount = await prisma.agendaItem.count({
    where: { speakers: { some: { id: params.id } } },
  });
  if (usageCount > 0) {
    return NextResponse.json(
      { success: false, error: `Speaker "${existing.name}" is assigned to ${usageCount} agenda item(s). Remove them first before deleting.` },
      { status: 409 }
    );
  }

  await prisma.speaker.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true, message: `Speaker "${existing.name}" deleted` });
}
