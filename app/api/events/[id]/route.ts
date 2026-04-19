import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { EventHostType, EventLayer, UserRole } from "@prisma/client";
import { translateMissingEventFieldsToEnglish } from "@/lib/ai-translation";
import { agendaDateToUtcDate, isAgendaDateWithinEventRange, isAgendaTimeRangeValid, isValidAgendaDate, normalizeAgendaDateKey } from "@/lib/agenda";
import { backfillAgendaEnglish } from "@/lib/agenda-translation";
import { authOptions } from "@/lib/auth";
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

function buildEventDateSlots(input: {
  eventDateSlots: Array<{ scheduleDate: string; startTime: string; endTime: string }> | undefined;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
}) {
  const rawSlots = Array.isArray(input.eventDateSlots) ? input.eventDateSlots : [];
  const slots = (rawSlots.length > 0
    ? rawSlots
    : [{
        scheduleDate: normalizeAgendaDateKey(input.startDate),
        startTime: input.startTime,
        endTime: input.endTime,
      }])
    .map((slot) => ({
      scheduleDate: normalizeAgendaDateKey(slot.scheduleDate),
      startTime: slot.startTime,
      endTime: slot.endTime,
    }))
    .sort((left, right) => left.scheduleDate.localeCompare(right.scheduleDate));

  if (slots.length === 0) {
    throw new Error("At least one event date slot is required");
  }

  for (const slot of slots) {
    if (!isValidAgendaDate(slot.scheduleDate)) {
      throw new Error("Invalid event date slot date");
    }

    if (!isAgendaTimeRangeValid(slot.startTime, slot.endTime)) {
      throw new Error("Invalid event date slot time range");
    }

    if (!isAgendaDateWithinEventRange(slot.scheduleDate, input.startDate, input.endDate)) {
      throw new Error("Event date slot must fall within event date range");
    }
  }

  return slots.map((slot) => ({
    scheduleDate: agendaDateToUtcDate(slot.scheduleDate)!,
    startTime: slot.startTime,
    endTime: slot.endTime,
  }));
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestLocale = resolveRequestLocale(req);

  try {
    const currentUser = await requireSessionUser();
    const isAdmin = currentUser?.role === UserRole.ADMIN;
    const isStaff = currentUser?.role === UserRole.STAFF;
    const isEventManager = currentUser?.role === UserRole.EVENT_MANAGER;
    const canViewUnpublished = isAdmin || isStaff || isEventManager;

    const event = await prisma.event.findFirst({
      where: {
        id: params.id,
        ...(canViewUnpublished
          ? {}
          : currentUser?.role === UserRole.EVENT_MANAGER && currentUser?.id
            ? { OR: [{ isPublished: true }, { managerUserId: currentUser.id }] }
            : { isPublished: true }),
      },
      include: {
        eventDateSlots: {
          orderBy: [{ scheduleDate: "asc" }],
        },
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
        institutions: {
          orderBy: [{ order: "asc" }],
          include: {
            institution: {
              select: {
                id: true,
                slug: true,
                name: true,
                nameEn: true,
                logo: true,
                orgType: true,
              },
            },
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
                roles: {
                  where: { isCurrent: true },
                  orderBy: [{ order: "asc" }, { startYear: "desc" }],
                  select: {
                    id: true,
                    title: true,
                    titleEn: true,
                    organization: true,
                    organizationEn: true,
                    isCurrent: true,
                    order: true,
                  },
                },
              },
            },
            moderator: {
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
                roles: {
                  where: { isCurrent: true },
                  orderBy: [{ order: "asc" }, { startYear: "desc" }],
                  select: {
                    id: true,
                    title: true,
                    titleEn: true,
                    organization: true,
                    organizationEn: true,
                    isCurrent: true,
                    order: true,
                  },
                },
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

    const normalizedAgendaItems = event.agendaItems.map((item) => ({
      ...item,
      agendaDate: normalizeAgendaDateKey(item.agendaDate),
    }));

    const hydratedAgendaItems = requestLocale === "en"
      ? await backfillAgendaEnglish(normalizedAgendaItems)
      : normalizedAgendaItems;

    return NextResponse.json({
      success: true,
      data: {
        ...event,
        eventDateSlots: event.eventDateSlots.map((slot) => ({
          ...slot,
          scheduleDate: normalizeAgendaDateKey(slot.scheduleDate),
        })),
        agendaItems: hydratedAgendaItems,
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
      select: {
        id: true,
        managerUserId: true,
        isPublished: true,
        title: true,
        titleEn: true,
        description: true,
        descriptionEn: true,
        shortDesc: true,
        shortDescEn: true,
        venue: true,
        venueEn: true,
        city: true,
        cityEn: true,
        address: true,
        addressEn: true,
        startDate: true,
        endDate: true,
        startTime: true,
        endTime: true,
      },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "eventNotFound") },
        { status: 404 }
      );
    }

    const canManageThisEvent =
      currentUser.role === UserRole.ADMIN ||
      (currentUser.role === UserRole.EVENT_MANAGER
        && (existingEvent.managerUserId === currentUser.id || !existingEvent.isPublished));
    const canEditRestrictedEventFields = currentUser.role === UserRole.ADMIN;

    if (!canManageThisEvent) {
      return NextResponse.json(
        {
          success: false,
          error:
            requestLocale === "zh"
              ? "你仅可管理被指派的活动"
              : "You can only manage events assigned to you",
        },
        { status: 403 }
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
      addressEn,
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
      isPinned,
      isClosed,
      eventDateSlots,
      managerUserId,
      invitationContentHtml_zh,
      invitationContentHtml_en,
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

    let resolvedManagerUserId: string | null | undefined;
    if (managerUserId !== undefined) {
      if (currentUser.role !== UserRole.ADMIN) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "forbidden") },
          { status: 403 }
        );
      }

      if (!managerUserId) {
        resolvedManagerUserId = null;
      } else {
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
      }
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

    const nextTitle = title !== undefined ? title : existingEvent.title;
    const nextDescription = description !== undefined ? description : existingEvent.description;
    const nextShortDesc = shortDesc !== undefined ? shortDesc : existingEvent.shortDesc;
    const nextVenue = venue !== undefined ? venue : existingEvent.venue;
    const nextCity = city !== undefined ? city : existingEvent.city;

    const manualTitleEn = titleEn !== undefined ? normalizeOptionalText(titleEn) : undefined;
    const manualDescriptionEn = descriptionEn !== undefined ? normalizeOptionalText(descriptionEn) : undefined;
    const manualShortDescEn = shortDescEn !== undefined ? normalizeOptionalText(shortDescEn) : undefined;
    const manualVenueEn = venueEn !== undefined ? normalizeOptionalText(venueEn) : undefined;
    const manualAddressEn = addressEn !== undefined ? normalizeOptionalText(addressEn) : undefined;
    const manualCityEn = cityEn !== undefined ? normalizeOptionalText(cityEn) : undefined;

    const baseTitleEn = manualTitleEn !== undefined ? manualTitleEn : existingEvent.titleEn;
    const baseDescriptionEn =
      manualDescriptionEn !== undefined ? manualDescriptionEn : existingEvent.descriptionEn;
    const baseShortDescEn =
      manualShortDescEn !== undefined ? manualShortDescEn : existingEvent.shortDescEn;
    const baseVenueEn = manualVenueEn !== undefined ? manualVenueEn : existingEvent.venueEn;
    const baseAddressEn = manualAddressEn !== undefined ? manualAddressEn : existingEvent.addressEn;
    const baseCityEn = manualCityEn !== undefined ? manualCityEn : existingEvent.cityEn;

    const translated = await translateMissingEventFieldsToEnglish({
      title: !baseTitleEn ? nextTitle : null,
      description: !baseDescriptionEn ? nextDescription : null,
      shortDesc: !baseShortDescEn ? nextShortDesc : null,
      venue: !baseVenueEn ? nextVenue : null,
      address: !baseAddressEn ? (address !== undefined ? address || null : existingEvent.address) : null,
      city: !baseCityEn ? nextCity : null,
    });

    const finalTitleEn = baseTitleEn || translated.titleEn || null;
    const finalDescriptionEn = baseDescriptionEn || translated.descriptionEn || null;
    const finalShortDescEn = baseShortDescEn || translated.shortDescEn || null;
    const finalVenueEn = baseVenueEn || translated.venueEn || null;
    const finalAddressEn = baseAddressEn || translated.addressEn || null;
    const finalCityEn = baseCityEn || translated.cityEn || null;

    const nextStartDate = parsedStartDate || existingEvent.startDate;
    const nextEndDate = parsedEndDate || existingEvent.endDate || nextStartDate;
    const nextStartTime = startTime !== undefined ? startTime : existingEvent.startTime;
    const nextEndTime = endTime !== undefined ? endTime : existingEvent.endTime;

    const normalizedEventDateSlots = buildEventDateSlots({
      eventDateSlots,
      startDate: nextStartDate,
      endDate: nextEndDate,
      startTime: nextStartTime,
      endTime: nextEndTime,
    });
    const firstEventDateSlot = normalizedEventDateSlots[0];
    const lastEventDateSlot = normalizedEventDateSlots[normalizedEventDateSlots.length - 1];

    const event = await prisma.event.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...((title !== undefined || titleEn !== undefined || existingEvent.titleEn === null) && {
          titleEn: finalTitleEn,
        }),
        ...(description !== undefined && { description }),
        ...((description !== undefined || descriptionEn !== undefined || existingEvent.descriptionEn === null) && {
          descriptionEn: finalDescriptionEn,
        }),
        ...(shortDesc !== undefined && { shortDesc: shortDesc || null }),
        ...((shortDesc !== undefined || shortDescEn !== undefined || existingEvent.shortDescEn === null) && {
          shortDescEn: finalShortDescEn,
        }),
        startDate: firstEventDateSlot.scheduleDate,
        endDate: lastEventDateSlot.scheduleDate,
        startTime: firstEventDateSlot.startTime,
        endTime: lastEventDateSlot.endTime,
        ...(venue !== undefined && { venue }),
        ...((venue !== undefined || venueEn !== undefined || existingEvent.venueEn === null) && {
          venueEn: finalVenueEn,
        }),
        ...(address !== undefined && { address: address || null }),
        ...((address !== undefined || addressEn !== undefined || existingEvent.addressEn === null) && {
          addressEn: finalAddressEn,
        }),
        ...(city !== undefined && { city: city || null }),
        ...((city !== undefined || cityEn !== undefined || existingEvent.cityEn === null) && {
          cityEn: finalCityEn,
        }),
        ...(image !== undefined && { image: image || null }),
        ...(canEditRestrictedEventFields && type !== undefined && { type }),
        ...(trackId !== undefined && { trackId: trackId || null }),
        ...(partners !== undefined && { partners: Array.isArray(partners) ? partners : [] }),
        ...(partnersEn !== undefined && { partnersEn: Array.isArray(partnersEn) ? partnersEn : [] }),
        ...(maxAttendees !== undefined && {
          maxAttendees: typeof maxAttendees === "number" ? maxAttendees : null,
        }),
        ...(isPublished !== undefined && { isPublished: Boolean(isPublished) }),
        ...(canEditRestrictedEventFields && isFeatured !== undefined && { isFeatured: Boolean(isFeatured) }),
        ...(canEditRestrictedEventFields && isPinned !== undefined && { isPinned: Boolean(isPinned) }),
        ...(requireApproval !== undefined && { requireApproval: Boolean(requireApproval) }),
        ...(isClosed !== undefined && { isClosed: Boolean(isClosed) }),
        ...(invitationContentHtml_zh !== undefined && {
          invitationContentHtml_zh: invitationContentHtml_zh || null,
        }),
        ...(invitationContentHtml_en !== undefined && {
          invitationContentHtml_en: invitationContentHtml_en || null,
        }),
        eventDateSlots: {
          deleteMany: {},
          create: normalizedEventDateSlots,
        },
        ...(resolvedManagerUserId !== undefined && { managerUserId: resolvedManagerUserId }),
        ...(canEditRestrictedEventFields && eventLayer !== undefined && {
          eventLayer: eventLayer && EVENT_LAYERS.has(eventLayer) ? (eventLayer as EventLayer) : null,
        }),
        ...(canEditRestrictedEventFields && hostType !== undefined && {
          hostType: hostType && EVENT_HOST_TYPES.has(hostType) ? (hostType as EventHostType) : null,
        }),
      },
      include: {
        eventDateSlots: {
          orderBy: [{ scheduleDate: "asc" }],
        },
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
      select: { id: true, managerUserId: true },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "eventNotFound") },
        { status: 404 }
      );
    }

    const canManageThisEvent =
      currentUser.role === UserRole.ADMIN ||
      (currentUser.role === UserRole.EVENT_MANAGER && existingEvent.managerUserId === currentUser.id);

    if (!canManageThisEvent) {
      return NextResponse.json(
        {
          success: false,
          error:
            requestLocale === "zh"
              ? "你仅可删除被指派的活动"
              : "You can only delete events assigned to you",
        },
        { status: 403 }
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