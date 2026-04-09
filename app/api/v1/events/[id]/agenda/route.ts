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

async function findConflict(eventId: string, agendaDate: string, startTime: string, endTime: string, excludeId?: string) {
  const dateVal = agendaDateToUtcDate(agendaDate);
  if (!dateVal) return null;
  const items = await prisma.agendaItem.findMany({
    where: { eventId, agendaDate: dateVal, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
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
 * GET /api/v1/events/[id]/agenda — list agenda items
 * POST /api/v1/events/[id]/agenda — create agenda item
 */

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyApiKey(req, "events:read");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const event = await prisma.event.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!event) return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });

  const items = await prisma.agendaItem.findMany({
    where: { eventId: params.id },
    orderBy: [{ agendaDate: "asc" }, { order: "asc" }, { startTime: "asc" }],
    include: {
      speakers: { select: SPEAKER_SELECT },
      moderator: { select: SPEAKER_SELECT },
    },
  });

  return NextResponse.json({ success: true, data: items });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyApiKey(req, "events:write");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    select: { id: true, startDate: true, endDate: true },
  });
  if (!event) return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });

  const body = await req.json();
  const { agendaDate, title, titleEn, description, descriptionEn,
          startTime, endTime, type, venue, order, speakerIds, moderatorId, speakerMeta } = body;

  // --- Required fields ---
  if (!title?.trim() || !agendaDate || !startTime || !endTime) {
    return NextResponse.json(
      { success: false, error: "title, agendaDate, startTime, endTime are required" },
      { status: 400 }
    );
  }

  if (!isValidAgendaDate(agendaDate)) {
    return NextResponse.json({ success: false, error: "agendaDate must be YYYY-MM-DD format" }, { status: 400 });
  }

  if (!isAgendaTimeRangeValid(startTime, endTime)) {
    return NextResponse.json({ success: false, error: "endTime must be after startTime" }, { status: 400 });
  }

  if (!isAgendaDateWithinEventRange(agendaDate, event.startDate, event.endDate)) {
    return NextResponse.json({ success: false, error: "agendaDate must be within the event's date range" }, { status: 400 });
  }

  if (type && !VALID_AGENDA_TYPES.has(type)) {
    return NextResponse.json(
      { success: false, error: `type must be one of: ${[...VALID_AGENDA_TYPES].join(", ")}` },
      { status: 400 }
    );
  }

  // --- Overlap check ---
  const conflict = await findConflict(params.id, agendaDate, startTime, endTime);
  if (conflict) {
    return NextResponse.json(
      { success: false, error: `Time conflict with agenda item "${conflict.title}" (${conflict.startTime}-${conflict.endTime})` },
      { status: 409 }
    );
  }

  // --- Validate speakers ---
  const resolvedSpeakerIds: string[] = [];
  if (Array.isArray(speakerIds) && speakerIds.length > 0) {
    const found = await prisma.speaker.findMany({ where: { id: { in: speakerIds } }, select: { id: true } });
    const foundIds = new Set(found.map((s) => s.id));
    const missing = speakerIds.filter((id: string) => !foundIds.has(id));
    if (missing.length > 0) {
      return NextResponse.json({ success: false, error: `Speaker IDs not found: ${missing.join(", ")}` }, { status: 400 });
    }
    resolvedSpeakerIds.push(...speakerIds);
  }

  let resolvedModeratorId: string | null = null;
  if (moderatorId) {
    const mod = await prisma.speaker.findUnique({ where: { id: moderatorId }, select: { id: true } });
    if (!mod) return NextResponse.json({ success: false, error: `moderatorId "${moderatorId}" not found` }, { status: 400 });
    resolvedModeratorId = moderatorId;
  }

  const agendaDateUtc = agendaDateToUtcDate(agendaDate)!;

  const item = await prisma.agendaItem.create({
    data: {
      eventId: params.id,
      agendaDate: agendaDateUtc,
      title: title.trim(),
      titleEn: normalizeText(titleEn),
      description: normalizeText(description),
      descriptionEn: normalizeText(descriptionEn),
      startTime,
      endTime,
      type: type || "keynote",
      venue: normalizeText(venue),
      order: typeof order === "number" ? order : 0,
      speakerMeta: speakerMeta || null,
      moderatorId: resolvedModeratorId,
      speakers: resolvedSpeakerIds.length > 0 ? { connect: resolvedSpeakerIds.map((id) => ({ id })) } : undefined,
    },
    include: {
      speakers: { select: SPEAKER_SELECT },
      moderator: { select: SPEAKER_SELECT },
    },
  });

  return NextResponse.json({ success: true, data: item, message: "Agenda item created" }, { status: 201 });
}
