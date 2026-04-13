import { NextRequest, NextResponse } from "next/server";
import { PosterJobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { processPosterJob } from "@/lib/poster-job-processor";
import { requirePosterAdmin } from "@/lib/poster-auth";
import { buildPosterJobResponse } from "@/lib/poster-job-response";

export async function GET() {
  try {
    const admin = await requirePosterAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const [jobs, pending, running, completed, failed] = await Promise.all([
      prisma.posterJob.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          template: { select: { id: true, templateName: true, templateType: true, aspectRatio: true, layoutJson: true } },
          knowledgeAsset: { select: { id: true, title: true, slug: true } },
          event: { select: { id: true, title: true, titleEn: true } },
          speaker: { select: { id: true, name: true, nameEn: true } },
        },
        take: 100,
      }),
      prisma.posterJob.count({ where: { status: PosterJobStatus.PENDING } }),
      prisma.posterJob.count({ where: { status: PosterJobStatus.RUNNING } }),
      prisma.posterJob.count({ where: { status: PosterJobStatus.COMPLETED } }),
      prisma.posterJob.count({ where: { status: PosterJobStatus.FAILED } }),
    ]);

    return NextResponse.json({
      success: true,
      data: jobs.map((job) => buildPosterJobResponse(job)),
      summary: { pending, running, completed, failed },
    });
  } catch (error) {
    console.error("List poster jobs error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch jobs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requirePosterAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const {
      templateId,
      knowledgeAssetId,
      eventId,
      speakerId,
      locale,
      outputFormat,
      autoProcess,
      processMode,
    } = body;

    if (!templateId) {
      return NextResponse.json({ success: false, error: "templateId is required" }, { status: 400 });
    }

    const template = await prisma.posterTemplate.findUnique({ where: { id: templateId } });
    if (!template) {
      return NextResponse.json({ success: false, error: "Template not found" }, { status: 404 });
    }

    const created = await prisma.posterJob.create({
      data: {
        templateId,
        knowledgeAssetId: knowledgeAssetId || null,
        eventId: eventId || null,
        speakerId: speakerId || null,
        locale: locale || "zh",
        outputFormat: outputFormat || "png",
        outputUrl: null,
        status: PosterJobStatus.PENDING,
      },
      include: {
        template: { select: { id: true, templateName: true, templateType: true, aspectRatio: true, layoutJson: true } },
        knowledgeAsset: { select: { id: true, title: true, slug: true } },
        event: { select: { id: true, title: true, titleEn: true } },
        speaker: { select: { id: true, name: true, nameEn: true } },
      },
    });

    let finalJob = created;
    const shouldInlineProcess = processMode === "inline" || autoProcess === true;
    if (shouldInlineProcess) {
      finalJob = await processPosterJob(created.id);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...buildPosterJobResponse(finalJob),
        queueMode: shouldInlineProcess ? "inline" : "queue",
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Create poster job error:", error);
    return NextResponse.json({ success: false, error: "Failed to create poster job" }, { status: 500 });
  }
}
