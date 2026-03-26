import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { InvitationStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";
import { canManageEvents } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

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
      select: { id: true, userId: true, status: true },
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

    const { status, letterFileUrl, rejectReason } = body;

    // Owner can only mark as DOWNLOADED
    if (isOwner && !isManager) {
      if (status !== InvitationStatus.DOWNLOADED || existing.status !== InvitationStatus.UPLOADED) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "invitationInvalidStatus") },
          { status: 400 }
        );
      }

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
