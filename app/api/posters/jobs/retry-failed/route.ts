import { NextRequest, NextResponse } from "next/server";
import { PosterJobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePosterAdmin } from "@/lib/poster-auth";
import { composePosterErrorMessage, parsePosterRetryMeta } from "@/lib/poster-retry-meta";

export async function POST(req: NextRequest) {
  try {
    const admin = await requirePosterAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({} as { limit?: number }));
    const limitRaw = Number(body.limit ?? 20);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, Math.floor(limitRaw))) : 20;

    const failedJobs = await prisma.posterJob.findMany({
      where: { status: PosterJobStatus.FAILED },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: { id: true, errorMessage: true },
    });

    if (failedJobs.length === 0) {
      return NextResponse.json({
        success: true,
        data: { retriedCount: 0, retriedIds: [], message: "No failed jobs to retry" },
      });
    }

    const retriable = failedJobs
      .map((job) => {
        const retryMeta = parsePosterRetryMeta(job.errorMessage);
        return {
          id: job.id,
          retryCount: retryMeta.retryCount,
          maxRetries: retryMeta.maxRetries,
        };
      })
      .filter((job) => job.retryCount < job.maxRetries);

    const skippedCappedIds = failedJobs
      .map((job) => {
        const retryMeta = parsePosterRetryMeta(job.errorMessage);
        return retryMeta.retryCount >= retryMeta.maxRetries ? job.id : null;
      })
      .filter((id): id is string => Boolean(id));

    await prisma.$transaction(
      retriable.map((job) =>
        prisma.posterJob.update({
          where: { id: job.id },
          data: {
            status: PosterJobStatus.PENDING,
            errorMessage: composePosterErrorMessage({
              retryCount: job.retryCount + 1,
              maxRetries: job.maxRetries,
            }),
            outputUrl: null,
          },
        }),
      ),
    );

    const retriedIds = retriable.map((j) => j.id);

    return NextResponse.json({
      success: true,
      data: {
        retriedCount: retriedIds.length,
        retriedIds,
        skippedCappedCount: skippedCappedIds.length,
        skippedCappedIds,
      },
    });
  } catch (error) {
    console.error("Retry failed poster jobs error:", error);
    return NextResponse.json({ success: false, error: "Failed to retry failed jobs" }, { status: 500 });
  }
}
