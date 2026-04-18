import { NextRequest, NextResponse } from "next/server";
import { RegistrationStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";
import { prisma } from "@/lib/prisma";

function escapeCsvValue(value: unknown) {
  const normalized = String(value ?? "").replace(/\r?\n|\r/g, " ").trim();
  return `"${normalized.replace(/"/g, '""')}"`;
}

function buildExportBaseName(eventTitle: string, locale: string) {
  const safeTitle = (eventTitle || "event")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  const suffix = locale === "en" ? "registrations" : "报名";
  const dateStamp = new Date().toISOString().slice(0, 10);
  return `${safeTitle}-${suffix}-${dateStamp}`;
}

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
    const format = searchParams.get("format");
    const query = searchParams.get("query")?.trim();

    const where: Record<string, unknown> = { eventId: params.id };
    if (status && Object.values(RegistrationStatus).includes(status as RegistrationStatus)) {
      where.status = status;
    }

    if (query) {
      where.user = {
        is: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { climatePassportId: { contains: query, mode: "insensitive" } },
          ],
        },
      };
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
              phone: true,
              title: true,
              role: true,
              climatePassportId: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  logo: true,
                  website: true,
                  industry: true,
                  size: true,
                },
              },
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

    if (format === "csv") {
      const header = [
        requestLocale === "en" ? "Name" : "姓名",
        requestLocale === "en" ? "Email" : "邮箱",
        requestLocale === "en" ? "Phone" : "电话",
        requestLocale === "en" ? "Title" : "职位",
        requestLocale === "en" ? "Organization" : "机构",
        requestLocale === "en" ? "Passport ID" : "护照编号",
        requestLocale === "en" ? "Status" : "报名状态",
        requestLocale === "en" ? "Registered At" : "报名时间",
        requestLocale === "en" ? "Checked In At" : "签到时间",
        requestLocale === "en" ? "Points Earned" : "获得积分",
        requestLocale === "en" ? "Notes" : "备注",
      ];

      const rows = registrations.map((registration) => [
        registration.user.name,
        registration.user.email,
        registration.user.phone || "",
        registration.user.title || "",
        registration.user.organization?.name || "",
        registration.user.climatePassportId || "",
        registration.status,
        registration.createdAt.toISOString(),
        registration.checkedInAt?.toISOString() || "",
        registration.pointsEarned,
        registration.notes || "",
      ]);

      const csvContent = [header, ...rows]
        .map((row) => row.map((cell) => escapeCsvValue(cell)).join(","))
        .join("\n");

      const preferredTitle = requestLocale === "en" ? event.titleEn || event.title : event.title;
      const exportBaseName = buildExportBaseName(preferredTitle, requestLocale);
      const asciiFilename = exportBaseName
        .replace(/[^\x20-\x7E]/g, "")
        .replace(/[^a-zA-Z0-9-_. ]+/g, "-")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "") || "event-registrations-export";
      const utf8Filename = encodeURIComponent(`${exportBaseName}.csv`);

      return new NextResponse(`\uFEFF${csvContent}`, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${asciiFilename}.csv"; filename*=UTF-8''${utf8Filename}`,
        },
      });
    }

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
