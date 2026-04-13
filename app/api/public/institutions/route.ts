import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/public/institutions — public institution list
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeRelationships = searchParams.get("includeRelationships") !== "false";
    const isActive = searchParams.get("isActive");
    const showOnHomepage = searchParams.get("showOnHomepage") === "true";

    const where: Record<string, unknown> = {};
    if (isActive !== null && isActive !== undefined && isActive !== "") {
      where.isActive = isActive === "true";
    } else {
      where.isActive = true;
    }

    const institutions = await prisma.institution.findMany({
      where,
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        nameEn: true,
        shortName: true,
        shortNameEn: true,
        logo: true,
        website: true,
        orgType: true,
        countryOrRegion: true,
        countryOrRegionEn: true,
        description: true,
        descriptionEn: true,
        collaborationBg: true,
        collaborationBgEn: true,
        relationships: includeRelationships
          ? {
              orderBy: [{ priority: "asc" as const }],
              select: {
                id: true,
                type: true,
                scope: true,
                sponsorLevel: true,
                displaySection: true,
                showOnHomepage: true,
                priority: true,
                startYear: true,
                endYear: true,
                isCurrent: true,
                track: { select: { id: true, name: true, nameEn: true } },
              },
            }
          : false,
      },
    });

    const filtered = showOnHomepage
      ? institutions.filter((inst) =>
          Array.isArray(inst.relationships)
            ? inst.relationships.some((rel) => rel.showOnHomepage)
            : false,
        )
      : institutions;

    return NextResponse.json({ success: true, data: filtered, count: filtered.length });
  } catch (error) {
    console.error("Public institution list error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch institutions" }, { status: 500 });
  }
}
