import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/openclaw-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyApiKey(req, "users:read");
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const userId = params.id;

  const [user, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        points: true,
        climatePassportId: true,
        _count: {
          select: {
            registrations: {
              where: { status: "ATTENDED" },
            },
          },
        },
      },
    }),
    prisma.pointTransaction.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  if (!user) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        points: user.points,
        climatePassportId: user.climatePassportId,
        attendedEvents: user._count.registrations,
      },
      transactions,
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyApiKey(req, "users:write");
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "Request body must be valid JSON" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const points = payload.points;
  const description = payload.description;

  if (typeof points !== "number" || Number.isNaN(points) || points === 0) {
    return NextResponse.json({ success: false, error: "points must be a non-zero number" }, { status: 400 });
  }

  if (typeof description !== "string" || description.trim().length === 0) {
    return NextResponse.json({ success: false, error: "description is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, points: true },
  });

  if (!user) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  if (points < 0 && user.points + points < 0) {
    return NextResponse.json({ success: false, error: "insufficient points for deduction" }, { status: 400 });
  }

  const type =
    typeof payload.type === "string" && payload.type.trim().length > 0
      ? payload.type.trim()
      : points > 0
        ? "MANUAL_ADD"
        : "MANUAL_DEDUCT";

  const result = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: params.id },
      data: {
        points: {
          increment: points,
        },
      },
      select: {
        id: true,
        name: true,
        points: true,
      },
    });

    const transaction = await tx.pointTransaction.create({
      data: {
        userId: params.id,
        points,
        type,
        description: description.trim(),
        createdBy: auth.keyId,
      },
    });

    return { user: updatedUser, transaction };
  });

  return NextResponse.json({
    success: true,
    data: result,
    message: points > 0 ? `Added ${points} points successfully.` : `Deducted ${Math.abs(points)} points successfully.`,
  });
}
