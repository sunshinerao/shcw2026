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
  // email is intentionally omitted from public API for privacy
};

/**
 * GET /api/v1/speakers — list speakers
 * POST /api/v1/speakers — create speaker
 */

export async function GET(req: NextRequest) {
  const auth = await verifyApiKey(req, "speakers:read");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "100", 10)));
  const search = searchParams.get("search")?.trim() || "";
  const isKeynote = searchParams.get("isKeynote");

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { nameEn: { contains: search, mode: "insensitive" } },
      { organization: { contains: search, mode: "insensitive" } },
      { organizationEn: { contains: search, mode: "insensitive" } },
    ];
  }
  if (isKeynote === "true") where.isKeynote = true;
  else if (isKeynote === "false") where.isKeynote = false;

  const [speakers, total] = await Promise.all([
    prisma.speaker.findMany({
      where,
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: SPEAKER_FIELDS,
    }),
    prisma.speaker.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: speakers,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

export async function POST(req: NextRequest) {
  const auth = await verifyApiKey(req, "speakers:write");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { name, nameEn, title, titleEn, organization, organizationEn,
          organizationLogo, salutation, bio, bioEn,
          summary, summaryEn, countryOrRegion, countryOrRegionEn,
          relevanceToShcw, relevanceToShcwEn, expertiseTags,
          slug, linkedin, twitter,
          website, isKeynote, isVisible, order, email } = body;

  // Required fields
  if (!name?.trim()) return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });
  if (!title?.trim()) return NextResponse.json({ success: false, error: "title is required" }, { status: 400 });
  if (!organization?.trim()) return NextResponse.json({ success: false, error: "organization is required" }, { status: 400 });

  // Duplicate check — same name (normalized)
  const normalizedName = name.trim().toLowerCase().replace(/[\s\-.]/g, "");
  const existing = await prisma.speaker.findMany({ select: { id: true, name: true, nameEn: true } });
  const duplicate = existing.find((s) => {
    const sName = s.name.toLowerCase().replace(/[\s\-.]/g, "");
    const sNameEn = s.nameEn?.toLowerCase().replace(/[\s\-.]/g, "") ?? "";
    return sName === normalizedName || (nameEn && sNameEn === nameEn.trim().toLowerCase().replace(/[\s\-.]/g, ""));
  });
  if (duplicate) {
    return NextResponse.json(
      { success: false, error: `A speaker with a similar name already exists: "${duplicate.name}" (id: ${duplicate.id}). Use PATCH /api/v1/speakers/${duplicate.id} to update.` },
      { status: 409 }
    );
  }

  const speaker = await prisma.speaker.create({
    data: {
      name: name.trim(),
      nameEn: normalizeText(nameEn),
      title: title.trim(),
      titleEn: normalizeText(titleEn),
      organization: organization.trim(),
      organizationEn: normalizeText(organizationEn),
      organizationLogo: normalizeText(organizationLogo),
      salutation: normalizeText(salutation),
      bio: normalizeText(bio),
      bioEn: normalizeText(bioEn),
      summary: normalizeText(summary),
      summaryEn: normalizeText(summaryEn),
      countryOrRegion: normalizeText(countryOrRegion),
      countryOrRegionEn: normalizeText(countryOrRegionEn),
      relevanceToShcw: normalizeText(relevanceToShcw),
      relevanceToShcwEn: normalizeText(relevanceToShcwEn),
      expertiseTags: Array.isArray(expertiseTags) ? expertiseTags : undefined,
      slug: normalizeText(slug),
      email: normalizeText(email),
      linkedin: normalizeText(linkedin),
      twitter: normalizeText(twitter),
      website: normalizeText(website),
      isKeynote: isKeynote === true,
      isVisible: isVisible !== undefined ? isVisible === true : true,
      order: typeof order === "number" ? order : 0,
    },
    select: SPEAKER_FIELDS,
  });

  return NextResponse.json({ success: true, data: speaker, message: "Speaker created" }, { status: 201 });
}
