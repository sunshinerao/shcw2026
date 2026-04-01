import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { SpecialPassEntryType, SpecialPassStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";
import { canManageSpecialPassApplications } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function requireManager(requestLocale: "zh" | "en") {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: apiMessage(requestLocale, "unauthorized") }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, name: true },
  });

  if (!user || !canManageSpecialPassApplications(user.role)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "adminOrSpecialPassManagerOnly") },
        { status: 403 }
      ),
    };
  }

  return { ok: true as const, user };
}

export async function GET(req: NextRequest) {
  const requestLocale = resolveRequestLocale(req);

  try {
    const permission = await requireManager(requestLocale);
    if (!permission.ok) {
      return permission.response;
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const entryType = searchParams.get("entryType");
    const search = (searchParams.get("search") || "").trim();

    const where: any = {};

    if (status && Object.values(SpecialPassStatus).includes(status as SpecialPassStatus)) {
      where.status = status as SpecialPassStatus;
    }

    if (entryType && Object.values(SpecialPassEntryType).includes(entryType as SpecialPassEntryType)) {
      where.entryType = entryType as SpecialPassEntryType;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { docNumber: { contains: search, mode: "insensitive" } },
        { organization: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const passes = await prisma.specialPass.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: passes });
  } catch (error) {
    console.error("Get admin special passes error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
