import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/openclaw-auth";
import {
  agendaDateToUtcDate,
  doAgendaSlotsOverlap,
  isAgendaDateWithinEventRange,
  isAgendaTimeRangeValid,
  isValidAgendaDate,
  normalizeAgendaDateKey,
} from "@/lib/agenda";

const VALID_AGENDA_TYPES = new Set([
  "keynote", "panel", "workshop", "sharing", "launch", "break", "networking",
]);

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

async function findConflict(eventId: string, agendaDate: string, startTime: string, endTime: string, excludeId: string) {
  const dateVal = agendaDateToUtcDate(agendaDate);
  if (!dateVal) return null;
  const items = await prisma.agendaItem.findMany({
    where: { eventId, agendaDate: dateVal, NOT: { id: excludeId } },
    select: { id: true, title: true, agendaDate: true, startTime: true, endTime: true },
  });
  return items.find((item) =>
    doAgendaSlotsOverlap(
      { agendaDate, startTime, endTime },
      { agendaDate: normalizeAgendaDateKey(item.agendaDate), startTime: item.startTime, endTime: item.endTime }
    )
  ) || null;
}

const SPEAKER_SELECT = {
  id: true, name: true, nameEn: true, avatar: true,
  title: true, titleEn: true, organization: true, organizationEn: true, isKeynote: true,
};

/**
 * GET /api/v1/events/[id]/agenda/[aid] — get single agenda item
 * PUT /api/v1/events/[id]/agenda/[aid] — update agenda item
 * DELETE /api/v1/events/[id]/agenda/[aid] — delete agenda item
 */

export async function GET(req: NextRequest, { params }: { params: { id: string; aid: string } }) {
  const auth = await verifyApiKey(req, "events:read");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const item = await prisma.agendaItem.findFirst({
    where: { id: params.aid, eventId: params.id },
    include: {
      speakers: { select: SPEAKER_SELECT },
      moderator: { select: SPEAKER_SELECT },
    },
  });
  if (!item) return NextResponse.json({ success: false, error: "Agenda item not found" }, { status: 404 });

  return NextResponse.json({ success: true, data: item });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string; aid: string } }) {
  const auth = await verifyApiKey(req, "events:write");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const existing = await prisma.agendaItem.findFirst({
    where: { id: params.aid, eventId: params.id },
    select: { id: true, agendaDate: true, startTime: true, endTime: true },
  });
  if (!existing) return NextResponse.json({ success: false, error: "Agenda item not found" }, { status: 404 });

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    select: { startDate: true, endDate: true },
  });
  if (!event) return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });

  const body = await req.json();
  const update: Record<string, unknown> = {};

  // Resolve times (use existing values as fallback for conflict check)
  const newDate = body.agendaDate ?? normalizeAgendaDateKey(existing.agendaDate);
  const newStart = body.startTime ?? existing.startTime;
  const newEnd = body.endTime ?? existing.endTime;

  if (body.agendaDate !== undefined) {
    if (!isValidAgendaDate(body.agendaDate)) {
      return NextResponse.json({ success: false, error: "agendaDate must be YYYY-MM-DD format" }, { status: 400 });
    }
    if (!isAgendaDateWithinEventRange(body.agendaDate, event.startDate, event.endDate)) {
      return NextResponse.json({ success: false, error: "agendaDate must be within the event's date range" }, { status: 400 });
    }
    update.agendaDate = agendaDateToUtcDate(body.agendaDate);
  }
  if (body.startTime !== undefined) update.startTime = body.startTime;
  if (body.endTime !== undefined) update.endTime = body.endTime;

  // Validate final time range
  if (!isAgendaTimeRangeValid(newStart, newEnd)) {
    return NextResponse.json({ success: false, error: "endTime must be after startTime" }, { status: 400 });
  }

  // Overlap check with updated times
  const conflict = await findConflict(params.id, newDate, newStart, newEnd, params.aid);
  if (conflict) {
    return NextResponse.json(
      { success: false, error: `Time conflict with agenda item "${conflict.title}" (${conflict.startTime}-${conflict.endTime})` },
      { status: 409 }
    );
  }

  if (body.title !== undefined) update.title = body.title?.trim() || existing;
  if (body.titleEn !== undefined) update.titleEn = normalizeText(body.titleEn);
  if (body.description !== undefined) update.description = normalizeText(body.description);
  if (body.descriptionEn !== undefined) update.descriptionEn = normalizeText(body.descriptionEn);
  if (body.venue !== undefined) update.venue = normalizeText(body.venue);
  if (typeof body.order === "number") update.order = body.order;
  if (body.speakerMeta !== undefined) update.speakerMeta = body.speakerMeta;

  if (body.type !== undefined) {
    if (!VALID_AGENDA_TYPES.has(body.type)) {
      return NextResponse.json({ success: false, error: `type must be one of: ${[...VALID_AGENDA_TYPES].join(", ")}` }, { status: 400 });
    }
    update.type = body.type;
  }

  // moderatorId
  if (body.moderatorId !== undefined) {
    if (body.moderatorId === null) {
      update.moderatorId = null;
    } else {
      const mod = await prisma.speaker.findUnique({ where: { id: body.moderatorId }, select: { id: true } });
      if (!mod) return NextResponse.json({ success: false, error: `moderatorId "${body.moderatorId}" not found` }, { status: 400 });
      update.moderatorId = body.moderatorId;
    }
  }

  // speakerIds — replace the many-to-many set
  let speakersUpdate: unknown;
  if (Array.isArray(body.speakerIds)) {
    const found = await prisma.speaker.findMany({ where: { id: { in: body.speakerIds } }, select: { id: true } });
    const foundIds = new Set(found.map((s) => s.id));
    const missing = body.speakerIds.filter((id: string) => !foundIds.has(id));
    if (missing.length > 0) {
      return NextResponse.json({ success: false, error: `Speaker IDs not found: ${missing.join(", ")}` }, { status: 400 });
    }
    speakersUpdate = { set: body.speakerIds.map((id: string) => ({ id })) };
  }

  const updated = await prisma.agendaItem.update({
    where: { id: params.aid },
    data: {
      ...update,
      ...(speakersUpdate ? { speakers: speakersUpdate } : {}),
    },
    include: {
      speakers: { select: SPEAKER_SELECT },
      moderator: { select: SPEAKER_SELECT },
    },
  });

  return NextResponse.json({ success: true, data: updated, message: "Agenda item updated" });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; aid: string } }) {
  const auth = await verifyApiKey(req, "events:write");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const existing = await prisma.agendaItem.findFirst({
    where: { id: params.aid, eventId: params.id },
    select: { id: true, title: true },
  });
  if (!existing) return NextResponse.json({ success: false, error: "Agenda item not found" }, { status: 404 });

  await prisma.agendaItem.delete({ where: { id: params.aid } });

  return NextResponse.json({ success: true, message: `Agenda item "${existing.title}" deleted` });
}
