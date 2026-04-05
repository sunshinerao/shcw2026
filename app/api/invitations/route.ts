import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { InvitationStatus, Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";
import { countInvitationBodyChars, getInvitationRequestBodyCharLimit } from "@/lib/invitation-content-limits";
import { canManageEvents, isAdminRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { normalizeSalutationValue } from "@/lib/user-form-options";

async function requireSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
}

// GET: List invitation requests
// - Admin/EventManager: see all with filters
// - Authenticated user: see only their own
export async function GET(req: NextRequest) {
  const requestLocale = resolveRequestLocale(req);

  try {
    const currentUser = await requireSessionUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "unauthorized") },
        { status: 401 }
      );
    }

    const isManager = canManageEvents(currentUser.role);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
    const status = searchParams.get("status");

    const where: Prisma.InvitationRequestWhereInput = {};

    if (!isManager) {
      // Regular user: only own requests
      where.userId = currentUser.id;
    } else if (!isAdminRole(currentUser.role)) {
      // EVENT_MANAGER: only invitations linked to their managed events
      const managedEvents = await prisma.event.findMany({
        where: { managerUserId: currentUser.id },
        select: { id: true },
      });
      where.eventId = { in: managedEvents.map((e) => e.id) };
    }
    // ADMIN: no filter — sees everything

    if (status) {
      const validStatuses = new Set(Object.values(InvitationStatus));
      if (validStatuses.has(status as InvitationStatus)) {
        where.status = status as InvitationStatus;
      }
    }

    const skip = (page - 1) * pageSize;

    const [requests, total] = await Promise.all([
      prisma.invitationRequest.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, title: true, organization: { select: { name: true } } } },
          event: { select: { id: true, title: true, titleEn: true, startDate: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.invitationRequest.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        requests,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      },
    });
  } catch (error) {
    console.error("Get invitations error:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "invitationListFetchFailed") },
      { status: 500 }
    );
  }
}

// POST: Create a new invitation request (any authenticated user)
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

    const body = await req.json();
    requestLocale = resolveRequestLocale(req, body.locale);

    const {
      salutation,
      guestName,
      guestTitle,
      guestOrg,
      guestEmail,
      language,
      eventId,
      purpose,
      notes,
      customMainContent,
    } = body;

    if (!guestName || typeof guestName !== "string" || !guestName.trim()) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "invitationGuestNameRequired") },
        { status: 400 }
      );
    }

    const normalizedLanguage = language === "en" ? "en" : "zh";
    const trimmedCustomMainContent = customMainContent?.trim() || "";
    if (
      trimmedCustomMainContent &&
      countInvitationBodyChars(trimmedCustomMainContent) > getInvitationRequestBodyCharLimit(normalizedLanguage, guestName, guestTitle)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: normalizedLanguage === "en"
            ? "Custom body content exceeds the safe character limit"
            : "自定义正文内容超出安全字数上限",
        },
        { status: 400 }
      );
    }

    // Validate eventId references a real event if provided
    if (eventId) {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true },
      });
      if (!event) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "eventNotFound") },
          { status: 400 }
        );
      }
    }

    const invitation = await prisma.invitationRequest.create({
      data: {
        userId: currentUser.id,
        salutation: normalizeSalutationValue(salutation),
        guestName: guestName.trim(),
        guestTitle: guestTitle?.trim() || null,
        guestOrg: guestOrg?.trim() || null,
        guestEmail: guestEmail?.trim() || null,
        language: normalizedLanguage,
        eventId: eventId || null,
        purpose: purpose?.trim() || null,
        notes: notes?.trim() || null,
        customMainContent: trimmedCustomMainContent || null,
      },
      include: {
        user: { select: { id: true, name: true, email: true, title: true, organization: { select: { name: true } } } },
        event: { select: { id: true, title: true, titleEn: true, startDate: true } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: apiMessage(requestLocale, "invitationCreateSuccess"),
        data: invitation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create invitation error:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "invitationCreateFailed") },
      { status: 500 }
    );
  }
}
