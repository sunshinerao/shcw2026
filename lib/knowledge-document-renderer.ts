/**
 * Knowledge Asset PDF Document Renderer
 * Generates professional formatted PDF documents with templates
 */

import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import type { FormalDocumentTemplateConfig } from "@/lib/knowledge-template";
import type { KnowledgeAsset } from "@prisma/client";

export interface PDFRenderData {
  knowledgeAsset: KnowledgeAsset;
  templateConfig: FormalDocumentTemplateConfig;
  includeWatermark?: boolean;
  eventQRCodeUrl?: string;
  shouldWatermark?: boolean;
}

/**
 * 生成PDF文档的字节流
 */
export async function generatePDFDocument(data: PDFRenderData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: data.templateConfig.pageSize === "A4" ? "A4" : "Letter",
        margin: 50,
      });

      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      setupDocumentStyles(doc, data.templateConfig);

      if (data.templateConfig.renderMode === "figma_whitepaper") {
        renderFigmaWhitepaperDocument(doc, data);
        doc.end();
        return;
      }

      // 渲染文档内容
      if (data.templateConfig.includeCover) {
        renderCover(doc, data);
      }

      if (data.templateConfig.includeTableOfContents) {
        renderTableOfContents(doc, data);
      }

      // 主要内容
      renderMainContent(doc, data);

      // 参考资料
      if (data.templateConfig.includeReferences && data.knowledgeAsset.references) {
        renderReferences(doc, data);
      }

      // 水印处理
      if (data.templateConfig.includeWatermark && data.shouldWatermark !== false) {
        // 水印在所有内容之后通过特殊处理添加
        // 注意：PDFKit不直接支持背景水印，所以通过另外的方式处理
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export type WhitepaperTocEntry = { title: string; page: number };

export type WhitepaperPlannedPageDraft =
  | { kind: "cover" }
  | { kind: "toc"; entries: WhitepaperTocEntry[] }
  | { kind: "intro"; title: string; subtitle?: string; body: string }
  | { kind: "highlights"; items: string[] }
  | { kind: "recommendations"; items: string[] }
  | { kind: "quote"; text: string; caption?: string }
  | { kind: "chapter"; chapterIndex: number; title: string; subtitle?: string; body: string; continuation?: boolean }
  | { kind: "references"; items: string[] }
  | { kind: "about"; body: string };

export type WhitepaperPlannedPage = WhitepaperPlannedPageDraft & { pageNumber: number };

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitLongSegment(text: string, limit: number): string[] {
  if (text.length <= limit) return [text.trim()];

  const sentenceParts = text.split(/(?<=[.!?。！？])\s+/).filter(Boolean);
  const segments: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current.trim()) segments.push(current.trim());
    current = "";
  };

  for (const part of sentenceParts.length > 1 ? sentenceParts : text.split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${part}` : part;
    if (candidate.length <= limit) {
      current = candidate;
    } else {
      pushCurrent();
      if (String(part).length > limit) {
        const raw = String(part);
        for (let i = 0; i < raw.length; i += limit) {
          segments.push(raw.slice(i, i + limit).trim());
        }
      } else {
        current = String(part);
      }
    }
  }

  pushCurrent();
  return segments.filter(Boolean);
}

function paginateText(text: string, firstPageChars: number, bodyPageChars: number): string[] {
  const paragraphs = normalizeParagraphs(text);
  if (paragraphs.length === 0) return [normalizeText(text)];

  const pages: string[] = [];
  let current = "";
  let limit = firstPageChars;

  const flush = () => {
    if (current.trim()) pages.push(current.trim());
    current = "";
    limit = bodyPageChars;
  };

  const tryAppend = (segment: string) => {
    const candidate = current ? `${current}\n\n${segment}` : segment;
    if (candidate.length <= limit) {
      current = candidate;
      return true;
    }
    return false;
  };

  for (const para of paragraphs) {
    if (tryAppend(para)) continue;

    if (current) flush();

    if (!tryAppend(para)) {
      const pieces = splitLongSegment(para, limit);
      for (const piece of pieces) {
        if (!tryAppend(piece)) {
          flush();
          current = piece;
        }
      }
    }
  }

  flush();
  return pages.filter(Boolean);
}

function normalizeReferenceList(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof raw === "string") {
    return raw
      .split(/\n+/)
      .map((item) => item.replace(/^\d+[.)]\s*/, "").trim())
      .filter(Boolean);
  }

  return [];
}

export function buildWhitepaperPlan(asset: KnowledgeAsset, config: FormalDocumentTemplateConfig): WhitepaperPlannedPage[] {
  const tocItemsPerPage = Math.max(4, Math.min(12, config.tocItemsPerPage ?? 6));
  const firstPageChars = Math.max(800, config.chapterFirstPageChars ?? 1600);
  const bodyPageChars = Math.max(1000, config.chapterBodyPageChars ?? 2300);
  const summary = normalizeText(asset.summaryEn || asset.summary || "");
  const quote = normalizeText((asset as any).pullQuoteEn || (asset as any).pullQuote || "");
  const quoteCaption = normalizeText((asset as any).pullQuoteCaptionEn || (asset as any).pullQuoteCaption || "");
  const aboutText = normalizeText((asset as any).aboutUsEn || (asset as any).aboutUs || "Shanghai Climate Week 2026 Knowledge Hub");
  const references = normalizeReferenceList((asset as any).references);

  const sourceChapters = Array.isArray((asset as any).chapters) && (asset as any).chapters.length > 0
    ? (asset as any).chapters
    : [{ title: asset.titleEn || asset.title || "Content", subtitle: asset.subtitleEn || asset.subtitle || "", content: asset.contentEn || asset.content || "" }];

  const chapterDerivedHighlights = sourceChapters
    .flatMap((chapter: any) => (Array.isArray(chapter?.keyPoints) ? chapter.keyPoints : []))
    .map((item: unknown) => normalizeText(item))
    .filter(Boolean);

  const topLevelHighlights = normalizeReferenceList((asset as any).keyPointsEn || (asset as any).keyPoints);
  const keyHighlights = (topLevelHighlights.length > 0 ? topLevelHighlights : chapterDerivedHighlights).slice(0, 6);
  const recommendations = normalizeReferenceList((asset as any).recommendationsEn || (asset as any).recommendations).slice(0, 8);

  const chapters = sourceChapters.map((chapter: any, index: number) => ({
    index,
    title: normalizeText(chapter?.title) || `Chapter ${index + 1}`,
    subtitle: normalizeText(chapter?.subtitle),
    bodyPages: paginateText(normalizeText(chapter?.content), firstPageChars, bodyPageChars),
  }));

  let tocPageCount = config.includeTableOfContents ? 1 : 0;
  let tocEntries: WhitepaperTocEntry[] = [];
  let tailPages: WhitepaperPlannedPageDraft[] = [];

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const nextEntries: WhitepaperTocEntry[] = [];
    const nextTailPages: WhitepaperPlannedPageDraft[] = [];
    let currentPage = 2 + tocPageCount;

    if (summary) {
      nextEntries.push({ title: "Introduction", page: currentPage });
      nextTailPages.push({
        kind: "intro",
        title: asset.titleEn || asset.title || "Introduction",
        subtitle: asset.subtitleEn || asset.subtitle || "",
        body: summary,
      });
      currentPage += 1;
    }

    if (keyHighlights.length > 0) {
      nextEntries.push({ title: "Key Highlights", page: currentPage });
      nextTailPages.push({ kind: "highlights", items: keyHighlights });
      currentPage += 1;
    }

    if (recommendations.length > 0) {
      nextEntries.push({ title: "Recommendations", page: currentPage });
      nextTailPages.push({ kind: "recommendations", items: recommendations });
      currentPage += 1;
    }

    if (quote) {
      nextTailPages.push({ kind: "quote", text: quote, caption: quoteCaption });
      currentPage += 1;
    }

    chapters.forEach((chapter: { index: number; title: string; subtitle: string; bodyPages: string[] }) => {
      nextEntries.push({ title: chapter.title, page: currentPage });
      const [firstChunk, ...restChunks] = chapter.bodyPages.length > 0 ? chapter.bodyPages : [""];
      nextTailPages.push({
        kind: "chapter",
        chapterIndex: chapter.index,
        title: chapter.title,
        subtitle: chapter.subtitle,
        body: firstChunk,
        continuation: false,
      });
      currentPage += 1;

      restChunks.forEach((chunk: string) => {
        nextTailPages.push({
          kind: "chapter",
          chapterIndex: chapter.index,
          title: chapter.title,
          subtitle: chapter.subtitle,
          body: chunk,
          continuation: true,
        });
        currentPage += 1;
      });
    });

    if (config.includeReferences && references.length > 0) {
      nextEntries.push({ title: "References", page: currentPage });
      const refPages = paginateText(references.map((item, idx) => `${idx + 1}. ${item}`).join("\n\n"), bodyPageChars, bodyPageChars);
      refPages.forEach((chunk) => {
        nextTailPages.push({ kind: "references", items: chunk.split(/\n\n/).filter(Boolean) });
        currentPage += 1;
      });
    }

    if (config.includeAboutPage !== false) {
      nextEntries.push({ title: "About Us", page: currentPage });
      nextTailPages.push({ kind: "about", body: aboutText });
    }

    const requiredTocPages = config.includeTableOfContents ? Math.max(1, Math.ceil(nextEntries.length / tocItemsPerPage)) : 0;
    tocEntries = nextEntries;
    tailPages = nextTailPages;

    if (requiredTocPages === tocPageCount) break;
    tocPageCount = requiredTocPages;
  }

  const pages: WhitepaperPlannedPageDraft[] = [{ kind: "cover" }];

  if (config.includeTableOfContents) {
    for (let i = 0; i < tocEntries.length; i += tocItemsPerPage) {
      pages.push({ kind: "toc", entries: tocEntries.slice(i, i + tocItemsPerPage) });
    }
  }

  pages.push(...tailPages);

  return pages.map((page, index) => ({
    ...page,
    pageNumber: index + 1,
  })) as WhitepaperPlannedPage[];
}

function renderFigmaWhitepaperDocument(doc: PDFKit.PDFDocument, data: PDFRenderData) {
  const pages = buildWhitepaperPlan(data.knowledgeAsset, data.templateConfig);

  pages.forEach((page, index) => {
    if (index > 0) {
      doc.addPage();
    }

    switch (page.kind) {
      case "cover":
        renderFigmaCoverPage(doc, data.knowledgeAsset, data.templateConfig);
        break;
      case "toc":
        renderFigmaTocPage(doc, page.entries, page.pageNumber, data.templateConfig);
        break;
      case "intro":
        renderFigmaIntroPage(doc, page.title, page.subtitle || "", page.body, page.pageNumber, data.templateConfig);
        break;
      case "highlights":
        renderFigmaHighlightsPage(doc, page.items, page.pageNumber, data.templateConfig);
        break;
      case "recommendations":
        renderFigmaRecommendationsPage(doc, page.items, page.pageNumber, data.templateConfig);
        break;
      case "quote":
        renderFigmaQuotePage(doc, page.text, page.caption || "", page.pageNumber, data.templateConfig);
        break;
      case "chapter":
        renderFigmaChapterPage(doc, page, data.templateConfig);
        break;
      case "references":
        renderFigmaReferencesPage(doc, page.items, page.pageNumber, data.templateConfig);
        break;
      case "about":
        renderFigmaAboutPage(doc, page.body, page.pageNumber, data.templateConfig);
        break;
      default:
        break;
    }
  });
}

function renderFigmaPageNumber(doc: PDFKit.PDFDocument, pageNumber: number, light = false) {
  doc
    .fontSize(10)
    .fill(light ? "#ffffff" : "#6b7280")
    .text(String(pageNumber), 0, doc.page.height - 32, {
      width: doc.page.width,
      align: "center",
    });
}

function renderFigmaCoverPage(doc: PDFKit.PDFDocument, asset: KnowledgeAsset, config: FormalDocumentTemplateConfig) {
  const accent = resolveAccentColor(config);
  const title = asset.titleEn || asset.title || "Knowledge White Paper";
  const subtitle = asset.subtitleEn || asset.subtitle || "";
  const publishDate = asset.publishDate ? new Date(asset.publishDate).toLocaleDateString("en-US", { year: "numeric", month: "long" }) : "Shanghai Climate Week 2026";
  const typeLabel = String(asset.type || "WHITE_PAPER").replace(/_/g, " ");
  const summary = normalizeText(asset.summaryEn || asset.summary || "").slice(0, 240);

  doc.rect(0, 0, doc.page.width, 560).fill(accent);
  doc.roundedRect(64, 78, 220, 28, 14).fill("#ffffff");
  doc.fill(accent).fontSize(10).font("Helvetica-Bold").text("Knowledge Hub · Shanghai Climate Week 2026", 78, 87);
  doc.roundedRect(doc.page.width - 170, 78, 106, 28, 14).fill("#111827");
  doc.fill("#ffffff").fontSize(10).font("Helvetica-Bold").text(typeLabel, doc.page.width - 160, 87, { width: 86, align: "center" });

  doc
    .fill("#ffffff")
    .fontSize(34)
    .font("Helvetica-Bold")
    .text(title, 64, 210, { width: doc.page.width - 128 });

  if (summary) {
    doc
      .fill("#ffffff")
      .fontSize(12)
      .font("Helvetica")
      .text(summary, 64, 332, { width: doc.page.width - 150, height: 110, lineGap: 2 });
  }

  if (subtitle) {
    doc
      .fill("#4b5563")
      .fontSize(22)
      .font("Times-Bold")
      .text(subtitle, 64, 590, { width: doc.page.width - 128 });
  }

  doc
    .fill("#6b7280")
    .fontSize(12)
    .font("Helvetica")
    .text(publishDate, 64, 720, { width: doc.page.width - 128 });
}

function renderFigmaTocPage(doc: PDFKit.PDFDocument, entries: WhitepaperTocEntry[], pageNumber: number, config: FormalDocumentTemplateConfig) {
  const accent = resolveAccentColor(config);
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(accent);
  doc.moveTo(64, 96).lineTo(128, 96).strokeColor("#ffffff").stroke();
  doc
    .fill("#ffffff")
    .fontSize(28)
    .font("Helvetica-Bold")
    .text("Table of contents", 64, 160, { width: doc.page.width - 128 });

  let y = 300;
  entries.forEach((entry) => {
    const label = entry.title;
    const dots = ".".repeat(Math.max(12, 90 - label.length));
    doc
      .fontSize(11)
      .font("Helvetica")
      .fill("#ffffff")
      .text(`${label} ${dots}`, 64, y, { width: doc.page.width - 120, lineBreak: false });
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fill("#ffffff")
      .text(String(entry.page), doc.page.width - 90, y, { width: 26, align: "right" });
    y += 26;
  });

  renderFigmaPageNumber(doc, pageNumber, true);
}

function renderFigmaIntroPage(doc: PDFKit.PDFDocument, title: string, subtitle: string, body: string, pageNumber: number, config: FormalDocumentTemplateConfig) {
  const accent = resolveAccentColor(config);
  doc.moveTo(64, 96).lineTo(160, 96).strokeColor(accent).stroke();
  doc.fill("#111111").fontSize(30).font("Helvetica-Bold").text(title, 64, 180, { width: doc.page.width - 128 });
  if (subtitle) {
    doc.fill("#4b5563").fontSize(18).font("Times-Bold").text(subtitle, 64, 255, { width: doc.page.width - 128 });
  }
  doc.fill("#2f2f2f").fontSize(11).font("Helvetica").text(body, 64, 340, {
    width: doc.page.width - 128,
    height: 420,
    lineGap: 2,
  });
  renderFigmaPageNumber(doc, pageNumber);
}

function renderFigmaHighlightsPage(doc: PDFKit.PDFDocument, items: string[], pageNumber: number, config: FormalDocumentTemplateConfig) {
  const accent = resolveAccentColor(config);
  doc.moveTo(64, 96).lineTo(160, 96).strokeColor(accent).stroke();
  doc.fill("#111111").fontSize(28).font("Helvetica-Bold").text("Key highlights", 64, 150, {
    width: doc.page.width - 128,
  });
  doc.fill("#5e5e5e").fontSize(12).font("Helvetica").text("A rapid overview of the most important signals from this whitepaper.", 64, 190, {
    width: doc.page.width - 128,
  });

  let y = 250;
  items.slice(0, 5).forEach((item, index) => {
    doc.roundedRect(64, y, doc.page.width - 128, 82, 12).fillAndStroke("#f8fafc", "#dbe4ea");
    doc.fill(accent).fontSize(16).font("Helvetica-Bold").text(String(index + 1).padStart(2, "0"), 82, y + 16);
    doc.fill("#1f2937").fontSize(11).font("Helvetica").text(item, 122, y + 16, {
      width: doc.page.width - 190,
      height: 52,
      lineGap: 2,
    });
    y += 96;
  });

  renderFigmaPageNumber(doc, pageNumber);
}

function renderFigmaRecommendationsPage(doc: PDFKit.PDFDocument, items: string[], pageNumber: number, config: FormalDocumentTemplateConfig) {
  const accent = resolveAccentColor(config);
  doc.moveTo(64, 96).lineTo(160, 96).strokeColor(accent).stroke();
  doc.fill("#111111").fontSize(28).font("Helvetica-Bold").text("Recommendations", 64, 150, {
    width: doc.page.width - 128,
  });

  let y = 230;
  items.slice(0, 8).forEach((item, index) => {
    doc.fill(accent).fontSize(12).font("Helvetica-Bold").text(`${index + 1}.`, 64, y);
    doc.fill("#2f2f2f").fontSize(11).font("Helvetica").text(item, 92, y, {
      width: doc.page.width - 156,
      lineGap: 2,
    });
    y = doc.y + 16;
  });

  renderFigmaPageNumber(doc, pageNumber);
}

function renderFigmaQuotePage(doc: PDFKit.PDFDocument, quote: string, caption: string, pageNumber: number, config: FormalDocumentTemplateConfig) {
  const accent = resolveAccentColor(config);
  doc.rect(0, 0, doc.page.width, doc.page.height).fill("#e9ddcf");
  doc.fill(accent).fontSize(72).font("Times-Bold").text("“", 64, 180);
  doc.fill("#2f2f2f").fontSize(22).font("Times-Bold").text(quote, 64, 240, {
    width: doc.page.width - 128,
    lineGap: 4,
  });
  if (caption) {
    doc.fill("#5e5e5e").fontSize(11).font("Helvetica-Bold").text(caption.toUpperCase(), 64, 640, {
      width: doc.page.width - 128,
    });
  }
  renderFigmaPageNumber(doc, pageNumber);
}

function renderFigmaChapterPage(
  doc: PDFKit.PDFDocument,
  page: Extract<WhitepaperPlannedPage, { kind: "chapter" }>,
  config: FormalDocumentTemplateConfig,
) {
  const accent = resolveAccentColor(config);

  if (!page.continuation) {
    doc.fill("#111111").fontSize(28).font("Helvetica-Bold").text(page.title, 64, 80, {
      width: doc.page.width - 128,
    });
    if (page.subtitle) {
      doc.fill(accent).fontSize(18).font("Times-Bold").text(page.subtitle, 64, 150, {
        width: doc.page.width - 128,
      });
    }
    doc.moveTo(64, 200).lineTo(128, 200).strokeColor(accent).stroke();
    doc.fill("#2f2f2f").fontSize(11).font("Helvetica").text(page.body, 64, 220, {
      width: doc.page.width - 128,
      height: 540,
      lineGap: 2,
    });
  } else {
    doc.fill(accent).fontSize(12).font("Helvetica-Bold").text(`${page.title} · Continued`, 64, 72, {
      width: doc.page.width - 128,
    });
    doc.fill("#2f2f2f").fontSize(11).font("Helvetica").text(page.body, 64, 110, {
      width: doc.page.width - 128,
      height: 640,
      lineGap: 2,
    });
  }

  renderFigmaPageNumber(doc, page.pageNumber);
}

function renderFigmaReferencesPage(doc: PDFKit.PDFDocument, items: string[], pageNumber: number, config: FormalDocumentTemplateConfig) {
  const accent = resolveAccentColor(config);
  doc.fill("#111111").fontSize(24).font("Helvetica-Bold").text("References", 64, 80, {
    width: doc.page.width - 128,
  });
  doc.moveTo(64, 118).lineTo(128, 118).strokeColor(accent).stroke();
  doc.fill("#2f2f2f").fontSize(10).font("Helvetica").text(items.join("\n\n"), 64, 140, {
    width: doc.page.width - 128,
    height: 620,
    lineGap: 2,
  });
  renderFigmaPageNumber(doc, pageNumber);
}

function renderFigmaAboutPage(doc: PDFKit.PDFDocument, body: string, pageNumber: number, config: FormalDocumentTemplateConfig) {
  const accent = resolveAccentColor(config);
  const bandTop = doc.page.height - 250;
  doc.rect(0, bandTop, doc.page.width, 250).fill(accent);
  doc.moveTo(64, bandTop + 32).lineTo(128, bandTop + 32).strokeColor("#ffffff").stroke();
  doc.fill("#ffffff").fontSize(28).font("Times-Bold").text("About us", 64, bandTop + 54, {
    width: doc.page.width - 128,
  });
  doc.fill("#ffffff").fontSize(11).font("Helvetica").text(body, 64, bandTop + 105, {
    width: doc.page.width - 128,
    height: 110,
    lineGap: 2,
  });
  renderFigmaPageNumber(doc, pageNumber, true);
}

/**
 * 设置文档样式
 */
function setupDocumentStyles(
  doc: PDFKit.PDFDocument,
  config: FormalDocumentTemplateConfig
) {
  // 设置默认字体
  type FontKey = "Helvetica" | "Courier" | "Times-Roman" | "Times-Bold";
  const fontMap: Record<string, FontKey> = {
    "PingFang SC": "Helvetica",
    "Arial": "Helvetica",
    "sans-serif": "Helvetica",
  };

  const selectedFont: FontKey = fontMap[config.fontFamily] || "Helvetica";
  doc.font(selectedFont);
}

function resolveAccentColor(config: FormalDocumentTemplateConfig) {
  if (config.accentColor?.trim()) return config.accentColor.trim();
  if (config.colorScheme === "green") return "#0f766e";
  if (config.colorScheme === "gray") return "#475569";
  return "#2563eb";
}

function renderFooter(doc: PDFKit.PDFDocument, config: FormalDocumentTemplateConfig) {
  const footerText = config.footerText || "© Shanghai Climate Week 2026";
  doc
    .fontSize(8)
    .fill("#666666")
    .text(footerText, 50, doc.page.height - 42, {
      width: doc.page.width - 100,
      align: "left",
    });
}

/**
 * 渲染封面页
 */
function renderCover(doc: PDFKit.PDFDocument, data: PDFRenderData) {
  const config = data.templateConfig;
  const asset = data.knowledgeAsset;
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const accentColor = resolveAccentColor(config);

  // 背景色块
  doc.rect(0, 0, pageWidth, pageHeight * 0.4).fill(accentColor);

  // 获取标题
  const title = asset.titleEn || asset.title || "Knowledge Asset";
  const subtitle = asset.subtitleEn || asset.subtitle;

  // 标题
  doc
    .fill("#ffffff")
    .fontSize(32)
    .font("Helvetica-Bold")
    .text(title, 50, pageHeight * 0.15, { align: "center", width: pageWidth - 100 });

  // 副标题
  if (subtitle) {
    doc
      .fill("#e0e7ff")
      .fontSize(14)
      .font("Helvetica")
      .text(subtitle, 50, pageHeight * 0.3, { align: "center", width: pageWidth - 100 });
  }

  // 下半部分 - 基本信息
  doc.fill("#000000").fontSize(11);
  let infoY = pageHeight * 0.5;

  // 资产类型
  doc.text(`Type: ${asset.type || ""}`, 50, infoY);
  infoY += 30;

  // 发布日期
  if (asset.publishDate) {
    const pubDate = new Date(asset.publishDate).toLocaleDateString();
    doc.text(`Published: ${pubDate}`, 50, infoY);
    infoY += 30;
  }

  // 摘要
  if (asset.summary) {
    doc.fontSize(10).text("Summary:", 50, infoY);
    infoY += 15;
    doc
      .fontSize(9)
      .font("Helvetica")
      .text(asset.summary.substring(0, 300), 50, infoY, { width: pageWidth - 100 });
  }

  // 事件QR码
  if (data.eventQRCodeUrl) {
    try {
      doc.image(data.eventQRCodeUrl, pageWidth - 150, pageHeight - 150, {
        width: 100,
        height: 100,
      });
    } catch (e) {
      // QR码加载失败，继续
    }
  }

  // 页脚
  doc
    .fontSize(9)
    .fill("#666666")
    .text(config.footerText || "© Shanghai Climate Week 2026", 50, pageHeight - 40, {
      align: "center",
    });

  doc.addPage();
}

/**
 * 渲染目录页
 */
function renderTableOfContents(doc: PDFKit.PDFDocument, data: PDFRenderData) {
  const asset = data.knowledgeAsset;

  // 标题
  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .text("Table of Contents", 50, 50);

  doc.moveTo(50, 75).lineTo(doc.page.width - 50, 75).stroke();

  let y = 100;

  // 章节列表
  const chapters = asset.chapters as any[] | null;
  if (chapters && Array.isArray(chapters)) {
    chapters.forEach((ch, idx) => {
      const title = ch.title || `Section ${idx + 1}`;
      const pageRange = ch.pageStart ? ` (p. ${ch.pageStart})` : "";

      doc
        .fontSize(11)
        .fill("#000000")
        .text(`${idx + 1}. ${title}${pageRange}`, 70, y);

      y += 25;
      if (y > doc.page.height - 100) {
        doc.addPage();
        y = 50;
      }
    });
  }

  // 其他常见部分
  const standardSections = [
    "Key Points",
    "Recommendations",
    "References",
  ];
  let sectionNum = (chapters?.length || 0) + 1;

  for (const section of standardSections) {
    doc.fontSize(11).fill("#000000").text(`${sectionNum}. ${section}`, 70, y);
    y += 25;
    sectionNum += 1;

    if (y > doc.page.height - 100) {
      doc.addPage();
      y = 50;
    }
  }

  doc.addPage();
}

/**
 * 渲染主要内容
 */
function renderMainContent(doc: PDFKit.PDFDocument, data: PDFRenderData) {
  const asset = data.knowledgeAsset;
  const config = data.templateConfig;
  const accentColor = resolveAccentColor(config);
  let y = 50;
  const pageWidth = doc.page.width;
  const maxWidth = pageWidth - 100;

  const chapters = Array.isArray(asset.chapters) ? (asset.chapters as any[]) : [];
  const topKeyPoints = Array.isArray(asset.keyPoints) ? (asset.keyPoints as string[]) : [];
  const recommendationItems = Array.isArray(asset.recommendations)
    ? (asset.recommendations as string[])
    : typeof asset.recommendations === "string"
    ? asset.recommendations.split(/\n+/).map((item) => item.replace(/^[-•\s]+/, "").trim()).filter(Boolean)
    : [];

  const finishPage = () => {
    if (config.includeHeaders) {
      renderHeader(doc, asset, config);
    }
    if (config.includeFooters) {
      renderFooter(doc, config);
    }
    if (config.includePageNumbers) {
      renderPageNumber(doc, config);
    }
  };

  const ensureSpace = (minimum = 100) => {
    if (y > doc.page.height - minimum) {
      finishPage();
      doc.addPage();
      y = 50;
    }
  };

  // 标题
  doc
    .fontSize(config.styleTemplate === "minimal" ? 18 : 22)
    .font("Helvetica-Bold")
    .fill(accentColor)
    .text(asset.titleEn || asset.title || "", 50, y, { width: maxWidth });

  y = doc.y + 15;

  // 元数据
  doc.fontSize(9).fill("#666666");
  if (asset.publishDate) {
    doc.text(`Published: ${new Date(asset.publishDate).toLocaleDateString()}`, 50, y);
    y += 15;
  }
  if (asset.type) {
    doc.text(`Type: ${asset.type}`, 50, y);
    y += 15;
  }

  y += 15;
  doc.moveTo(50, y).lineTo(pageWidth - 50, y).stroke("#cccccc");
  y += 20;

  // 摘要
  if (asset.summary) {
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fill(accentColor)
      .text("Summary", 50, y);

    y += 15;
    doc
      .fontSize(config.fontSize || 10)
      .font("Helvetica")
      .fill("#000000")
      .text(asset.summary, 50, y, { width: maxWidth });

    y = doc.y + 20;
  }

  if (config.includeChapters && chapters.length > 0) {
    chapters.forEach((chapter, chapterIndex) => {
      ensureSpace(160);

      const chapterTitle = chapter.title || `Section ${chapterIndex + 1}`;
      const chapterSubtitle = chapter.subtitle || "";
      const chapterContent = typeof chapter.content === "string" ? chapter.content : "";
      const chapterKeyPoints = Array.isArray(chapter.keyPoints)
        ? chapter.keyPoints.filter((point: unknown): point is string => typeof point === "string")
        : [];

      doc
        .fontSize(15)
        .font("Helvetica-Bold")
        .fill(accentColor)
        .text(chapterTitle, 50, y, { width: maxWidth });
      y = doc.y + 8;

      if (chapterSubtitle) {
        doc
          .fontSize(10)
          .font("Helvetica-Oblique")
          .fill("#555555")
          .text(chapterSubtitle, 50, y, { width: maxWidth });
        y = doc.y + 10;
      }

      const paragraphs = chapterContent.split("\n\n").filter(Boolean);
      for (const para of paragraphs) {
        ensureSpace(100);
        doc
          .fontSize(config.fontSize || 10)
          .font("Helvetica")
          .fill("#000000")
          .text(para, 50, y, { width: maxWidth });
        y = doc.y + 10;
      }

      if (chapterKeyPoints.length > 0) {
        ensureSpace(120);
        doc
          .fontSize(10)
          .font("Helvetica-Bold")
          .fill(accentColor)
          .text("Key Points", 50, y);
        y += 14;

        chapterKeyPoints.forEach((point: string) => {
          ensureSpace(80);
          doc
            .fontSize(9)
            .font("Helvetica")
            .fill("#000000")
            .text(`• ${point}`, 60, y, { width: maxWidth - 10 });
          y = doc.y + 6;
        });
      }

      y += 16;
    });
  } else if (asset.content) {
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fill(accentColor)
      .text("Content", 50, y);

    y += 15;

    const paragraphs = asset.content.split("\n\n").filter(Boolean);
    for (const para of paragraphs) {
      ensureSpace(100);
      doc
        .fontSize(config.fontSize || 10)
        .font("Helvetica")
        .fill("#000000")
        .text(para, 50, y, { width: maxWidth });

      y = doc.y + 12;
    }
  }

  // 顶层关键点
  if (topKeyPoints.length > 0) {
    ensureSpace(140);
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fill(accentColor)
      .text("Key Points", 50, y);

    y += 15;

    topKeyPoints.forEach((point: string) => {
      ensureSpace(80);
      doc
        .fontSize(10)
        .font("Helvetica")
        .fill("#000000")
        .text(`• ${point}`, 60, y, { width: maxWidth - 10 });
      y = doc.y + 8;
    });
  }

  // 推荐阅读
  if (recommendationItems.length > 0) {
    ensureSpace(140);
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fill(accentColor)
      .text("Recommendations", 50, y);
    y += 15;

    recommendationItems.forEach((item: string) => {
      ensureSpace(80);
      doc
        .fontSize(10)
        .font("Helvetica")
        .fill("#000000")
        .text(`• ${item}`, 60, y, { width: maxWidth - 10 });
      y = doc.y + 8;
    });
  }

  finishPage();
}

/**
 * 渲染参考资料页
 */
function renderReferences(doc: PDFKit.PDFDocument, data: PDFRenderData) {
  const config = data.templateConfig;
  const references = data.knowledgeAsset.references as any[] | null;
  const accentColor = resolveAccentColor(config);

  if (!references || !Array.isArray(references)) return;

  if (config.includeHeaders) {
    renderHeader(doc, data.knowledgeAsset, config);
  }
  if (config.includeFooters) {
    renderFooter(doc, config);
  }
  if (config.includePageNumbers) {
    renderPageNumber(doc, config);
  }

  doc.addPage();

  // 标题
  doc
    .fontSize(16)
    .font("Helvetica-Bold")
    .fill(accentColor)
    .text("References", 50, 50);

  let y = 80;
  const maxWidth = doc.page.width - 100;

  // 参考文献列表
  references.forEach((ref: any, idx: number) => {
    if (y > doc.page.height - 100) {
      if (config.includeHeaders) {
        renderHeader(doc, data.knowledgeAsset, config);
      }
      if (config.includeFooters) {
        renderFooter(doc, config);
      }
      if (config.includePageNumbers) {
        renderPageNumber(doc, config);
      }
      doc.addPage();
      y = 50;
    }

    const refText = typeof ref === "string" ? ref : ref.title || JSON.stringify(ref);

    doc
      .fontSize(9)
      .font("Helvetica")
      .fill("#000000")
      .text(`[${idx + 1}] ${refText}`, 60, y, { width: maxWidth - 10 });

    y = doc.y + 10;
  });

  if (config.includeHeaders) {
    renderHeader(doc, data.knowledgeAsset, config);
  }
  if (config.includeFooters) {
    renderFooter(doc, config);
  }
  if (config.includePageNumbers) {
    renderPageNumber(doc, config);
  }
}

/**
 * 渲染页码
 */
function renderPageNumber(doc: PDFKit.PDFDocument, config: FormalDocumentTemplateConfig) {
  const currentPage = (doc as any).page.number;
  doc
    .fontSize(9)
    .fill("#999999")
    .text(`- ${currentPage} -`, 50, doc.page.height - 30, {
      align: "center",
    });
}

/**
 * 渲染页头
 */
function renderHeader(
  doc: PDFKit.PDFDocument,
  asset: KnowledgeAsset,
  config: FormalDocumentTemplateConfig
) {
  const headerText = config.headerTextEn || config.headerText || asset.titleEn || asset.title || "";

  doc
    .fontSize(8)
    .fill("#666666")
    .text(headerText, 50, 20, { width: doc.page.width - 100 });
}

/**
 * 添加水印（当前通过SVG覆盖实现）
 */
export function addWatermarkText(
  doc: PDFKit.PDFDocument,
  text: string,
  config: FormalDocumentTemplateConfig
) {
  const angle = config.watermarkAngle || 45;
  const opacity = config.watermarkOpacity || 0.1;

  // 简单水印实现：在每页添加对角线文本
  // 注意：完整的水印实现可能需要外部库或后处理
  doc
    .fontSize(config.watermarkFontSize || 60)
    .fillColor("#999999")
    .fillOpacity(opacity)
    .rotate(angle);

  const diagonalY = doc.page.height / 2;
  doc.text(text, 0, diagonalY, { align: "center" });

  doc.rotate(-angle);
  doc.fillOpacity(1);
}
