import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";
import { canManageTracks } from "@/lib/permissions";

const TRACK_CATEGORIES = new Set(["institution", "economy", "foundation", "accelerator"]);

async function requireSessionUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
}

function serializeTrack(track: {
  id: string;
  code: string;
  name: string;
  nameEn: string | null;
  description: string;
  descriptionEn: string | null;
  category: string;
  color: string;
  icon: string;
  order: number;
  partners: unknown;
  partnersEn: unknown;
  _count: { events: number };
}) {
  return {
    id: track.id,
    code: track.code,
    name: track.name,
    nameEn: track.nameEn,
    description: track.description,
    descriptionEn: track.descriptionEn,
    category: track.category,
    color: track.color,
    icon: track.icon,
    order: track.order,
    partners: Array.isArray(track.partners) ? track.partners : [],
    partnersEn: Array.isArray(track.partnersEn) ? track.partnersEn : [],
    eventCount: track._count.events,
  };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let requestLocale = resolveRequestLocale(req);

  try {
    const currentUser = await requireSessionUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "unauthorized") },
        { status: 401 }
      );
    }

    if (!canManageTracks(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "adminOrEventManagerOnly") },
        { status: 403 }
      );
    }

    const body = await req.json();
    requestLocale = resolveRequestLocale(req, body.locale);

    const existingTrack = await prisma.track.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!existingTrack) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "trackNotFound") },
        { status: 404 }
      );
    }

    const data: {
      code?: string;
      name?: string;
      nameEn?: string | null;
      description?: string;
      descriptionEn?: string | null;
      category?: string;
      color?: string;
      icon?: string;
      order?: number;
      partners?: string[];
      partnersEn?: string[];
    } = {};

    if (body.code !== undefined) {
      const code = String(body.code || "").trim();
      if (!code) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "trackRequired") },
          { status: 400 }
        );
      }

      const duplicateTrack = await prisma.track.findUnique({
        where: { code },
        select: { id: true },
      });

      if (duplicateTrack && duplicateTrack.id !== params.id) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "trackCodeExists") },
          { status: 409 }
        );
      }

      data.code = code;
    }

    if (body.name !== undefined) {
      const name = String(body.name || "").trim();
      if (!name) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "trackRequired") },
          { status: 400 }
        );
      }

      data.name = name;
    }

    if (body.description !== undefined) {
      const description = String(body.description || "").trim();
      if (!description) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "trackRequired") },
          { status: 400 }
        );
      }

      data.description = description;
    }

    if (body.category !== undefined) {
      const category = String(body.category || "").trim();
      if (!TRACK_CATEGORIES.has(category)) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "invalidTrackCategory") },
          { status: 400 }
        );
      }

      data.category = category;
    }

    if (body.color !== undefined) {
      const color = String(body.color || "").trim();
      if (!color) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "trackRequired") },
          { status: 400 }
        );
      }

      data.color = color;
    }

    if (body.icon !== undefined) {
      const icon = String(body.icon || "").trim();
      if (!icon) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "trackRequired") },
          { status: 400 }
        );
      }

      data.icon = icon;
    }

    if (body.nameEn !== undefined) {
      data.nameEn = String(body.nameEn || "").trim() || null;
    }

    if (body.descriptionEn !== undefined) {
      data.descriptionEn = String(body.descriptionEn || "").trim() || null;
    }

    if (body.order !== undefined) {
      const order = Number.isFinite(body.order) ? Number(body.order) : Number.parseInt(String(body.order || "0"), 10);
      data.order = Number.isFinite(order) ? order : 0;
    }

    if (body.partners !== undefined) {
      data.partners = Array.isArray(body.partners) ? body.partners : [];
    }

    if (body.partnersEn !== undefined) {
      data.partnersEn = Array.isArray(body.partnersEn) ? body.partnersEn : [];
    }

    const track = await prisma.track.update({
      where: { id: params.id },
      data,
      include: {
        _count: {
          select: {
            events: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: apiMessage(requestLocale, "trackUpdateSuccess"),
      data: serializeTrack(track),
    });
  } catch (error) {
    console.error("Update track error:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "trackUpdateFailed") },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestLocale = resolveRequestLocale(req);

  try {
    const currentUser = await requireSessionUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "unauthorized") },
        { status: 401 }
      );
    }

    if (!canManageTracks(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "adminOrEventManagerOnly") },
        { status: 403 }
      );
    }

    const existingTrack = await prisma.track.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        _count: {
          select: {
            events: true,
          },
        },
      },
    });

    if (!existingTrack) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "trackNotFound") },
        { status: 404 }
      );
    }

    if (existingTrack._count.events > 0) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "trackHasEvents") },
        { status: 409 }
      );
    }

    await prisma.track.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: apiMessage(requestLocale, "trackDeleteSuccess"),
    });
  } catch (error) {
    console.error("Delete track error:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "trackDeleteFailed") },
      { status: 500 }
    );
  }
}