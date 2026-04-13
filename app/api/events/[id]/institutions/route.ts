import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireEventManager(eventId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Unauthorized", status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });

  if (!user) {
    return { error: "Forbidden", status: 403 };
  }

  if (user.role === "ADMIN") {
    return { ok: true };
  }

  if (user.role === "EVENT_MANAGER") {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { managerUserId: true },
    });
    if (event?.managerUserId === user.id) {
      return { ok: true };
    }
  }

  return { error: "Forbidden", status: 403 };
}

// GET /api/events/[id]/institutions — list event-institution associations
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireEventManager(params.id);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const associations = await prisma.eventInstitution.findMany({
    where: { eventId: params.id },
    orderBy: { order: "asc" },
    include: {
      institution: {
        select: {
          id: true,
          slug: true,
          name: true,
          nameEn: true,
          logo: true,
          orgType: true,
        },
      },
    },
  });

  return NextResponse.json({ success: true, data: associations });
}

// POST /api/events/[id]/institutions — add institution to event
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireEventManager(params.id);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json() as { institutionId?: string; role?: string; order?: number };
  const { institutionId, role, order } = body;

  if (!institutionId) {
    return NextResponse.json({ error: "institutionId is required" }, { status: 400 });
  }

  // Check institution exists
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    select: { id: true },
  });
  if (!institution) {
    return NextResponse.json({ error: "Institution not found" }, { status: 404 });
  }

  // Upsert (idempotent)
  const association = await prisma.eventInstitution.upsert({
    where: { eventId_institutionId: { eventId: params.id, institutionId } },
    create: {
      eventId: params.id,
      institutionId,
      role: role ?? null,
      order: order ?? 0,
    },
    update: {
      role: role ?? null,
      order: order ?? 0,
    },
    include: {
      institution: {
        select: {
          id: true,
          slug: true,
          name: true,
          nameEn: true,
          logo: true,
          orgType: true,
        },
      },
    },
  });

  return NextResponse.json({ success: true, data: association }, { status: 201 });
}

// DELETE /api/events/[id]/institutions — remove institution from event
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireEventManager(params.id);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json() as { institutionId?: string };
  const { institutionId } = body;

  if (!institutionId) {
    return NextResponse.json({ error: "institutionId is required" }, { status: 400 });
  }

  await prisma.eventInstitution.deleteMany({
    where: { eventId: params.id, institutionId },
  });

  return NextResponse.json({ success: true });
}
