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

export async function GET(req: NextRequest) {
  const requestLocale = resolveRequestLocale(req);

  try {
    const currentUser = await requireSessionUser();
    const includeAllEvents = canManageTracks(currentUser?.role);
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const tracks = await prisma.track.findMany({
      where: category && category !== "all" ? { category } : undefined,
      include: {
        events: {
          where: includeAllEvents ? undefined : { isPublished: true },
          select: { id: true },
        },
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({
      success: true,
      data: tracks.map((track) => ({
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
        eventCount: track.events.length,
      })),
    });
  } catch (error) {
    console.error("Get tracks error:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "trackListFetchFailed") },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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
        { success: false, error: apiMessage(requestLocale, "adminOnly") },
        { status: 403 }
      );
    }

    const body = await req.json();
    requestLocale = resolveRequestLocale(req, body.locale);

    const code = String(body.code || "").trim();
    const name = String(body.name || "").trim();
    const nameEn = String(body.nameEn || "").trim();
    const description = String(body.description || "").trim();
    const descriptionEn = String(body.descriptionEn || "").trim();
    const category = String(body.category || "").trim();
    const color = String(body.color || "").trim();
    const icon = String(body.icon || "").trim();
    const order = Number.isFinite(body.order) ? Number(body.order) : Number.parseInt(String(body.order || "0"), 10);

    if (!code || !name || !description || !category || !color || !icon) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "trackRequired") },
        { status: 400 }
      );
    }

    if (!TRACK_CATEGORIES.has(category)) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "invalidTrackCategory") },
        { status: 400 }
      );
    }

    const existingTrack = await prisma.track.findUnique({
      where: { code },
      select: { id: true },
    });

    if (existingTrack) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "trackCodeExists") },
        { status: 409 }
      );
    }

    const track = await prisma.track.create({
      data: {
        code,
        name,
        nameEn: nameEn || null,
        description,
        descriptionEn: descriptionEn || null,
        category,
        color,
        icon,
        order: Number.isFinite(order) ? order : 0,
        partners: Array.isArray(body.partners) ? body.partners : [],
        partnersEn: Array.isArray(body.partnersEn) ? body.partnersEn : [],
      },
      include: {
        _count: {
          select: {
            events: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: apiMessage(requestLocale, "trackCreateSuccess"),
        data: {
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
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create track error:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "trackCreateFailed") },
      { status: 500 }
    );
  }
}