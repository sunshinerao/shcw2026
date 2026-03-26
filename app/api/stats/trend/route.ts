import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/stats/trend
 * Returns monthly registration counts for the past 12 months.
 * Requires ADMIN or STAFF role.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || !["ADMIN", "STAFF"].includes(user.role)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  // Build 12-month window: from the 1st of (currentMonth - 11) to now
  const now = new Date();
  const months: { start: Date; end: Date; label: string }[] = [];

  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    months.push({
      start,
      end,
      label: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
    });
  }

  // Count registrations per month in parallel
  const counts = await Promise.all(
    months.map((m) =>
      prisma.registration.count({
        where: {
          createdAt: { gte: m.start, lt: m.end },
        },
      })
    )
  );

  const data = months.map((m, idx) => ({
    month: m.label,
    count: counts[idx],
  }));

  return NextResponse.json({ success: true, data });
}
