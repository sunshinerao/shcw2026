import { PosterJobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { composePosterErrorMessage, parsePosterRetryMeta } from "@/lib/poster-retry-meta";
import {
  renderPosterPdf,
  renderPosterPng,
  renderPosterSvg,
  sizeByAspectRatio,
} from "@/lib/poster-rendering";
import { savePosterFile } from "@/lib/poster-storage";

function presetByAspect(aspectRatio: string) {
  if (aspectRatio === "1:1") return "square";
  if (aspectRatio === "16:9") return "landscape";
  return "portrait";
}

function buildRenderPayload(job: {
  locale: string;
  template: { aspectRatio: string; layoutJson: unknown } | null;
  knowledgeAsset: { title: string; titleEn: string | null } | null;
  event: { title: string; titleEn: string | null; startDate: Date } | null;
  speaker: { name: string; nameEn: string | null; title: string; titleEn: string | null } | null;
}) {
  const locale = job.locale || "zh";
  const title =
    (locale === "en" ? job.knowledgeAsset?.titleEn : null) ||
    job.knowledgeAsset?.title ||
    (locale === "en" ? job.event?.titleEn : null) ||
    job.event?.title ||
    (locale === "en" ? job.speaker?.nameEn : null) ||
    job.speaker?.name ||
    "Timeline Poster";

  const subtitle =
    (locale === "en" ? job.speaker?.titleEn : null) ||
    job.speaker?.title ||
    (locale === "en" ? "Structured timeline communication" : "结构化时间线表达");

  const tokens = ((job.template?.layoutJson as { tokens?: Record<string, unknown> })?.tokens || {}) as Record<string, unknown>;
  const size = sizeByAspectRatio(job.template?.aspectRatio || "4:5");

  return {
    input: {
      width: size.w,
      height: size.h,
      title,
      subtitle,
      dateLabel: job.event?.startDate ? new Date(job.event.startDate).getFullYear().toString() : "2026",
      phase: locale === "en" ? "PROGRAM TIMELINE" : "项目时间线",
      bgColor: typeof tokens.bgColor === "string" ? tokens.bgColor : "#090f1f",
      accentColor: typeof tokens.accentColor === "string" ? tokens.accentColor : "#4fd1c5",
      titleScale: typeof tokens.titleScale === "number" ? tokens.titleScale : 1,
    },
    preset: presetByAspect(job.template?.aspectRatio || "4:5"),
  };
}

export async function processPosterJob(jobId: string) {
  const existing = await prisma.posterJob.findUnique({
    where: { id: jobId },
    select: { errorMessage: true },
  });
  const retryMeta = parsePosterRetryMeta(existing?.errorMessage);

  await prisma.posterJob.update({
    where: { id: jobId },
    data: {
      status: PosterJobStatus.RUNNING,
      errorMessage: composePosterErrorMessage({
        retryCount: retryMeta.retryCount,
        maxRetries: retryMeta.maxRetries,
      }),
    },
  });
  return processClaimedPosterJob(jobId);
}

export async function claimNextPendingPosterJob() {
  const pending = await prisma.posterJob.findFirst({
    where: { status: PosterJobStatus.PENDING },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!pending) return null;

  const claimed = await prisma.posterJob.updateMany({
    where: { id: pending.id, status: PosterJobStatus.PENDING },
    data: { status: PosterJobStatus.RUNNING },
  });

  if (claimed.count === 0) return null;
  return pending.id;
}

export async function processClaimedPosterJob(jobId: string) {
  try {
    const job = await prisma.posterJob.findUnique({
      where: { id: jobId },
      include: {
        template: { select: { aspectRatio: true, layoutJson: true } },
        knowledgeAsset: { select: { title: true, titleEn: true } },
        event: { select: { title: true, titleEn: true, startDate: true } },
        speaker: { select: { name: true, nameEn: true, title: true, titleEn: true } },
      },
    });

    if (!job) throw new Error("Poster job not found");

    const retryMeta = parsePosterRetryMeta(job.errorMessage);

    const format = ["png", "pdf", "svg"].includes((job.outputFormat || "").toLowerCase())
      ? (job.outputFormat.toLowerCase() as "png" | "pdf" | "svg")
      : "png";

    const { input, preset } = buildRenderPayload(job);
    const svg = renderPosterSvg(input);

    let savedUrl = "";
    if (format === "png") {
      const png = renderPosterPng(svg, input.width);
      const saved = await savePosterFile({
        jobId,
        preset,
        format: "png",
        contentType: "image/png",
        data: png,
      });
      savedUrl = saved.url;
    } else if (format === "pdf") {
      const pdf = await renderPosterPdf(input);
      const saved = await savePosterFile({
        jobId,
        preset,
        format: "pdf",
        contentType: "application/pdf",
        data: pdf,
      });
      savedUrl = saved.url;
    } else {
      const saved = await savePosterFile({
        jobId,
        preset,
        format: "svg",
        contentType: "image/svg+xml",
        data: svg,
      });
      savedUrl = saved.url;
    }

    return await prisma.posterJob.update({
      where: { id: jobId },
      data: {
        status: PosterJobStatus.COMPLETED,
        outputUrl: savedUrl,
        errorMessage: composePosterErrorMessage({
          retryCount: retryMeta.retryCount,
          maxRetries: retryMeta.maxRetries,
        }),
      },
      include: {
        template: { select: { id: true, templateName: true, templateType: true, aspectRatio: true, layoutJson: true } },
        knowledgeAsset: { select: { id: true, title: true, slug: true } },
        event: { select: { id: true, title: true, titleEn: true } },
        speaker: { select: { id: true, name: true, nameEn: true } },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown process error";
    const existing = await prisma.posterJob.findUnique({
      where: { id: jobId },
      select: { errorMessage: true },
    });
    const retryMeta = parsePosterRetryMeta(existing?.errorMessage);
    await prisma.posterJob.update({
      where: { id: jobId },
      data: {
        status: PosterJobStatus.FAILED,
        errorMessage: composePosterErrorMessage({
          retryCount: retryMeta.retryCount,
          maxRetries: retryMeta.maxRetries,
          message,
        }),
      },
    });
    throw error;
  }
}
