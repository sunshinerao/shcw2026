import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/public/institutions/[slug] — public institution detail (no auth required)
 * Returns institution profile including relationships, events, and speakers.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  const institution = await prisma.institution.findFirst({
    where: {
      OR: [{ slug }, { id: slug }],
      isActive: true,
    },
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
      relationships: {
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
          note: true,
          track: {
            select: { id: true, name: true, nameEn: true },
          },
        },
      },
      events: {
        orderBy: { event: { startDate: "asc" as const } },
        select: {
          role: true,
          event: {
            select: {
              id: true,
              title: true,
              titleEn: true,
              type: true,
              startDate: true,
              endDate: true,
              venue: true,
              isPublished: true,
            },
          },
        },
      },
      speakers: {
        orderBy: { order: "asc" as const },
        select: {
          id: true,
          name: true,
          nameEn: true,
          title: true,
          titleEn: true,
          organization: true,
          organizationEn: true,
          avatar: true,
          isKeynote: true,
        },
      },
    },
  });

  if (!institution) {
    return NextResponse.json({ success: false, error: "Institution not found" }, { status: 404 });
  }

  // Filter out unpublished events for public view
  const sanitized = {
    ...institution,
    events: institution.events.filter((ei) => ei.event.isPublished),
  };

  return NextResponse.json({ success: true, data: sanitized });
}
