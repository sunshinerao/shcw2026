import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/openclaw-auth";

const VALID_ORG_TYPES = new Set([
  "ngo", "gov", "corp", "academic", "media", "community", "foundation", "intergovernmental",
]);

const INSTITUTION_FIELDS = {
  id: true, slug: true,
  name: true, nameEn: true, shortName: true, shortNameEn: true,
  logo: true, website: true, orgType: true,
  countryOrRegion: true, countryOrRegionEn: true,
  description: true, descriptionEn: true,
  collaborationBg: true, collaborationBgEn: true,
  isActive: true, order: true,
  createdAt: true, updatedAt: true,
};

const RELATIONSHIP_SELECT = {
  id: true, type: true, scope: true, sponsorLevel: true,
  displaySection: true, showOnHomepage: true, priority: true,
  startYear: true, endYear: true, isCurrent: true, benefitsJson: true, note: true,
  track: { select: { id: true, name: true, nameEn: true } },
};

/**
 * GET /api/v1/institutions/[id] — get by id or slug
 * PATCH /api/v1/institutions/[id] — partial update
 * DELETE /api/v1/institutions/[id] — delete
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyApiKey(req, "institutions:read");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const { id } = params;
  const institution = await prisma.institution.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: {
      ...INSTITUTION_FIELDS,
      relationships: {
        orderBy: [{ priority: "asc" as const }],
        select: RELATIONSHIP_SELECT,
      },
    },
  });

  if (!institution) {
    return NextResponse.json({ success: false, error: "Institution not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: institution });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyApiKey(req, "institutions:write");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const { id } = params;
  const existing = await prisma.institution.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ success: false, error: "Institution not found" }, { status: 404 });
  }
  const actualId = existing.id;

  const body = await req.json();
  const {
    slug, name, nameEn, shortName, shortNameEn, logo, website,
    orgType, countryOrRegion, countryOrRegionEn,
    description, descriptionEn, collaborationBg, collaborationBgEn,
    isActive, order,
  } = body;

  if (slug !== undefined) {
    const conflict = await prisma.institution.findFirst({
      where: { slug: slug.trim(), NOT: { id: actualId } },
      select: { id: true },
    });
    if (conflict) {
      return NextResponse.json({ success: false, error: "slug already in use" }, { status: 409 });
    }
  }

  const updateData: Record<string, unknown> = {};
  if (slug !== undefined) updateData.slug = slug.trim();
  if (name !== undefined) updateData.name = name.trim();
  if (nameEn !== undefined) updateData.nameEn = nameEn?.trim() || null;
  if (shortName !== undefined) updateData.shortName = shortName?.trim() || null;
  if (shortNameEn !== undefined) updateData.shortNameEn = shortNameEn?.trim() || null;
  if (logo !== undefined) updateData.logo = logo?.trim() || null;
  if (website !== undefined) updateData.website = website?.trim() || null;
  if (orgType !== undefined) {
    const trimmed = orgType?.trim() || null;
    updateData.orgType = trimmed && VALID_ORG_TYPES.has(trimmed) ? trimmed : null;
  }
  if (countryOrRegion !== undefined) updateData.countryOrRegion = countryOrRegion?.trim() || null;
  if (countryOrRegionEn !== undefined) updateData.countryOrRegionEn = countryOrRegionEn?.trim() || null;
  if (description !== undefined) updateData.description = description?.trim() || null;
  if (descriptionEn !== undefined) updateData.descriptionEn = descriptionEn?.trim() || null;
  if (collaborationBg !== undefined) updateData.collaborationBg = collaborationBg?.trim() || null;
  if (collaborationBgEn !== undefined) updateData.collaborationBgEn = collaborationBgEn?.trim() || null;
  if (isActive !== undefined) updateData.isActive = Boolean(isActive);
  if (order !== undefined) updateData.order = Number(order) || 0;

  const updated = await prisma.institution.update({
    where: { id: actualId },
    data: updateData,
    select: {
      ...INSTITUTION_FIELDS,
      relationships: {
        orderBy: [{ priority: "asc" as const }],
        select: RELATIONSHIP_SELECT,
      },
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyApiKey(req, "institutions:write");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const { id } = params;
  const existing = await prisma.institution.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ success: false, error: "Institution not found" }, { status: 404 });
  }
  await prisma.institution.delete({ where: { id: existing.id } });
  return NextResponse.json({ success: true });
}
