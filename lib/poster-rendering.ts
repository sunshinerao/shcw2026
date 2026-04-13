import { Resvg } from "@resvg/resvg-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type PosterRenderFormat = "svg" | "png" | "pdf";
export type PosterPreset = "portrait" | "square" | "landscape";

export type PosterRenderInput = {
  width: number;
  height: number;
  title: string;
  subtitle: string;
  dateLabel: string;
  phase: string;
  bgColor: string;
  accentColor: string;
  titleScale: number;
};

function esc(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clampSize(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hexToRgbColor(hex: string) {
  const cleaned = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return rgb(0.31, 0.82, 0.77);
  const r = parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = parseInt(cleaned.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

function wrapTextByLength(text: string, maxCharsPerLine: number) {
  if (!text) return [];
  if (text.includes(" ")) {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const w of words) {
      if (!current) {
        current = w;
        continue;
      }
      if (`${current} ${w}`.length <= maxCharsPerLine) {
        current = `${current} ${w}`;
      } else {
        lines.push(current);
        current = w;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  const chars = Array.from(text);
  const lines: string[] = [];
  for (let i = 0; i < chars.length; i += maxCharsPerLine) {
    lines.push(chars.slice(i, i + maxCharsPerLine).join(""));
  }
  return lines;
}

export function sizeByAspectRatio(aspectRatio: string) {
  if (aspectRatio === "1:1") return { w: 1080, h: 1080 };
  if (aspectRatio === "16:9") return { w: 1920, h: 1080 };
  return { w: 1080, h: 1350 };
}

export function sizeByPreset(preset: PosterPreset) {
  if (preset === "square") return { w: 1080, h: 1080 };
  if (preset === "landscape") return { w: 1920, h: 1080 };
  return { w: 1080, h: 1350 };
}

export function resolveRenderSize(
  defaultSize: { w: number; h: number },
  input: { preset?: string | null; width?: string | null; height?: string | null },
) {
  const preset = (input.preset || "").toLowerCase();
  if (preset === "square") return sizeByPreset("square");
  if (preset === "portrait") return sizeByPreset("portrait");
  if (preset === "landscape") return sizeByPreset("landscape");

  const widthRaw = Number(input.width || "");
  const heightRaw = Number(input.height || "");

  if (Number.isFinite(widthRaw) && Number.isFinite(heightRaw) && widthRaw > 0 && heightRaw > 0) {
    return {
      w: clampSize(Math.round(widthRaw), 480, 3840),
      h: clampSize(Math.round(heightRaw), 480, 3840),
    };
  }

  return defaultSize;
}

export function renderPosterSvg(input: PosterRenderInput) {
  const titleSize = Math.max(42, Math.min(112, Math.round(78 * input.titleScale)));
  const subtitleSize = Math.round(titleSize * 0.32);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${input.width}" height="${input.height}" viewBox="0 0 ${input.width} ${input.height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${input.bgColor}" />
      <stop offset="100%" stop-color="#030712" />
    </linearGradient>
    <radialGradient id="halo" cx="0.85" cy="0" r="0.85">
      <stop offset="0%" stop-color="${input.accentColor}" stop-opacity="0.28" />
      <stop offset="100%" stop-color="${input.accentColor}" stop-opacity="0" />
    </radialGradient>
  </defs>

  <rect x="0" y="0" width="${input.width}" height="${input.height}" fill="url(#bgGrad)"/>
  <rect x="0" y="0" width="${input.width}" height="${input.height}" fill="url(#halo)"/>

  <rect x="56" y="56" width="${input.width - 112}" height="${input.height - 112}" rx="28" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.18)"/>

  <text x="104" y="128" fill="#9aa8c2" font-size="22" font-family="Inter, Noto Sans SC, sans-serif" letter-spacing="3">SHCW POSTER ENGINE</text>
  <text x="${input.width - 104}" y="128" text-anchor="end" fill="#9aa8c2" font-size="22" font-family="Inter, Noto Sans SC, sans-serif" letter-spacing="3">${esc(input.dateLabel)}</text>

  <foreignObject x="104" y="176" width="${input.width - 208}" height="${Math.round(input.height * 0.45)}">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Inter,'Noto Sans SC',sans-serif;color:#ecf2ff;line-height:1.05;font-size:${titleSize}px;font-weight:650;letter-spacing:-0.02em;max-width:12ch;word-wrap:break-word;">${esc(input.title)}</div>
  </foreignObject>

  <foreignObject x="104" y="${Math.round(input.height * 0.53)}" width="${input.width - 208}" height="${Math.round(input.height * 0.16)}">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Inter,'Noto Sans SC',sans-serif;color:#99a6bf;line-height:1.45;font-size:${subtitleSize}px;max-width:48ch;">${esc(input.subtitle)}</div>
  </foreignObject>

  <text x="104" y="${Math.round(input.height * 0.76)}" fill="${input.accentColor}" font-size="28" font-family="Inter, Noto Sans SC, sans-serif" font-weight="600" letter-spacing="2">${esc(input.phase)}</text>
  <line x1="330" y1="${Math.round(input.height * 0.75)}" x2="330" y2="${Math.round(input.height * 0.88)}" stroke="${input.accentColor}" stroke-opacity="0.5" stroke-width="4"/>
  <text x="356" y="${Math.round(input.height * 0.79)}" fill="#c8d3e8" font-size="24" font-family="Inter, Noto Sans SC, sans-serif">Editorial timeline composition for international communication.</text>

</svg>`;
}

export async function renderPosterPdf(input: PosterRenderInput) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([input.width, input.height]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const bg = hexToRgbColor(input.bgColor);
  const accent = hexToRgbColor(input.accentColor);
  const light = rgb(0.92, 0.95, 0.99);
  const muted = rgb(0.62, 0.66, 0.75);

  page.drawRectangle({ x: 0, y: 0, width: input.width, height: input.height, color: bg });
  page.drawRectangle({
    x: 56,
    y: 56,
    width: input.width - 112,
    height: input.height - 112,
    borderColor: rgb(1, 1, 1),
    borderWidth: 1,
    opacity: 0.14,
  });

  page.drawText("SHCW POSTER ENGINE", { x: 104, y: input.height - 120, size: 18, font, color: muted });
  page.drawText(input.dateLabel, { x: input.width - 180, y: input.height - 120, size: 18, font, color: muted });

  const titleSize = clampSize(Math.round(64 * input.titleScale), 34, 88);
  const titleLines = wrapTextByLength(input.title, 14).slice(0, 4);
  let titleY = input.height - 220;
  for (const line of titleLines) {
    page.drawText(line, { x: 104, y: titleY, size: titleSize, font: fontBold, color: light });
    titleY -= titleSize * 1.1;
  }

  const subtitleLines = wrapTextByLength(input.subtitle, 38).slice(0, 3);
  let subtitleY = Math.max(260, titleY - 24);
  for (const line of subtitleLines) {
    page.drawText(line, { x: 104, y: subtitleY, size: 22, font, color: muted });
    subtitleY -= 30;
  }

  page.drawText(input.phase, { x: 104, y: 150, size: 24, font: fontBold, color: accent });
  page.drawRectangle({ x: 320, y: 130, width: 3, height: 82, color: accent, opacity: 0.7 });
  page.drawText("Editorial timeline composition for international communication.", {
    x: 342,
    y: 166,
    size: 18,
    font,
    color: light,
  });

  return doc.save();
}

export function renderPosterPng(svg: string, width: number) {
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: width } });
  const pngData = resvg.render();
  return pngData.asPng();
}
