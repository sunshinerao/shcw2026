import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePosterAdmin } from "@/lib/poster-auth";

function renderPosterPreviewHtml(input: {
  title: string;
  subtitle: string;
  phase?: string;
  dateLabel?: string;
  bgColor?: string;
  accentColor?: string;
  titleScale?: number;
  timelineDensity?: "compact" | "balanced" | "airy";
}) {
  const titleScale = Number.isFinite(input.titleScale) ? Number(input.titleScale) : 1;
  const titleSize = Math.max(30, Math.min(68, Math.round(52 * titleScale)));
  const timelineGap = input.timelineDensity === "compact" ? 10 : input.timelineDensity === "airy" ? 24 : 16;

  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Poster Preview</title>
  <style>
    :root {
      --bg: ${input.bgColor || "#090f1f"};
      --fg: #ecf2ff;
      --muted: #99a6bf;
      --accent: ${input.accentColor || "#4fd1c5"};
      --line: rgba(255,255,255,0.16);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, "Noto Sans SC", sans-serif;
      background:
        radial-gradient(1000px 420px at 85% -5%, rgba(79, 209, 197, 0.22), transparent 60%),
        radial-gradient(800px 300px at 0% 100%, rgba(59,130,246,0.18), transparent 60%),
        var(--bg);
      color: var(--fg);
      min-height: 100vh;
      padding: 56px;
    }
    .frame {
      border: 1px solid var(--line);
      border-radius: 22px;
      padding: 40px;
      background: rgba(255,255,255,0.03);
      backdrop-filter: blur(4px);
    }
    .meta {
      color: var(--muted);
      font-size: 13px;
      letter-spacing: .08em;
      text-transform: uppercase;
      display: flex;
      justify-content: space-between;
    }
    h1 {
      margin: 22px 0 10px;
      font-size: ${titleSize}px;
      line-height: 1.06;
      max-width: 12ch;
      letter-spacing: -0.02em;
    }
    p {
      margin: 0;
      color: var(--muted);
      font-size: 19px;
      max-width: 60ch;
      line-height: 1.55;
    }
    .timeline {
      margin-top: 34px;
      display: grid;
      grid-template-columns: 170px 1fr;
      gap: ${timelineGap}px;
      align-items: start;
    }
    .timeline .phase {
      color: var(--accent);
      font-weight: 600;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .timeline .line {
      border-left: 2px solid rgba(79, 209, 197, 0.45);
      padding-left: 14px;
      color: #c9d4ea;
    }
  </style>
</head>
<body>
  <div class="frame">
    <div class="meta">
      <span>SHCW Poster Engine Preview</span>
      <span>${input.dateLabel || "2026"}</span>
    </div>
    <h1>${input.title}</h1>
    <p>${input.subtitle}</p>
    <div class="timeline">
      <div class="phase">${input.phase || "Timeline"}</div>
      <div class="line">A restrained editorial timeline layout for international-facing program communication.</div>
    </div>
  </div>
</body>
</html>`;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requirePosterAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const job = await prisma.posterJob.findUnique({
      where: { id: params.id },
      include: {
        template: { select: { layoutJson: true } },
        knowledgeAsset: { select: { title: true, titleEn: true } },
        event: { select: { title: true, titleEn: true, startDate: true } },
        speaker: { select: { name: true, nameEn: true, title: true, titleEn: true } },
      },
    });

    if (!job) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const locale = job.locale || "zh";
    const title =
      (locale === "en" ? job.knowledgeAsset?.titleEn : null) ||
      job.knowledgeAsset?.title ||
      (locale === "en" ? job.event?.titleEn : null) ||
      job.event?.title ||
      (locale === "en" ? job.speaker?.nameEn : null) ||
      job.speaker?.name ||
      "Poster Preview";

    const subtitle =
      (locale === "en" ? job.speaker?.titleEn : null) ||
      job.speaker?.title ||
      (locale === "en" ? "Structured timeline communication" : "结构化时间线表达");

    const tokens = (job.template?.layoutJson as any)?.tokens || {};

    const html = renderPosterPreviewHtml({
      title,
      subtitle,
      phase: locale === "en" ? "Program Timeline" : "项目时间线",
      dateLabel: job.event?.startDate ? new Date(job.event.startDate).getFullYear().toString() : "2026",
      bgColor: typeof tokens.bgColor === "string" ? tokens.bgColor : undefined,
      accentColor: typeof tokens.accentColor === "string" ? tokens.accentColor : undefined,
      titleScale: typeof tokens.titleScale === "number" ? tokens.titleScale : undefined,
      timelineDensity: typeof tokens.timelineDensity === "string" ? tokens.timelineDensity : undefined,
    });

    return new NextResponse(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("Preview poster job error:", error);
    return NextResponse.json({ success: false, error: "Failed to generate preview" }, { status: 500 });
  }
}
