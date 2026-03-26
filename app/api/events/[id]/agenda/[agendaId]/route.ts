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
 * PUT /api/events/[id]/agenda/[agendaId]
 * Update an agenda item
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; agendaId: string } }
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

    const existing = await prisma.agendaItem.findFirst({
      where: { id: params.agendaId, eventId: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "议程项不存在" : "Agenda item not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { title, description, startTime, endTime, type, venue, order, speakerIds } = body;

    const agendaItem = await prisma.agendaItem.update({
      where: { id: params.agendaId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(type !== undefined && { type }),
        ...(venue !== undefined && { venue: venue || null }),
        ...(typeof order === "number" && { order }),
        ...(speakerIds !== undefined && {
          speakers: {
            set: speakerIds.map((id: string) => ({ id })),
          },
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
    const auth = await requireAdmin(requestLocale);
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
