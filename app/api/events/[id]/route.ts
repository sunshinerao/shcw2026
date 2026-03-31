import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { EventHostType, EventLayer, UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { normalizeAgendaDateKey } from "@/lib/agenda";
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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestLocale = resolveRequestLocale(req);

  try {
    const currentUser = await requireSessionUser();
    const canViewAllEvents =
      canManageEvents(currentUser?.role) || currentUser?.role === UserRole.STAFF;

    const event = await prisma.event.findFirst({
      where: {
        id: params.id,
        ...(canViewAllEvents ? {} : { isPublished: true }),
      },
      include: {
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
        agendaItems: {
          include: {
            speakers: {
              select: {
                id: true,
                name: true,
                nameEn: true,
                avatar: true,
                title: true,
                titleEn: true,
                organization: true,
                organizationEn: true,
                isKeynote: true,
              },
            },
          },
          orderBy: [{ agendaDate: "asc" }, { order: "asc" }, { startTime: "asc" }],
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

    if (!event) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "eventNotFound") },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...event,
        agendaItems: event.agendaItems.map((item) => ({
          ...item,
          agendaDate: normalizeAgendaDateKey(item.agendaDate),
        })),
      },
    });
  } catch (error) {
    console.error("Get event error:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "eventDetailFetchFailed") },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const existingEvent = await prisma.event.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "eventNotFound") },
        { status: 404 }
      );
    }

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
      isPublished,
      isFeatured,
      requireApproval,
      eventLayer,
      hostType,
    } = body;

    if (title !== undefined && !title) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "eventRequired") },
        { status: 400 }
      );
    }
    if (description !== undefined && !description) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "eventRequired") },
        { status: 400 }
      );
    }
    if (startDate !== undefined && !startDate) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "eventRequired") },
        { status: 400 }
      );
    }
    if (venue !== undefined && !venue) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "eventRequired") },
        { status: 400 }
      );
    }
    if (type !== undefined && !type) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "eventRequired") },
        { status: 400 }
      );
    }

    if (type !== undefined && !EVENT_TYPES.has(type)) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "invalidEventType") },
        { status: 400 }
      );
    }

    let parsedStartDate: Date | undefined;
    if (startDate !== undefined) {
      const nextDate = parseEventDate(startDate);
      if (!nextDate) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "invalidEventDate") },
          { status: 400 }
        );
      }
      parsedStartDate = nextDate;
    }

    let parsedEndDate: Date | undefined;
    if (endDate !== undefined) {
      const nextDate = parseEventDate(endDate);
      if (!nextDate) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "invalidEventDate") },
          { status: 400 }
        );
      }
      parsedEndDate = nextDate;
    }

    const event = await prisma.event.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(titleEn !== undefined && { titleEn: titleEn || null }),
        ...(description !== undefined && { description }),
        ...(descriptionEn !== undefined && { descriptionEn: descriptionEn || null }),
        ...(shortDesc !== undefined && { shortDesc: shortDesc || null }),
        ...(shortDescEn !== undefined && { shortDescEn: shortDescEn || null }),
        ...(parsedStartDate && { startDate: parsedStartDate }),
        ...(parsedEndDate && { endDate: parsedEndDate }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(venue !== undefined && { venue }),
        ...(venueEn !== undefined && { venueEn: venueEn || null }),
        ...(address !== undefined && { address: address || null }),
        ...(city !== undefined && { city: city || null }),
        ...(cityEn !== undefined && { cityEn: cityEn || null }),
        ...(image !== undefined && { image: image || null }),
        ...(type !== undefined && { type }),
        ...(trackId !== undefined && { trackId: trackId || null }),
        ...(partners !== undefined && { partners: Array.isArray(partners) ? partners : [] }),
        ...(partnersEn !== undefined && { partnersEn: Array.isArray(partnersEn) ? partnersEn : [] }),
        ...(maxAttendees !== undefined && {
          maxAttendees: typeof maxAttendees === "number" ? maxAttendees : null,
        }),
        ...(isPublished !== undefined && { isPublished: Boolean(isPublished) }),
        ...(isFeatured !== undefined && { isFeatured: Boolean(isFeatured) }),
        ...(requireApproval !== undefined && { requireApproval: Boolean(requireApproval) }),
        ...(eventLayer !== undefined && {
          eventLayer: eventLayer && EVENT_LAYERS.has(eventLayer) ? (eventLayer as EventLayer) : null,
        }),
        ...(hostType !== undefined && {
          hostType: hostType && EVENT_HOST_TYPES.has(hostType) ? (hostType as EventHostType) : null,
        }),
      },
      include: {
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

    return NextResponse.json({
      success: true,
      message: apiMessage(requestLocale, "eventUpdateSuccess"),
      data: event,
    });
  } catch (error) {
    console.error("Update event error:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "eventUpdateFailed") },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestLocale = resolveRequestLocale(req);

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

    const existingEvent = await prisma.event.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "eventNotFound") },
        { status: 404 }
      );
    }

    await prisma.event.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: apiMessage(requestLocale, "eventDeleteSuccess"),
    });
  } catch (error) {
    console.error("Delete event error:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "eventDeleteFailed") },
      { status: 500 }
    );
  }
}