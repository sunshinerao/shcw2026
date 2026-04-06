import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { InvitationStatus } from "@prisma/client";
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

// GET: Get a single invitation request
export async function GET(
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

    const isManager = canManageEvents(currentUser.role);

    const invitation = await prisma.invitationRequest.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, name: true, email: true, title: true, organization: { select: { name: true } } } },
        event: { select: { id: true, title: true, titleEn: true, startDate: true } },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "invitationNotFound") },
        { status: 404 }
      );
    }

    // Non-admin users can only see their own requests
    if (!isManager && invitation.userId !== currentUser.id) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "invitationNotFound") },
        { status: 404 }
      );
    }

    // EVENT_MANAGER can only see invitations linked to their managed events
    if (isManager && !isAdminRole(currentUser.role)) {
      if (!invitation.eventId) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "invitationNotFound") },
          { status: 404 }
        );
      }
      const managedEvent = await prisma.event.findFirst({
        where: { id: invitation.eventId, managerUserId: currentUser.id },
        select: { id: true },
      });
      if (!managedEvent) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "invitationNotFound") },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({ success: true, data: invitation });
  } catch (error) {
    console.error("Get invitation error:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "invitationListFetchFailed") },
      { status: 500 }
    );
  }
}

// PUT: Update an invitation request
// - Admin/EventManager: can update status, letterFileUrl, rejectReason
// - Owner: can mark as DOWNLOADED when status is UPLOADED
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

    const body = await req.json();
    requestLocale = resolveRequestLocale(req, body.locale);

    const existing = await prisma.invitationRequest.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true, status: true, eventId: true, language: true, guestName: true, guestTitle: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "invitationNotFound") },
        { status: 404 }
      );
    }

    const isManager = canManageEvents(currentUser.role);
    const isOwner = existing.userId === currentUser.id;

    if (!isManager && !isOwner) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "invitationNotFound") },
        { status: 404 }
      );
    }

    // EVENT_MANAGER can only update invitations linked to their managed events
    if (isManager && !isAdminRole(currentUser.role) && !isOwner) {
      if (!existing.eventId) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "invitationNotFound") },
          { status: 404 }
        );
      }
      const managedEvent = await prisma.event.findFirst({
        where: { id: existing.eventId, managerUserId: currentUser.id },
        select: { id: true },
      });
      if (!managedEvent) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "invitationNotFound") },
          { status: 404 }
        );
      }
    }

    const {
      status,
      letterFileUrl,
      rejectReason,
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
      signaturePresetId,
    } = body;

    // Owner actions (non-admin)
    if (isOwner && !isManager) {
      // Owner can mark UPLOADED as DOWNLOADED
      if (status === InvitationStatus.DOWNLOADED && existing.status === InvitationStatus.UPLOADED) {
        const updated = await prisma.invitationRequest.update({
          where: { id: params.id },
          data: { status: InvitationStatus.DOWNLOADED },
          include: {
            user: { select: { id: true, name: true, email: true, title: true, organization: { select: { name: true } } } },
            event: { select: { id: true, title: true, titleEn: true, startDate: true } },
          },
        });

        return NextResponse.json({
          success: true,
          message: apiMessage(requestLocale, "invitationUpdateSuccess"),
          data: updated,
        });
      }

      // Owner can edit PENDING or REJECTED requests (resubmit)
      if (existing.status === InvitationStatus.PENDING || existing.status === InvitationStatus.REJECTED) {
        if (guestName !== undefined && (!guestName || typeof guestName !== "string" || !guestName.trim())) {
          return NextResponse.json(
            { success: false, error: apiMessage(requestLocale, "invitationGuestNameRequired") },
            { status: 400 }
          );
        }

        const normalizedLanguage = language !== undefined
          ? (language === "en" ? "en" : "zh")
          : existing.language === "en"
            ? "en"
            : "zh";
        const effectiveGuestName = guestName !== undefined ? guestName : existing.guestName;
        const effectiveGuestTitle = guestTitle !== undefined ? guestTitle : existing.guestTitle;
        const trimmedCustomMainContent = customMainContent !== undefined ? customMainContent?.trim() || "" : undefined;
        if (
          trimmedCustomMainContent !== undefined &&
          trimmedCustomMainContent &&
          countInvitationBodyChars(trimmedCustomMainContent) > getInvitationRequestBodyCharLimit(normalizedLanguage, effectiveGuestName, effectiveGuestTitle)
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

        // Validate eventId if provided
        if (eventId) {
          const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
          if (!event) {
            return NextResponse.json(
              { success: false, error: apiMessage(requestLocale, "eventNotFound") },
              { status: 400 }
            );
          }
        }

        const editData: Record<string, unknown> = {};
        if (salutation !== undefined) editData.salutation = normalizeSalutationValue(salutation);
        if (guestName !== undefined) editData.guestName = guestName.trim();
        if (guestTitle !== undefined) editData.guestTitle = guestTitle?.trim() || null;
        if (guestOrg !== undefined) editData.guestOrg = guestOrg?.trim() || null;
        if (guestEmail !== undefined) editData.guestEmail = guestEmail?.trim() || null;
        if (language !== undefined) editData.language = normalizedLanguage;
        if (eventId !== undefined) editData.eventId = eventId || null;
        if (purpose !== undefined) editData.purpose = purpose?.trim() || null;
        if (notes !== undefined) editData.notes = notes?.trim() || null;
        if (customMainContent !== undefined) editData.customMainContent = trimmedCustomMainContent || null;
        if (signaturePresetId !== undefined) editData.signaturePresetId = normalizedLanguage === "en" ? (signaturePresetId?.trim() || null) : null;
        // Reset status to PENDING on resubmit (in case it was REJECTED)
        if (existing.status === InvitationStatus.REJECTED) {
          editData.status = InvitationStatus.PENDING;
          editData.rejectReason = null;
        }

        const updated = await prisma.invitationRequest.update({
          where: { id: params.id },
          data: editData,
          include: {
            user: { select: { id: true, name: true, email: true, title: true, organization: { select: { name: true } } } },
            event: { select: { id: true, title: true, titleEn: true, startDate: true } },
          },
        });

        return NextResponse.json({
          success: true,
          message: apiMessage(requestLocale, "invitationUpdateSuccess"),
          data: updated,
        });
      }

      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "invitationInvalidStatus") },
        { status: 400 }
      );
    }

    // Admin/EventManager can update status and upload letter
    const validStatuses = new Set(Object.values(InvitationStatus));
    if (status && !validStatuses.has(status)) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "invitationInvalidStatus") },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (letterFileUrl !== undefined) updateData.letterFileUrl = letterFileUrl || null;
    if (rejectReason !== undefined) updateData.rejectReason = rejectReason || null;

    const updated = await prisma.invitationRequest.update({
      where: { id: params.id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true, title: true, organization: { select: { name: true } } } },
        event: { select: { id: true, title: true, titleEn: true, startDate: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: apiMessage(requestLocale, "invitationUpdateSuccess"),
      data: updated,
    });
  } catch (error) {
    console.error("Update invitation error:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "invitationUpdateFailed") },
      { status: 500 }
    );
  }
}
