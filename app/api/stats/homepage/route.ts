import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1. Event Days: count distinct dates across all published events
    const events = await prisma.event.findMany({
      where: { isPublished: true },
      select: { startDate: true, endDate: true },
    });

    const dateSet = new Set<string>();
    for (const event of events) {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      const current = new Date(start);
      while (current <= end) {
        dateSet.add(current.toISOString().slice(0, 10));
        current.setDate(current.getDate() + 1);
      }
    }
    const eventDays = dateSet.size;

    // 2. Thematic Forums: count published events
    const forums = await prisma.event.count({
      where: { isPublished: true },
    });

    // 3. Speakers: count keynote speakers
    const keynoteSpeakers = await prisma.speaker.count({
      where: { isKeynote: true },
    });

    // 4. Attendees: fixed value
    const attendees = 200000;

    return NextResponse.json({
      eventDays,
      forums,
      keynoteSpeakers,
      attendees,
    });
  } catch {
    return NextResponse.json(
      { eventDays: 0, forums: 0, keynoteSpeakers: 0, attendees: 200000 },
      { status: 500 }
    );
  }
}
