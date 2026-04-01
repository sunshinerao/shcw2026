import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { EventHostType, EventLayer, Prisma, UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { translateMissingEventFieldsToEnglish } from "@/lib/ai-translation";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";
import { canManageEvents } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const EVENT_TYPES = new Set(["forum", "workshop", "ceremony", "conference", "networking"]);
const EVENT_LAYERS = new Set<string>(Object.values(EventLayer));
const EVENT_HOST_TYPES = new Set<string>(Object.values(EventHostType));

async function requireSessionUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
}

function parseEventDate(dateValue: string) {
  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(req: NextRequest) {
  const requestLocale = resolveRequestLocale(req);

  try {
    const currentUser = await requireSessionUser();
    const isAdmin = currentUser?.role === UserRole.ADMIN;
    const isStaff = currentUser?.role === UserRole.STAFF;
    const isEventManager = currentUser?.role === UserRole.EVENT_MANAGER;
    const canViewAllEvents = isAdmin || isStaff;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, Number.parseInt(searchParams.get("pageSize") || "50", 10))
    );
    const search = (searchParams.get("search") || "").trim();
    const type = searchParams.get("type");
    const published = searchParams.get("published");
    const featured = searchParams.get("featured");
    const track = searchParams.get("track");
    const city = (searchParams.get("city") || "").trim();
    const eventLayer = searchParams.get("eventLayer");
    const hostType = searchParams.get("hostType");

    const where: Prisma.EventWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { titleEn: { contains: search, mode: "insensitive" } },
        { venue: { contains: search, mode: "insensitive" } },
      ];
    }

    if (type && EVENT_TYPES.has(type)) {
      where.type = type;
    }

    if (featured === "true") {
      where.isFeatured = true;
    } else if (featured === "false") {
      where.isFeatured = false;
    }

    if (track) {
      where.trackId = track;
    }

    if (city) {
      where.city = {
        equals: city,
        mode: "insensitive",
      };
    }

    if (eventLayer && EVENT_LAYERS.has(eventLayer)) {
      where.eventLayer = eventLayer as EventLayer;
    }

    if (hostType && EVENT_HOST_TYPES.has(hostType)) {
      where.hostType = hostType as EventHostType;
    }

    if (published === "true") {
      where.isPublished = true;
    } else if (published === "false") {
      if (canViewAllEvents) {
        where.isPublished = false;
      }
    }

    if (!canViewAllEvents) {
      where.isPublished = true;
    }

    // Event managers should only see events assigned to them in admin contexts.
    if (isEventManager && published !== "true" && currentUser?.id) {
      where.managerUserId = currentUser.id;
    }

    const skip = (page - 1) * pageSize;

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          manager: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          track: {
            select: {
              id: true,
              code: true,
              name: true,
              nameEn: true,
              category: true,
              color: true,
              icon: true,
              order: true,
            },
          },
          _count: {
            select: {
              registrations: true,
              checkins: true,
              agendaItems: true,
            },
          },
        },
        orderBy: [{ isPinned: "desc" }, { startDate: "asc" }, { startTime: "asc" }],
        skip,
        take: pageSize,
      }),
      prisma.event.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        events,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (error) {
    console.error("Get events error:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "eventListFetchFailed") },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let requestLocale = resolveRequestLocale(req);

  try {
    const currentUser = await requireSessionUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "unauthorized") },
        { status: 401 }
      );
    }

    if (!canManageEvents(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "adminOrEventManagerOnly") },
        { status: 403 }
      );
    }

    const body = await req.json();
    requestLocale = resolveRequestLocale(req, body.locale);

    const {
      title,
      titleEn,
      description,
      descriptionEn,
      shortDesc,
      shortDescEn,
      startDate,
      endDate,
      startTime,
      endTime,
      venue,
      venueEn,
      address,
      city,
      cityEn,
      image,
      type,
      trackId,
      partners,
      partnersEn,
      maxAttendees,
      isPublished = false,
      isFeatured = false,
      requireApproval = false,
      eventLayer,
      hostType,
      isPinned = false,
      managerUserId,
    } = body;

    if (!title || !description || !startDate || !startTime || !endTime || !venue || !type) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "eventRequired") },
        { status: 400 }
      );
    }

    if (!EVENT_TYPES.has(type)) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "invalidEventType") },
        { status: 400 }
      );
    }

    let resolvedManagerUserId: string | null = null;
    if (managerUserId !== undefined && managerUserId !== null && managerUserId !== "") {
      if (currentUser.role !== UserRole.ADMIN) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "forbidden") },
          { status: 403 }
        );
      }

      const managerUser = await prisma.user.findUnique({
        where: { id: managerUserId },
        select: { id: true, role: true },
      });

      if (
        !managerUser ||
        (managerUser.role !== UserRole.ADMIN && managerUser.role !== UserRole.EVENT_MANAGER)
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              requestLocale === "zh"
                ? "活动管理员必须是管理员或活动管理员角色"
                : "Event manager must have ADMIN or EVENT_MANAGER role",
          },
          { status: 400 }
        );
      }

      resolvedManagerUserId = managerUser.id;
    } else if (currentUser.role === UserRole.EVENT_MANAGER) {
      resolvedManagerUserId = currentUser.id;
    }

    const parsedStartDate = parseEventDate(startDate);
    if (!parsedStartDate) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "invalidEventDate") },
        { status: 400 }
      );
    }

    const parsedEndDate = endDate ? parseEventDate(endDate) : parsedStartDate;
    if (!parsedEndDate) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "invalidEventDate") },
        { status: 400 }
      );
    }

    const cityValue = normalizeOptionalText(city) || "Shanghai";
    const providedTitleEn = normalizeOptionalText(titleEn);
    const providedDescriptionEn = normalizeOptionalText(descriptionEn);
    const providedShortDescEn = normalizeOptionalText(shortDescEn);
    const providedVenueEn = normalizeOptionalText(venueEn);
    const providedCityEn = normalizeOptionalText(cityEn);

    const translated = await translateMissingEventFieldsToEnglish({
      title: !providedTitleEn ? title : null,
      description: !providedDescriptionEn ? description : null,
      shortDesc: !providedShortDescEn ? shortDesc : null,
      venue: !providedVenueEn ? venue : null,
      city: !providedCityEn ? cityValue : null,
    });

    const finalTitleEn = providedTitleEn || translated.titleEn || null;
    const finalDescriptionEn = providedDescriptionEn || translated.descriptionEn || null;
    const finalShortDescEn = providedShortDescEn || translated.shortDescEn || null;
    const finalVenueEn = providedVenueEn || translated.venueEn || null;
    const finalCityEn = providedCityEn || translated.cityEn || null;

    const event = await prisma.event.create({
      data: {
        title,
        titleEn: finalTitleEn,
        description,
        descriptionEn: finalDescriptionEn,
        shortDesc: shortDesc || null,
        shortDescEn: finalShortDescEn,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        startTime,
        endTime,
        venue,
        venueEn: finalVenueEn,
        address: address || null,
        city: cityValue,
        cityEn: finalCityEn,
        image: image || null,
        type,
        trackId: trackId || null,
        partners: Array.isArray(partners) ? partners : [],
        partnersEn: Array.isArray(partnersEn) ? partnersEn : [],
        maxAttendees: typeof maxAttendees === "number" ? maxAttendees : null,
        isPublished: Boolean(isPublished),
        isFeatured: Boolean(isFeatured),
        requireApproval: Boolean(requireApproval),
        isPinned: Boolean(isPinned),
        managerUserId: resolvedManagerUserId,
        eventLayer: eventLayer && EVENT_LAYERS.has(eventLayer) ? (eventLayer as EventLayer) : null,
        hostType: hostType && EVENT_HOST_TYPES.has(hostType) ? (hostType as EventHostType) : null,
      },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        track: {
          select: {
            id: true,
            code: true,
            name: true,
            nameEn: true,
            category: true,
            color: true,
            icon: true,
            order: true,
          },
        },
        _count: {
          select: {
            registrations: true,
            checkins: true,
            agendaItems: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: apiMessage(requestLocale, "eventCreateSuccess"),
        data: event,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create event error:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "eventCreateFailed") },
      { status: 500 }
    );
  }
}