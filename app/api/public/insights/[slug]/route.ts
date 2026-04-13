import { NextRequest, NextResponse } from "next/server";
import { AccessType, PublishStatus } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireInsightAdmin } from "@/lib/insight-auth";

function normalizeSlugParam(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const insightAdmin = await requireInsightAdmin();
    const normalizedSlug = normalizeSlugParam(params.slug);

    const item = await prisma.knowledgeAsset.findFirst({
      where: {
        OR: [{ id: params.slug }, { slug: params.slug }, { id: normalizedSlug }, { slug: normalizedSlug }],
        ...(insightAdmin ? {} : { status: PublishStatus.PUBLISHED }),
        accessType: { not: AccessType.HIDDEN },
      },
      include: {
        events: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                titleEn: true,
                startDate: true,
                venue: true,
                isPublished: true,
              },
            },
          },
        },
        institutions: { include: { institution: { select: { id: true, slug: true, name: true, nameEn: true, logo: true } } } },
        speakers: { include: { speaker: { select: { id: true, name: true, nameEn: true, title: true, titleEn: true, avatar: true } } } },
        tracks: { include: { track: { select: { id: true, name: true, nameEn: true } } } },
        versions: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!item) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    // Filter out unpublished events before exposing to public consumers
    const sanitizedItem = {
      ...item,
      events: item.events.filter((ei) => ei.event.isPublished),
    };

    const session = await getServerSession(authOptions);

    if (item.accessType === AccessType.LOGIN_REQUIRED && !session?.user?.id) {
      return NextResponse.json(
        {
          success: true,
          data: {
            ...sanitizedItem,
            fileUrl: null,
            downloadEnabled: false,
            accessNotice: "login_required",
          },
        },
        { status: 200 }
      );
    }

    if (item.accessType === AccessType.PAID) {
      return NextResponse.json(
        {
          success: true,
          data: {
            ...sanitizedItem,
            fileUrl: null,
            downloadEnabled: false,
            accessNotice: "paid_required",
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true, data: sanitizedItem });
  } catch (error) {
    console.error("Public insight detail error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch insight" }, { status: 500 });
  }
}
