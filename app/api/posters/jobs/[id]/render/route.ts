import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  renderPosterPdf,
  renderPosterPng,
  renderPosterSvg,
  resolveRenderSize,
  sizeByAspectRatio,
} from "@/lib/poster-rendering";
import { requirePosterAdmin } from "@/lib/poster-auth";

function toExactArrayBuffer(bytes: Uint8Array) {
  const out = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(out).set(bytes);
  return out;
}

function buildRenderPayload(job: {
  locale: string;
  template: { aspectRatio: string; layoutJson: unknown } | null;
  knowledgeAsset: { title: string; titleEn: string | null } | null;
  event: { title: string; titleEn: string | null; startDate: Date } | null;
  speaker: { name: string; nameEn: string | null; title: string; titleEn: string | null } | null;
}, req: NextRequest) {
  const { searchParams } = new URL(req.url);

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
  const defaultSize = sizeByAspectRatio(job.template?.aspectRatio || "4:5");
  const { w, h } = resolveRenderSize(defaultSize, {
    preset: searchParams.get("preset"),
    width: searchParams.get("width"),
    height: searchParams.get("height"),
  });

  return {
    input: {
      width: w,
      height: h,
      title,
      subtitle,
      dateLabel: job.event?.startDate ? new Date(job.event.startDate).getFullYear().toString() : "2026",
      phase: locale === "en" ? "PROGRAM TIMELINE" : "项目时间线",
      bgColor: typeof tokens.bgColor === "string" ? tokens.bgColor : "#090f1f",
      accentColor: typeof tokens.accentColor === "string" ? tokens.accentColor : "#4fd1c5",
      titleScale: typeof tokens.titleScale === "number" ? tokens.titleScale : 1,
    },
    format: (searchParams.get("format") || "svg").toLowerCase(),
  };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requirePosterAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const job = await prisma.posterJob.findUnique({
      where: { id: params.id },
      include: {
        template: { select: { aspectRatio: true, layoutJson: true } },
        knowledgeAsset: { select: { title: true, titleEn: true } },
        event: { select: { title: true, titleEn: true, startDate: true } },
        speaker: { select: { name: true, nameEn: true, title: true, titleEn: true } },
      },
    });

    if (!job) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const { input, format } = buildRenderPayload(job, req);
    const svg = renderPosterSvg(input);

    if (format === "png") {
      const png = renderPosterPng(svg, input.width);
      const body = toExactArrayBuffer(Uint8Array.from(png));
      return new NextResponse(body, {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-disposition": `attachment; filename=poster-${params.id}.png`,
          "cache-control": "no-store",
        },
      });
    }

    if (format === "pdf") {
      const pdf = await renderPosterPdf(input);
      const body = toExactArrayBuffer(Uint8Array.from(pdf));
      return new NextResponse(body, {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `attachment; filename=poster-${params.id}.pdf`,
          "cache-control": "no-store",
        },
      });
    }

    return new NextResponse(svg, {
      status: 200,
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "content-disposition": `inline; filename=poster-${params.id}.svg`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("Render poster job error:", error);
    return NextResponse.json({ success: false, error: "Failed to render poster" }, { status: 500 });
  }
}
