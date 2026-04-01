import { NextRequest, NextResponse } from "next/server";
import { RegistrationStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";
import { prisma } from "@/lib/prisma";

async function canManageTargetEvent(userId: string, role: string | null | undefined, eventId: string) {
  if (role === "ADMIN") {
    return true;
  }

  if (role !== "EVENT_MANAGER") {
    return false;
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { managerUserId: true },
  });

  return event?.managerUserId === userId;
}

/**
 * GET /api/events/[id]/registrations
 * List registrations for an event (admin/staff only)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestLocale = resolveRequestLocale(req);

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "unauthorized") },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    const allowed = user ? await canManageTargetEvent(user.id, user.role, params.id) : false;

    if (!allowed) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "adminOrEventManagerOnly") },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { eventId: params.id };
    if (status && Object.values(RegistrationStatus).includes(status as RegistrationStatus)) {
      where.status = status;
    }

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        titleEn: true,
        maxAttendees: true,
        requireApproval: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "eventNotFound") },
        { status: 404 }
      );
    }

    const [registrations, approvedCount] = await Promise.all([
      prisma.registration.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              role: true,
              climatePassportId: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.registration.count({
        where: {
          eventId: params.id,
          status: {
            in: [RegistrationStatus.REGISTERED, RegistrationStatus.ATTENDED],
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        event,
        registrations,
        approvedCount,
      },
    });
  } catch (error) {
    console.error("Load registrations error:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "registrationListFetchFailed") },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/events/[id]/registrations
 * Batch approve or reject registrations
 * Body: { registrationIds: string[], action: "approve" | "reject" }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let requestLocale = resolveRequestLocale(req);

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "unauthorized") },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    const allowed = user ? await canManageTargetEvent(user.id, user.role, params.id) : false;

    if (!allowed) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "adminOrEventManagerOnly") },
        { status: 403 }
      );
    }

    const body = await req.json();
    requestLocale = resolveRequestLocale(req, body.locale);

    const { registrationIds, action } = body;

    if (
      !Array.isArray(registrationIds) ||
      registrationIds.length === 0 ||
      !["approve", "reject"].includes(action)
    ) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "registrationInvalidAction") },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: { id: true, maxAttendees: true },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "eventNotFound") },
        { status: 404 }
      );
    }

    if (action === "approve") {
      const result = await prisma.$transaction(async (tx) => {
        // Count current approved registrations
        const currentApproved = await tx.registration.count({
          where: {
            eventId: params.id,
            status: {
              in: [RegistrationStatus.REGISTERED, RegistrationStatus.ATTENDED],
            },
          },
        });

        // Verify all registrations belong to this event and are PENDING_APPROVAL
        const pendingRegistrations = await tx.registration.findMany({
          where: {
            id: { in: registrationIds },
            eventId: params.id,
            status: RegistrationStatus.PENDING_APPROVAL,
          },
          select: { id: true },
        });

        const validIds = pendingRegistrations.map((r) => r.id);

        if (validIds.length === 0) {
          return { count: 0, capacityExceeded: false };
        }

        // Check capacity
        if (event.maxAttendees && currentApproved + validIds.length > event.maxAttendees) {
          const remaining = event.maxAttendees - currentApproved;
          return { count: 0, capacityExceeded: true, remaining };
        }

        // Batch approve
        const updateResult = await tx.registration.updateMany({
          where: {
            id: { in: validIds },
            status: RegistrationStatus.PENDING_APPROVAL,
          },
          data: { status: RegistrationStatus.REGISTERED },
        });

        return { count: updateResult.count, capacityExceeded: false };
      });

      if (result.capacityExceeded) {
        return NextResponse.json(
          {
            success: false,
            error: apiMessage(requestLocale, "registrationCapacityExceeded"),
            remaining: result.remaining,
          },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        message: apiMessage(requestLocale, "registrationApproveSuccess"),
        count: result.count,
      });
    } else {
      // Reject
      const pendingRegistrations = await prisma.registration.findMany({
        where: {
          id: { in: registrationIds },
          eventId: params.id,
          status: RegistrationStatus.PENDING_APPROVAL,
        },
        select: { id: true },
      });

      const validIds = pendingRegistrations.map((r) => r.id);

      if (validIds.length === 0) {
        return NextResponse.json({
          success: true,
          message: apiMessage(requestLocale, "registrationRejectSuccess"),
          count: 0,
        });
      }

      const updateResult = await prisma.registration.updateMany({
        where: {
          id: { in: validIds },
          status: RegistrationStatus.PENDING_APPROVAL,
        },
        data: { status: RegistrationStatus.REJECTED },
      });

      return NextResponse.json({
        success: true,
        message: apiMessage(requestLocale, "registrationRejectSuccess"),
        count: updateResult.count,
      });
    }
  } catch (error) {
    console.error("Batch registration action error:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "registrationActionFailed") },
      { status: 500 }
    );
  }
}
