import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/openclaw-auth";

const VALID_ORG_TYPES = new Set([
  "ngo", "gov", "corp", "academic", "media", "community", "foundation", "intergovernmental",
]);

const VALID_RELATION_TYPES = new Set([
  "organizer", "co_organizer", "knowledge_partner", "strategic_partner",
  "sponsor", "track_leader", "venue_partner", "media_partner",
  "community_partner", "supporting_org",
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

/**
 * GET /api/v1/institutions — list institutions (public API)
 * POST /api/v1/institutions — create institution
 */
export async function GET(req: NextRequest) {
  const auth = await verifyApiKey(req, "institutions:read");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
  const search = searchParams.get("search")?.trim() || "";
  const orgType = searchParams.get("orgType");
  const relType = searchParams.get("relationType");
  const showOnHomepage = searchParams.get("showOnHomepage");
  const activeOnly = searchParams.get("activeOnly") !== "false";
  const includeRelationships = searchParams.get("includeRelationships") === "true";

  const where: Record<string, unknown> = {};
  if (activeOnly) where.isActive = true;
  if (orgType && VALID_ORG_TYPES.has(orgType)) where.orgType = orgType;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { nameEn: { contains: search, mode: "insensitive" } },
    ];
  }
  // Filter by relationship type or homepage display
  if (relType || showOnHomepage === "true") {
    const relWhere: Record<string, unknown> = {};
    if (relType && VALID_RELATION_TYPES.has(relType)) relWhere.type = relType;
    if (showOnHomepage === "true") relWhere.showOnHomepage = true;
    where.relationships = { some: relWhere };
  }

  const [institutions, total] = await Promise.all([
    prisma.institution.findMany({
      where,
      orderBy: [{ order: "asc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: includeRelationships
        ? {
            ...INSTITUTION_FIELDS,
            relationships: {
              orderBy: [{ priority: "asc" as const }],
              select: {
                id: true, type: true, scope: true, sponsorLevel: true,
                displaySection: true, showOnHomepage: true, priority: true,
                startYear: true, endYear: true, isCurrent: true,
                track: { select: { id: true, name: true, nameEn: true } },
              },
            },
          }
        : INSTITUTION_FIELDS,
    }),
    prisma.institution.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: institutions,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

export async function POST(req: NextRequest) {
  const auth = await verifyApiKey(req, "institutions:write");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const body = await req.json();
  const {
    slug, name, nameEn, shortName, shortNameEn, logo, website,
    orgType, countryOrRegion, countryOrRegionEn,
    description, descriptionEn, collaborationBg, collaborationBgEn,
    isActive, order,
  } = body;

  if (!name?.trim()) return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });
  if (!slug?.trim()) return NextResponse.json({ success: false, error: "slug is required" }, { status: 400 });

  const existing = await prisma.institution.findUnique({ where: { slug: slug.trim() } });
  if (existing) return NextResponse.json({ success: false, error: "slug already in use" }, { status: 409 });

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
    select: INSTITUTION_FIELDS,
  });

  return NextResponse.json({ success: true, data: institution }, { status: 201 });
}
