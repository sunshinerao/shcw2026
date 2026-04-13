import { NextRequest, NextResponse } from "next/server";
import { PosterJobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePosterAdmin } from "@/lib/poster-auth";
import { buildPosterJobResponse } from "@/lib/poster-job-response";
import { composePosterErrorMessage, parsePosterRetryMeta } from "@/lib/poster-retry-meta";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requirePosterAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const existing = await prisma.posterJob.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, errorMessage: true },
    });
    if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    if (existing.status === PosterJobStatus.RUNNING) {
      return NextResponse.json({ success: false, error: "Job is running" }, { status: 409 });
    }

    const retryMeta = parsePosterRetryMeta(existing.errorMessage);
    if (retryMeta.retryCount >= retryMeta.maxRetries) {
      return NextResponse.json(
        {
          success: false,
          error: `Retry limit reached (${retryMeta.retryCount}/${retryMeta.maxRetries})`,
          data: {
            retryCount: retryMeta.retryCount,
            maxRetries: retryMeta.maxRetries,
          },
        },
        { status: 409 },
      );
    }

    const nextRetryCount = retryMeta.retryCount + 1;

    const retried = await prisma.posterJob.update({
      where: { id: params.id },
      data: {
        status: PosterJobStatus.PENDING,
        errorMessage: composePosterErrorMessage({
          retryCount: nextRetryCount,
          maxRetries: retryMeta.maxRetries,
        }),
        outputUrl: null,
      },
      include: {
        template: { select: { id: true, templateName: true, templateType: true, aspectRatio: true, layoutJson: true } },
        knowledgeAsset: { select: { id: true, title: true, slug: true } },
        event: { select: { id: true, title: true, titleEn: true } },
        speaker: { select: { id: true, name: true, nameEn: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: buildPosterJobResponse(retried),
    });
  } catch (error) {
    console.error("Retry poster job error:", error);
    return NextResponse.json({ success: false, error: "Failed to retry poster job" }, { status: 500 });
  }
}
