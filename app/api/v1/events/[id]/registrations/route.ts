import { NextRequest, NextResponse } from "next/server";
import { RegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/openclaw-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyApiKey(req, "events:read");
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
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
      _count: {
        select: {
          registrations: true,
        },
      },
    },
  });

  if (!event) {
    return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
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
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyApiKey(req, "events:write");
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "Request body must be valid JSON" }, { status: 400 });
  }

  const payload = body as { registrationIds?: string[]; action?: string };
  const { registrationIds, action } = payload;

  if (!Array.isArray(registrationIds) || registrationIds.length === 0 || !["approve", "reject"].includes(action || "")) {
    return NextResponse.json(
      { success: false, error: "registrationIds and a valid action are required" },
      { status: 400 }
    );
  }

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    select: { id: true, maxAttendees: true },
  });

  if (!event) {
    return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
  }

  if (action === "approve") {
    const result = await prisma.$transaction(async (tx) => {
      const currentApproved = await tx.registration.count({
        where: {
          eventId: params.id,
          status: {
            in: [RegistrationStatus.REGISTERED, RegistrationStatus.ATTENDED],
          },
        },
      });

      const pendingRegistrations = await tx.registration.findMany({
        where: {
          id: { in: registrationIds },
          eventId: params.id,
          status: RegistrationStatus.PENDING_APPROVAL,
        },
        select: { id: true },
      });

      const validIds = pendingRegistrations.map((item) => item.id);
      if (validIds.length === 0) {
        return { count: 0, capacityExceeded: false };
      }

      if (event.maxAttendees && currentApproved + validIds.length > event.maxAttendees) {
        const remaining = event.maxAttendees - currentApproved;
        return { count: 0, capacityExceeded: true, remaining };
      }

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
        { success: false, error: "Event capacity exceeded", remaining: result.remaining },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Registrations approved successfully",
      count: result.count,
    });
  }

  const pendingRegistrations = await prisma.registration.findMany({
    where: {
      id: { in: registrationIds },
      eventId: params.id,
      status: RegistrationStatus.PENDING_APPROVAL,
    },
    select: { id: true },
  });

  const validIds = pendingRegistrations.map((item) => item.id);

  if (validIds.length === 0) {
    return NextResponse.json({ success: true, message: "No pending registrations matched", count: 0 });
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
    message: "Registrations rejected successfully",
    count: updateResult.count,
  });
}
