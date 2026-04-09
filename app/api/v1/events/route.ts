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
 * GET /api/v1/events — list published events
 * POST /api/v1/events — create a new event
 */

export async function GET(req: NextRequest) {
  const auth = await verifyApiKey(req, "events:read");
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
  const search = searchParams.get("search")?.trim() || "";
  const type = searchParams.get("type");
  const trackId = searchParams.get("trackId");
  const published = searchParams.get("published"); // "true" | "false" | unset (all)

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { titleEn: { contains: search, mode: "insensitive" } },
      { venue: { contains: search, mode: "insensitive" } },
    ];
  }
  if (type && VALID_TYPES.has(type)) where.type = type;
  if (trackId) where.trackId = trackId;
  // By default, return only published events. Pass published=all to see all.
  if (published === "all") {
    // no filter
  } else if (published === "false") {
    where.isPublished = false;
  } else {
    where.isPublished = true;
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { startDate: "asc" }, { startTime: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        track: { select: { id: true, name: true, nameEn: true, code: true, color: true } },
        eventDateSlots: { orderBy: { scheduleDate: "asc" } },
        _count: { select: { registrations: true } },
      },
    }),
    prisma.event.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: events,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

export async function POST(req: NextRequest) {
  const auth = await verifyApiKey(req, "events:write");
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await req.json();
  const {
    title, titleEn, description, descriptionEn, shortDesc, shortDescEn,
    startDate, endDate, startTime, endTime,
    venue, venueEn, address, addressEn, city, cityEn,
    type, trackId, maxAttendees, requireApproval, isClosed, isPublished, isFeatured, isPinned,
    eventDateSlots,
  } = body;

  // --- Required field validation ---
  if (!title?.trim()) {
    return NextResponse.json({ success: false, error: "title is required" }, { status: 400 });
  }
  if (!description?.trim()) {
    return NextResponse.json({ success: false, error: "description is required" }, { status: 400 });
  }
  if (!venue?.trim()) {
    return NextResponse.json({ success: false, error: "venue is required" }, { status: 400 });
  }
  if (!type || !VALID_TYPES.has(type)) {
    return NextResponse.json(
      { success: false, error: `type must be one of: ${[...VALID_TYPES].join(", ")}` },
      { status: 400 }
    );
  }

  const parsedStartDate = parseDate(startDate);
  const parsedEndDate = parseDate(endDate || startDate);
  if (!parsedStartDate) {
    return NextResponse.json({ success: false, error: "startDate is required and must be a valid ISO date" }, { status: 400 });
  }
  if (!parsedEndDate || parsedEndDate < parsedStartDate) {
    return NextResponse.json({ success: false, error: "endDate must be a valid date >= startDate" }, { status: 400 });
  }

  const timeRe = /^\d{2}:\d{2}$/;
  const resolvedStartTime = typeof startTime === "string" && timeRe.test(startTime) ? startTime : "09:00";
  const resolvedEndTime = typeof endTime === "string" && timeRe.test(endTime) ? endTime : "17:00";

  // --- Duplicate title check ---
  const duplicate = await prisma.event.findFirst({
    where: { title: { equals: title.trim(), mode: "insensitive" } },
    select: { id: true },
  });
  if (duplicate) {
    return NextResponse.json(
      { success: false, error: `An event with title "${title.trim()}" already exists (id: ${duplicate.id})` },
      { status: 409 }
    );
  }

  // --- Validate trackId if provided ---
  if (trackId) {
    const track = await prisma.track.findUnique({ where: { id: trackId }, select: { id: true } });
    if (!track) {
      return NextResponse.json({ success: false, error: `trackId "${trackId}" does not exist` }, { status: 400 });
    }
  }

  // --- Build eventDateSlots ---
  let slotsData: Array<{ scheduleDate: Date; startTime: string; endTime: string }> | undefined;
  if (Array.isArray(eventDateSlots) && eventDateSlots.length > 0) {
    const seen = new Set<string>();
    slotsData = [];
    for (const slot of eventDateSlots) {
      const sd = parseDate(slot.scheduleDate);
      if (!sd) {
        return NextResponse.json({ success: false, error: `Invalid scheduleDate: ${slot.scheduleDate}` }, { status: 400 });
      }
      const key = normalizeAgendaDateKey(sd);
      if (seen.has(key)) {
        return NextResponse.json({ success: false, error: `Duplicate scheduleDate: ${key}` }, { status: 400 });
      }
      seen.add(key);
      slotsData.push({ scheduleDate: sd, startTime: slot.startTime || resolvedStartTime, endTime: slot.endTime || resolvedEndTime });
    }
  }

  const event = await prisma.event.create({
    data: {
      title: title.trim(),
      titleEn: normalizeText(titleEn),
      description: description.trim(),
      descriptionEn: normalizeText(descriptionEn),
      shortDesc: normalizeText(shortDesc),
      shortDescEn: normalizeText(shortDescEn),
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      startTime: resolvedStartTime,
      endTime: resolvedEndTime,
      venue: venue.trim(),
      venueEn: normalizeText(venueEn),
      address: normalizeText(address),
      addressEn: normalizeText(addressEn),
      city: normalizeText(city),
      cityEn: normalizeText(cityEn),
      type,
      trackId: trackId || null,
      maxAttendees: typeof maxAttendees === "number" ? maxAttendees : null,
      requireApproval: requireApproval === true,
      isClosed: isClosed === true,
      isPublished: isPublished === true,
      isFeatured: isFeatured === true,
      isPinned: isPinned === true,
      ...(slotsData
        ? { eventDateSlots: { create: slotsData } }
        : {}),
    },
    include: {
      track: { select: { id: true, name: true, nameEn: true } },
      eventDateSlots: { orderBy: { scheduleDate: "asc" } },
    },
  });

  return NextResponse.json(
    { success: true, data: event, message: "Event created successfully" },
    { status: 201 }
  );
}
