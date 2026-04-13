import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { resolveRequestLocale, apiMessage } from "@/lib/api-i18n";
import { canManageInstitutions, isAdminConsoleRole } from "@/lib/permissions";

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
 * GET /api/institutions — list institutions (admin)
 * POST /api/institutions — create institution (admin)
 */
export async function GET(req: NextRequest) {
  const locale = resolveRequestLocale(req);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: apiMessage(locale, "unauthorized") }, { status: 401 });
  }

  // Any admin-console user may READ the list (for picker use in events/speakers pages).
  // Full relationship data is only returned for those who can manage institutions.
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, staffPermissions: true },
  });
  if (!currentUser) {
    return NextResponse.json({ success: false, error: apiMessage(locale, "userNotFound") }, { status: 401 });
  }
  if (!isAdminConsoleRole(currentUser.role, currentUser.staffPermissions)) {
    return NextResponse.json({ success: false, error: apiMessage(locale, "adminOnly") }, { status: 403 });
  }
  const canManage = canManageInstitutions(currentUser.role, currentUser.staffPermissions);

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const isActive = searchParams.get("isActive");
  const orgType = searchParams.get("orgType");
  // Only expose relationship data to users who can manage institutions
  const includeRelationships = canManage && searchParams.get("includeRelationships") !== "false";
  const limitParam = searchParams.get("limit");
  const take = limitParam ? Math.min(500, Math.max(1, parseInt(limitParam, 10))) : undefined;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { nameEn: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ];
  }
  if (isActive !== null && isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true";
  }
  if (orgType) where.orgType = orgType;

  const institutions = await prisma.institution.findMany({
    where,
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: includeRelationships ? INSTITUTION_INCLUDE : undefined,
    take,
  });

  return NextResponse.json({ success: true, data: institutions, count: institutions.length });
}

export async function POST(req: NextRequest) {
  const locale = resolveRequestLocale(req);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: apiMessage(locale, "unauthorized") }, { status: 401 });
  }
  const perm = await checkAdminPermission(session.user.id, locale);
  if (!perm.allowed) {
    return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });
  }

  const body = await req.json();
  const {
    slug, name, nameEn, shortName, shortNameEn, logo, website,
    orgType, countryOrRegion, countryOrRegionEn,
    description, descriptionEn, collaborationBg, collaborationBgEn,
    isActive, order,
    relationships, // optional array of relationship objects
  } = body;

  if (!name?.trim()) {
    return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });
  }
  if (!slug?.trim()) {
    return NextResponse.json({ success: false, error: "slug is required" }, { status: 400 });
  }

  // Slug uniqueness check
  const existing = await prisma.institution.findUnique({ where: { slug: slug.trim() } });
  if (existing) {
    return NextResponse.json({ success: false, error: "slug already in use" }, { status: 409 });
  }

  const institution = await prisma.institution.create({
    data: {
      slug: slug.trim(),
      name: name.trim(),
      nameEn: nameEn?.trim() || null,
      shortName: shortName?.trim() || null,
      shortNameEn: shortNameEn?.trim() || null,
      logo: logo?.trim() || null,
      website: website?.trim() || null,
      orgType: orgType?.trim() || null,
      countryOrRegion: countryOrRegion?.trim() || null,
      countryOrRegionEn: countryOrRegionEn?.trim() || null,
      description: description?.trim() || null,
      descriptionEn: descriptionEn?.trim() || null,
      collaborationBg: collaborationBg?.trim() || null,
      collaborationBgEn: collaborationBgEn?.trim() || null,
      isActive: typeof isActive === "boolean" ? isActive : true,
      order: typeof order === "number" ? order : 0,
    },
    select: { id: true },
  });

  // Write initial relationships if provided
  if (Array.isArray(relationships) && relationships.length > 0) {
    await prisma.$transaction(
      relationships.map((r: Record<string, unknown>, idx: number) =>
        prisma.institutionRelationship.create({
          data: {
            institutionId: institution.id,
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
      )
    );
  }

  const result = await prisma.institution.findUnique({
    where: { id: institution.id },
    include: INSTITUTION_INCLUDE,
  });

  return NextResponse.json({ success: true, data: result }, { status: 201 });
}
