import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";
import {
  agendaDateToUtcDate,
  doAgendaSlotsOverlap,
  isAgendaDateWithinEventRange,
  isAgendaTimeRangeValid,
  isValidAgendaDate,
  normalizeAgendaDateKey,
} from "@/lib/agenda";
import { prisma } from "@/lib/prisma";
import { translateMissingEventFieldsToEnglish, translateRecordValuesToEnglish } from "@/lib/ai-translation";

async function requireEventManager(requestLocale: "zh" | "en", eventId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: apiMessage(requestLocale, "unauthorized"), status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });

  if (!user) {
    return { error: apiMessage(requestLocale, "forbidden"), status: 403 };
  }

  if (user.role === "ADMIN") {
    return { ok: true, role: user.role };
  }

  if (user.role === "EVENT_MANAGER") {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { managerUserId: true },
    });
    if (event?.managerUserId === user.id) {
      return { ok: true, role: user.role };
    }
  }

  return {
    error:
      requestLocale === "zh" ? "你仅可管理被指派活动的议程" : "You can only manage agenda for assigned events",
    status: 403,
  };
}

async function findAgendaConflict(input: {
  eventId: string;
  agendaDate: string;
  startTime: string;
  endTime: string;
}) {
  const agendaDate = agendaDateToUtcDate(input.agendaDate);
  if (!agendaDate) {
    return null;
  }

  const sameDayItems = await prisma.agendaItem.findMany({
    where: {
      eventId: input.eventId,
      agendaDate,
    },
    select: {
      id: true,
      title: true,
      agendaDate: true,
      startTime: true,
      endTime: true,
    },
  });

  return (
    sameDayItems.find((item) =>
      doAgendaSlotsOverlap(input, {
        agendaDate: normalizeAgendaDateKey(item.agendaDate),
        startTime: item.startTime,
        endTime: item.endTime,
      })
    ) || null
  );
}

/**
 * GET /api/events/[id]/agenda
 * List agenda items for an event
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestLocale = resolveRequestLocale(req);

  try {
    const agendaItems = await prisma.agendaItem.findMany({
      where: { eventId: params.id },
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
          },
        },
      },
      orderBy: [{ agendaDate: "asc" }, { order: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json({ success: true, data: agendaItems });
  } catch (error) {
    console.error("Get agenda items error:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "eventDetailFetchFailed") },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/[id]/agenda
 * Create a new agenda item for an event
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestLocale = resolveRequestLocale(req);

  try {
    const auth = await requireEventManager(requestLocale, params.id);
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    // Check event exists
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: { id: true, startDate: true, endDate: true },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "eventNotFound") },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { agendaDate, title, description, titleEn: providedTitleEn, descriptionEn: providedDescriptionEn, startTime, endTime, type, venue, order, speakerIds, moderatorId, speakerMeta } = body;

    if (auth.role === "EVENT_MANAGER" && (speakerIds !== undefined || moderatorId !== undefined || speakerMeta !== undefined)) {
      return NextResponse.json(
        {
          success: false,
          error:
            requestLocale === "zh"
              ? "活动管理员无权设置议程嘉宾"
              : "Event managers are not allowed to assign agenda speakers",
        },
        { status: 403 }
      );
    }

    if (!title || !agendaDate || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "议程日期、标题、开始时间和结束时间为必填项" : "Agenda date, title, start time, and end time are required" },
        { status: 400 }
      );
    }

    if (!isValidAgendaDate(agendaDate)) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "议程日期格式无效" : "Agenda date is invalid" },
        { status: 400 }
      );
    }

    if (!isAgendaTimeRangeValid(startTime, endTime)) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "结束时间必须晚于开始时间" : "End time must be later than start time" },
        { status: 400 }
      );
    }

    if (!isAgendaDateWithinEventRange(agendaDate, event.startDate, event.endDate)) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "议程日期必须落在活动日期范围内" : "Agenda date must fall within the event date range" },
        { status: 400 }
      );
    }

    const conflict = await findAgendaConflict({
      eventId: params.id,
      agendaDate,
      startTime,
      endTime,
    });

    if (conflict) {
      return NextResponse.json(
        {
          success: false,
          error:
            requestLocale === "zh"
              ? `议程时间与现有日程冲突：${conflict.title}（${conflict.startTime}-${conflict.endTime}）`
              : `Agenda time overlaps with existing item: ${conflict.title} (${conflict.startTime}-${conflict.endTime})`,
        },
        { status: 409 }
      );
    }

    const parsedAgendaDate = agendaDateToUtcDate(agendaDate);

    // Auto-translate if English fields not provided
    let finalTitleEn = providedTitleEn || null;
    let finalDescriptionEn = providedDescriptionEn || null;
    if (!finalTitleEn || !finalDescriptionEn) {
      try {
        const translated = await translateMissingEventFieldsToEnglish({
          title: !finalTitleEn ? title : undefined,
          description: !finalDescriptionEn ? description : undefined,
        });
        if (!finalTitleEn) finalTitleEn = translated.titleEn || null;
        if (!finalDescriptionEn) finalDescriptionEn = translated.descriptionEn || null;
      } catch {
        // Translation failure is non-blocking
      }
    }

    const agendaItem = await prisma.agendaItem.create({
      data: {
        eventId: params.id,
        agendaDate: parsedAgendaDate!,
        title,
        titleEn: finalTitleEn || null,
        description: description || null,
        descriptionEn: finalDescriptionEn || null,
        startTime,
        endTime,
        type: type || "keynote",
        venue: venue || null,
        order: typeof order === "number" ? order : 0,
        speakers: auth.role === "ADMIN" && speakerIds?.length
          ? { connect: speakerIds.map((id: string) => ({ id })) }
          : undefined,
        ...(auth.role === "ADMIN" && moderatorId !== undefined && { moderatorId: moderatorId || null }),
        ...(auth.role === "ADMIN" && speakerMeta !== undefined && {
          speakerMeta: await (async () => {
            if (!speakerMeta?.topics || Object.keys(speakerMeta.topics).length === 0) return speakerMeta;
            const topicsToTranslate: Record<string, string> = {};
            Object.entries(speakerMeta.topics as Record<string, string>).forEach(([k, v]) => {
              if (v && !speakerMeta.topicsEn?.[k]) topicsToTranslate[k] = v;
            });
            const translatedTopics = Object.keys(topicsToTranslate).length > 0
              ? await translateRecordValuesToEnglish(topicsToTranslate).catch(() => ({}))
              : {};
            return { ...speakerMeta, topicsEn: { ...(speakerMeta.topicsEn || {}), ...translatedTopics } };
          })(),
        }),
      },
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
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: agendaItem,
      message: requestLocale === "zh" ? "议程项创建成功" : "Agenda item created",
    });
  } catch (error) {
    console.error("Create agenda item error:", error);
    return NextResponse.json(
      { success: false, error: requestLocale === "zh" ? "创建议程项失败" : "Failed to create agenda item" },
      { status: 500 }
    );
  }
}
