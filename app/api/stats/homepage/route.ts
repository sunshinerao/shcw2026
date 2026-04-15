import { RegistrationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { countDistinctEventDays } from "@/lib/homepage-stats";
import { prisma } from "@/lib/prisma";
import { getSystemSettingsForServer } from "@/lib/system-settings";

export async function GET() {
  try {
    const [events, forums, speakers, attendees, settings] = await Promise.all([
      prisma.event.findMany({
        where: { isPublished: true },
        select: { startDate: true, endDate: true },
      }),
      prisma.event.count({
        where: { isPublished: true },
      }),
      prisma.speaker.count({
        where: { isVisible: true },
      }),
      prisma.registration.count({
        where: {
          status: {
            in: [RegistrationStatus.REGISTERED, RegistrationStatus.ATTENDED],
          },
        },
      }),
      getSystemSettingsForServer(),
    ]);

    return NextResponse.json({
      eventDays: countDistinctEventDays(events),
      forums,
      speakers,
      attendees,
      showAttendees: settings.homepageAttendeesEnabled === true,
    });
  } catch {
    return NextResponse.json(
      { eventDays: 0, forums: 0, speakers: 0, attendees: 0, showAttendees: false },
      { status: 500 }
    );
  }
}
