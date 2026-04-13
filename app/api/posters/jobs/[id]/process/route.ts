import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processPosterJob } from "@/lib/poster-job-processor";
import { requirePosterAdmin } from "@/lib/poster-auth";
import { buildPosterJobResponse } from "@/lib/poster-job-response";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requirePosterAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const existing = await prisma.posterJob.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const processed = await processPosterJob(params.id);
    return NextResponse.json({
      success: true,
      data: buildPosterJobResponse(processed),
    });
  } catch (error) {
    console.error("Process poster job error:", error);
    return NextResponse.json({ success: false, error: "Failed to process poster job" }, { status: 500 });
  }
}
