import { NextRequest, NextResponse } from "next/server";
import {
  claimNextPendingPosterJob,
  processClaimedPosterJob,
} from "@/lib/poster-job-processor";
import { requirePosterAdmin } from "@/lib/poster-auth";
import { prisma } from "@/lib/prisma";

async function hasWorkerPermission(req: NextRequest) {
  const workerToken = process.env.POSTER_WORKER_TOKEN;
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (workerToken && bearer && bearer === workerToken) {
    return true;
  }

  const user = await requirePosterAdmin();
  return !!user;
}

export async function POST(req: NextRequest) {
  try {
    const allowed = await hasWorkerPermission(req);
    if (!allowed) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const body = await req.json().catch(() => ({} as { limit?: number }));
    const requestedLimit = Number(url.searchParams.get("limit") || body.limit || 3);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(20, Math.floor(requestedLimit)))
      : 3;

    let processed = 0;
    const succeeded: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (let i = 0; i < limit; i += 1) {
      const nextId = await claimNextPendingPosterJob();
      if (!nextId) break;

      processed += 1;
      try {
        await processClaimedPosterJob(nextId);
        succeeded.push(nextId);
      } catch (error) {
        failed.push({
          id: nextId,
          error: error instanceof Error ? error.message : "Unknown worker error",
        });
      }
    }

    const [pending, running, completed, failedCount] = await Promise.all([
      prisma.posterJob.count({ where: { status: "PENDING" } }),
      prisma.posterJob.count({ where: { status: "RUNNING" } }),
      prisma.posterJob.count({ where: { status: "COMPLETED" } }),
      prisma.posterJob.count({ where: { status: "FAILED" } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        requested: limit,
        processed,
        succeeded,
        failed,
        summary: {
          pending,
          running,
          completed,
          failed: failedCount,
        },
      },
    });
  } catch (error) {
    console.error("Poster worker error:", error);
    return NextResponse.json({ success: false, error: "Failed to run poster worker" }, { status: 500 });
  }
}
