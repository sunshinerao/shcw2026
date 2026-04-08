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
    return {
      error:
        requestLocale === "zh" ? "你仅可管理被指派活动的议程" : "You can only manage agenda for assigned events",
      status: 403,
    };
  }

  return { error: apiMessage(requestLocale, "forbidden"), status: 403 };
}

async function findAgendaConflict(input: {
  eventId: string;
  agendaDate: string;
  startTime: string;
  endTime: string;
  excludeId: string;
}) {
  const agendaDate = agendaDateToUtcDate(input.agendaDate);
  if (!agendaDate) {
    return null;
  }

  const sameDayItems = await prisma.agendaItem.findMany({
    where: {
      eventId: input.eventId,
      agendaDate,
      id: { not: input.excludeId },
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
 * PUT /api/events/[id]/agenda/[agendaId]
 * Update an agenda item
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; agendaId: string } }
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

    const existing = await prisma.agendaItem.findFirst({
      where: { id: params.agendaId, eventId: params.id },
      select: {
        id: true,
        eventId: true,
        agendaDate: true,
        startTime: true,
        endTime: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "议程项不存在" : "Agenda item not found" },
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

    if (title !== undefined && !title) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "标题不能为空" : "Title is required" },
        { status: 400 }
      );
    }

    const nextAgendaDate = agendaDate ?? normalizeAgendaDateKey(existing.agendaDate);
    const nextStartTime = startTime ?? existing.startTime;
    const nextEndTime = endTime ?? existing.endTime;

    if (!isValidAgendaDate(nextAgendaDate)) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "议程日期格式无效" : "Agenda date is invalid" },
        { status: 400 }
      );
    }

    if (!isAgendaTimeRangeValid(nextStartTime, nextEndTime)) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "结束时间必须晚于开始时间" : "End time must be later than start time" },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: { startDate: true, endDate: true },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "eventNotFound") },
        { status: 404 }
      );
    }

    if (!isAgendaDateWithinEventRange(nextAgendaDate, event.startDate, event.endDate)) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "议程日期必须落在活动日期范围内" : "Agenda date must fall within the event date range" },
        { status: 400 }
      );
    }

    const conflict = await findAgendaConflict({
      eventId: params.id,
      agendaDate: nextAgendaDate,
      startTime: nextStartTime,
      endTime: nextEndTime,
      excludeId: params.agendaId,
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

    // Auto-translate missing English fields
    let finalTitleEn: string | null | undefined = providedTitleEn;
    let finalDescriptionEn: string | null | undefined = providedDescriptionEn;
    if ((title !== undefined && !finalTitleEn) || (description !== undefined && !finalDescriptionEn)) {
      try {
        const translated = await translateMissingEventFieldsToEnglish({
          title: title !== undefined && !finalTitleEn ? title : undefined,
          description: description !== undefined && !finalDescriptionEn ? description : undefined,
        });
        if (title !== undefined && !finalTitleEn) finalTitleEn = translated.titleEn || null;
        if (description !== undefined && !finalDescriptionEn) finalDescriptionEn = translated.descriptionEn || null;
      } catch {
        // Translation failure is non-blocking
      }
    }

    const agendaItem = await prisma.agendaItem.update({
      where: { id: params.agendaId },
      data: {
        ...(agendaDate !== undefined && { agendaDate: agendaDateToUtcDate(nextAgendaDate)! }),
        ...(title !== undefined && { title }),
        ...(finalTitleEn !== undefined && { titleEn: finalTitleEn || null }),
        ...(description !== undefined && { description: description || null }),
        ...(finalDescriptionEn !== undefined && { descriptionEn: finalDescriptionEn || null }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(type !== undefined && { type }),
        ...(venue !== undefined && { venue: venue || null }),
        ...(typeof order === "number" && { order }),
        ...(auth.role === "ADMIN" && speakerIds !== undefined && {
          speakers: {
            set: speakerIds.map((id: string) => ({ id })),
          },
        }),
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
      message: requestLocale === "zh" ? "议程项更新成功" : "Agenda item updated",
    });
  } catch (error) {
    console.error("Update agenda item error:", error);
    return NextResponse.json(
      { success: false, error: requestLocale === "zh" ? "更新议程项失败" : "Failed to update agenda item" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[id]/agenda/[agendaId]
 * Delete an agenda item
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; agendaId: string } }
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

    const existing = await prisma.agendaItem.findFirst({
      where: { id: params.agendaId, eventId: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "议程项不存在" : "Agenda item not found" },
        { status: 404 }
      );
    }

    await prisma.agendaItem.delete({
      where: { id: params.agendaId },
    });

    return NextResponse.json({
      success: true,
      message: requestLocale === "zh" ? "议程项删除成功" : "Agenda item deleted",
    });
  } catch (error) {
    console.error("Delete agenda item error:", error);
    return NextResponse.json(
      { success: false, error: requestLocale === "zh" ? "删除议程项失败" : "Failed to delete agenda item" },
      { status: 500 }
    );
  }
}
