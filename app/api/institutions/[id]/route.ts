import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { resolveRequestLocale, apiMessage } from "@/lib/api-i18n";
import { canManageInstitutions } from "@/lib/permissions";

async function checkAdminPermission(sessionUserId: string, locale: "zh" | "en") {
  const currentUser = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { role: true, staffPermissions: true },
  });
  if (!currentUser) {
    return { allowed: false, status: 401, error: apiMessage(locale, "userNotFound") };
  }
  if (!canManageInstitutions(currentUser.role, currentUser.staffPermissions)) {
    return { allowed: false, status: 403, error: apiMessage(locale, "adminOnly") };
  }
  return { allowed: true, userRole: currentUser.role };
}

const INSTITUTION_INCLUDE = {
  relationships: {
    orderBy: [{ showOnHomepage: "desc" as const }, { priority: "asc" as const }],
    include: { track: { select: { id: true, name: true, nameEn: true } } },
  },
};

/**
 * GET /api/institutions/[id] — get by id or slug
 * PUT /api/institutions/[id] — update
 * DELETE /api/institutions/[id] — delete (admin only)
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const locale = resolveRequestLocale(req);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: apiMessage(locale, "unauthorized") }, { status: 401 });
  }
  const perm = await checkAdminPermission(session.user.id, locale);
  if (!perm.allowed) {
    return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });
  }

  const { id } = params;
  const institution = await prisma.institution.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: INSTITUTION_INCLUDE,
  });
  if (!institution) {
    return NextResponse.json({ success: false, error: "Institution not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: institution });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const locale = resolveRequestLocale(req);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: apiMessage(locale, "unauthorized") }, { status: 401 });
  }
  const perm = await checkAdminPermission(session.user.id, locale);
  if (!perm.allowed) {
    return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });
  }

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
    relationships, // optional array to replace relationships
  } = body;

  // Slug uniqueness check (excluding self)
  if (slug?.trim()) {
    const slugConflict = await prisma.institution.findFirst({
      where: { slug: slug.trim(), NOT: { id: actualId } },
      select: { id: true },
    });
    if (slugConflict) {
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
  if (orgType !== undefined) updateData.orgType = orgType?.trim() || null;
  if (countryOrRegion !== undefined) updateData.countryOrRegion = countryOrRegion?.trim() || null;
  if (countryOrRegionEn !== undefined) updateData.countryOrRegionEn = countryOrRegionEn?.trim() || null;
  if (description !== undefined) updateData.description = description?.trim() || null;
  if (descriptionEn !== undefined) updateData.descriptionEn = descriptionEn?.trim() || null;
  if (collaborationBg !== undefined) updateData.collaborationBg = collaborationBg?.trim() || null;
  if (collaborationBgEn !== undefined) updateData.collaborationBgEn = collaborationBgEn?.trim() || null;
  if (isActive !== undefined) updateData.isActive = Boolean(isActive);
  if (order !== undefined) updateData.order = Number(order) || 0;

  // If relationships array provided, replace all
  if (Array.isArray(relationships)) {
    await prisma.$transaction([
      prisma.institutionRelationship.deleteMany({ where: { institutionId: actualId } }),
      ...relationships.map((r: Record<string, unknown>, idx: number) =>
        prisma.institutionRelationship.create({
          data: {
            institutionId: actualId,
            type: String(r.type),
            scope: String(r.scope || "annual"),
            sponsorLevel: r.sponsorLevel ? String(r.sponsorLevel) : null,
            trackId: r.trackId ? String(r.trackId) : null,
            displaySection: r.displaySection ? String(r.displaySection) : null,
            showOnHomepage: Boolean(r.showOnHomepage ?? false),
            priority: Number(r.priority ?? idx),
            startYear: r.startYear ? Number(r.startYear) : null,
            endYear: r.endYear ? Number(r.endYear) : null,
            isCurrent: Boolean(r.isCurrent ?? true),
            benefitsJson: r.benefitsJson !== undefined && r.benefitsJson !== null ? r.benefitsJson : undefined,
            note: r.note ? String(r.note) : null,
          },
        })
      ),
    ]);
  }

  const updated = await prisma.institution.update({
    where: { id: actualId },
    data: updateData,
    include: INSTITUTION_INCLUDE,
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const locale = resolveRequestLocale(req);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: apiMessage(locale, "unauthorized") }, { status: 401 });
  }
  const perm = await checkAdminPermission(session.user.id, locale);
  if (!perm.allowed) {
    return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });
  }
  // Admin-only guard
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (currentUser?.role !== UserRole.ADMIN) {
    return NextResponse.json({ success: false, error: "Admin only" }, { status: 403 });
  }

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
