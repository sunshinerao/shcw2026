import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import JSZip from "jszip";
import {
  renderPosterPdf,
  renderPosterPng,
  renderPosterSvg,
  sizeByPreset,
} from "@/lib/poster-rendering";
import { requirePosterAdmin } from "@/lib/poster-auth";

const PRESET_VALUES = new Set(["portrait", "square", "landscape"]);
const FORMAT_VALUES = new Set(["png", "pdf"]);

function parseCsv(value: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

function buildBatchItems(jobId: string, presets: string[], formats: string[]) {
  const labels: Record<string, string> = {
    portrait: "4:5 Portrait",
    square: "1:1 Square",
    landscape: "16:9 Landscape",
  };

  const items: Array<{ preset: string; format: string; label: string; href: string }> = [];
  for (const preset of presets) {
    for (const format of formats) {
      items.push({
        preset,
        format,
        label: `${labels[preset] || preset} ${format.toUpperCase()}`,
        href: `/api/posters/jobs/${jobId}/render?format=${format}&preset=${preset}`,
      });
    }
  }
  return items;
}

function buildRenderPayload(job: {
  locale: string;
  template: { layoutJson: unknown } | null;
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

  return {
    title,
    subtitle,
    dateLabel: job.event?.startDate ? new Date(job.event.startDate).getFullYear().toString() : "2026",
    phase: locale === "en" ? "PROGRAM TIMELINE" : "项目时间线",
    bgColor: typeof tokens.bgColor === "string" ? tokens.bgColor : "#090f1f",
    accentColor: typeof tokens.accentColor === "string" ? tokens.accentColor : "#4fd1c5",
    titleScale: typeof tokens.titleScale === "number" ? tokens.titleScale : 1,
  };
}

function renderDownloadPage(jobId: string, items: Array<{ label: string; href: string }>, autostart: boolean) {
  const links = items
    .map(
      (item) =>
        `<li><a href="${item.href}" target="_blank" rel="noreferrer">${item.label}</a></li>`,
    )
    .join("\n");

  const autoScript = autostart
    ? `
      <script>
        const links = Array.from(document.querySelectorAll('[data-batch-link]'));
        let idx = 0;
        function openNext() {
          if (idx >= links.length) return;
          const link = links[idx++];
          window.open(link.href, '_blank');
          setTimeout(openNext, 350);
        }
        setTimeout(openNext, 200);
      </script>
    `
    : "";

  const linksWithData = items
    .map(
      (item) =>
        `<li><a data-batch-link="1" href="${item.href}" target="_blank" rel="noreferrer">${item.label}</a></li>`,
    )
    .join("\n");

  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Poster Batch Export</title>
  <style>
    body { font-family: Inter, system-ui, sans-serif; margin: 0; background: #0b1220; color: #e5edf9; }
    .wrap { max-width: 760px; margin: 0 auto; padding: 24px; }
    .card { border: 1px solid #243047; border-radius: 14px; padding: 18px; background: rgba(255,255,255,0.03); }
    h1 { margin: 0 0 8px; font-size: 22px; }
    p { color: #95a4be; margin: 0 0 16px; }
    ul { margin: 0; padding-left: 20px; display: grid; gap: 8px; }
    a { color: #69e0d0; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .meta { font-size: 12px; color: #95a4be; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Poster Batch Export</h1>
      <p>Job: ${jobId}</p>
      <ul>
        ${linksWithData || links}
      </ul>
      <p class="meta">If downloads are blocked, allow pop-ups for this site and refresh.</p>
    </div>
  </div>
  ${autoScript}
</body>
</html>`;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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

    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get("mode") || "json").toLowerCase();
    const autostart = searchParams.get("autostart") === "1";

    const presets = parseCsv(searchParams.get("presets")).filter((x) => PRESET_VALUES.has(x));
    const formats = parseCsv(searchParams.get("formats")).filter((x) => FORMAT_VALUES.has(x));

    const resolvedPresets = presets.length ? presets : ["portrait", "square", "landscape"];
    const resolvedFormats = formats.length ? formats : ["png", "pdf"];

    const items = buildBatchItems(params.id, resolvedPresets, resolvedFormats);

    if (mode === "zip") {
      const basePayload = buildRenderPayload(job);
      const zip = new JSZip();

      for (const preset of resolvedPresets) {
        const size = sizeByPreset(preset as "portrait" | "square" | "landscape");
        const input = { ...basePayload, width: size.w, height: size.h };
        const svg = renderPosterSvg(input);

        for (const format of resolvedFormats) {
          const filename = `poster-${params.id}-${preset}.${format}`;
          if (format === "png") {
            const png = renderPosterPng(svg, size.w);
            zip.file(filename, png);
          } else if (format === "pdf") {
            const pdf = await renderPosterPdf(input);
            zip.file(filename, pdf);
          }
        }
      }

      const zipBytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
      const body = zipBytes.buffer.slice(zipBytes.byteOffset, zipBytes.byteOffset + zipBytes.byteLength);
      return new NextResponse(body, {
        status: 200,
        headers: {
          "content-type": "application/zip",
          "content-disposition": `attachment; filename=poster-batch-${params.id}.zip`,
          "cache-control": "no-store",
        },
      });
    }

    if (mode === "html") {
      return new NextResponse(renderDownloadPage(params.id, items, autostart), {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        jobId: params.id,
        presets: resolvedPresets,
        formats: resolvedFormats,
        count: items.length,
        items,
        batchPage: `/api/posters/jobs/${params.id}/batch?mode=html&autostart=1`,
        zipUrl: `/api/posters/jobs/${params.id}/batch?mode=zip`,
      },
    });
  } catch (error) {
    console.error("Batch poster export error:", error);
    return NextResponse.json({ success: false, error: "Failed to create batch export" }, { status: 500 });
  }
}
