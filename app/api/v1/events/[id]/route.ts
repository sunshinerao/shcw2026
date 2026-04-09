import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/openclaw-auth";
import { normalizeAgendaDateKey } from "@/lib/agenda";

const VALID_TYPES = new Set(["forum", "workshop", "ceremony", "conference", "networking"]);

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

/**
 * GET /api/v1/events/[id] — get event + agenda
 * PUT /api/v1/events/[id] — update event
 * DELETE /api/v1/events/[id] — delete event
 */

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyApiKey(req, "events:read");
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      track: { select: { id: true, name: true, nameEn: true, code: true, color: true } },
      eventDateSlots: { orderBy: { scheduleDate: "asc" } },
      agendaItems: {
        orderBy: [{ agendaDate: "asc" }, { order: "asc" }, { startTime: "asc" }],
        include: {
          speakers: {
            select: {
              id: true, name: true, nameEn: true, avatar: true,
              title: true, titleEn: true, organization: true, organizationEn: true, isKeynote: true,
            },
          },
          moderator: {
            select: {
              id: true, name: true, nameEn: true, avatar: true,
              title: true, titleEn: true, organization: true, organizationEn: true,
            },
          },
        },
      },
      _count: { select: { registrations: true } },
    },
  });

  if (!event) {
    return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: event });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyApiKey(req, "events:write");
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const existing = await prisma.event.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
  }

  const body = await req.json();
  const update: Record<string, unknown> = {};

  // String fields
  const stringFields: Record<string, string> = {
    title: "title", titleEn: "titleEn", description: "description", descriptionEn: "descriptionEn",
    shortDesc: "shortDesc", shortDescEn: "shortDescEn",
    venue: "venue", venueEn: "venueEn", address: "address", addressEn: "addressEn",
    city: "city", cityEn: "cityEn", startTime: "startTime", endTime: "endTime",
  };
  for (const [key] of Object.entries(stringFields)) {
    if (body[key] !== undefined) {
      update[key] = normalizeText(body[key]);
    }
  }
  if (body.type !== undefined) {
    if (!VALID_TYPES.has(body.type)) {
      return NextResponse.json({ success: false, error: `type must be one of: ${[...VALID_TYPES].join(", ")}` }, { status: 400 });
    }
    update.type = body.type;
  }

  // Date fields
  if (body.startDate !== undefined) {
    const d = parseDate(body.startDate);
    if (!d) return NextResponse.json({ success: false, error: "Invalid startDate" }, { status: 400 });
    update.startDate = d;
  }
  if (body.endDate !== undefined) {
    const d = parseDate(body.endDate);
    if (!d) return NextResponse.json({ success: false, error: "Invalid endDate" }, { status: 400 });
    update.endDate = d;
  }

  // Boolean flags
  const boolFields = ["isPublished", "isFeatured", "isPinned", "requireApproval", "isClosed"];
  for (const key of boolFields) {
    if (typeof body[key] === "boolean") update[key] = body[key];
  }

  // Numeric
  if (body.maxAttendees !== undefined) {
    update.maxAttendees = typeof body.maxAttendees === "number" ? body.maxAttendees : null;
  }

  // trackId
  if (body.trackId !== undefined) {
    if (body.trackId === null) {
      update.trackId = null;
    } else {
      const track = await prisma.track.findUnique({ where: { id: body.trackId }, select: { id: true } });
      if (!track) return NextResponse.json({ success: false, error: `trackId "${body.trackId}" does not exist` }, { status: 400 });
      update.trackId = body.trackId;
    }
  }

  // Duplicate title check (if title is being changed)
  if (update.title) {
    const dup = await prisma.event.findFirst({
      where: { title: { equals: update.title as string, mode: "insensitive" }, NOT: { id: params.id } },
      select: { id: true },
    });
    if (dup) {
      return NextResponse.json({ success: false, error: `Another event with title "${update.title}" already exists (id: ${dup.id})` }, { status: 409 });
    }
  }

  // eventDateSlots — if provided, replace all existing slots
  if (Array.isArray(body.eventDateSlots)) {
    const seen = new Set<string>();
    const slots = [];
    for (const slot of body.eventDateSlots) {
      const sd = parseDate(slot.scheduleDate);
      if (!sd) return NextResponse.json({ success: false, error: `Invalid scheduleDate: ${slot.scheduleDate}` }, { status: 400 });
      const key = normalizeAgendaDateKey(sd);
      if (seen.has(key)) return NextResponse.json({ success: false, error: `Duplicate scheduleDate: ${key}` }, { status: 400 });
      seen.add(key);
      slots.push({ scheduleDate: sd, startTime: slot.startTime || "09:00", endTime: slot.endTime || "17:00" });
    }
    update.eventDateSlots = {
      deleteMany: {},
      create: slots,
    };
  }

  const updated = await prisma.event.update({
    where: { id: params.id },
    data: update,
    include: {
      track: { select: { id: true, name: true, nameEn: true } },
      eventDateSlots: { orderBy: { scheduleDate: "asc" } },
    },
  });

  return NextResponse.json({ success: true, data: updated, message: "Event updated successfully" });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyApiKey(req, "events:write");
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const existing = await prisma.event.findUnique({ where: { id: params.id }, select: { id: true, title: true } });
  if (!existing) {
    return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
  }

  await prisma.event.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true, message: `Event "${existing.title}" deleted` });
}
