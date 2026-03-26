import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";
import { canManageEvents } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

async function requireAdmin(requestLocale: "zh" | "en") {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: apiMessage(requestLocale, "unauthorized"), status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || !canManageEvents(user.role)) {
    return { error: apiMessage(requestLocale, "forbidden"), status: 403 };
  }

  return { ok: true };
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
      },
      orderBy: [{ order: "asc" }, { startTime: "asc" }],
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
    const auth = await requireAdmin(requestLocale);
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    // Check event exists
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "eventNotFound") },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { title, description, startTime, endTime, type, venue, order, speakerIds } = body;

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "标题、开始时间和结束时间为必填项" : "Title, start time, and end time are required" },
        { status: 400 }
      );
    }

    const agendaItem = await prisma.agendaItem.create({
      data: {
        eventId: params.id,
        title,
        description: description || null,
        startTime,
        endTime,
        type: type || "keynote",
        venue: venue || null,
        order: typeof order === "number" ? order : 0,
        speakers: speakerIds?.length
          ? { connect: speakerIds.map((id: string) => ({ id })) }
          : undefined,
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
