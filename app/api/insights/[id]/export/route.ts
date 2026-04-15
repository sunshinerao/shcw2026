/**
 * API: 知识成果导出端点
 * GET /api/insights/[id]/export
 * 
 * 参数:
 * - format: pdf | docx | html (default: pdf)
 * - templateId: 指定使用的模板ID (可选)
 * - includeWatermark: boolean (仅PDF, default: true)
 * - download: boolean (default: false - 预览)
 */

import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { requireInsightAdmin } from "@/lib/insight-auth";
import { 
  getDefaultTemplate, 
  getTemplateById 
} from "@/lib/knowledge-template-db";
import { 
  buildWhitepaperPlan,
  generatePDFDocument,
  type PDFRenderData 
} from "@/lib/knowledge-document-renderer";
import type { FormalDocumentTemplateConfig } from "@/lib/knowledge-template";

function buildContentDisposition(filename: string, download: boolean) {
  const fallback = filename.replace(/[^a-zA-Z0-9._-]/g, "_") || "document.pdf";
  const encoded = encodeURIComponent(filename);
  const type = download ? "attachment" : "inline";
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function sanitizePdfText(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function createPdfSafeAsset(knowledgeAsset: any) {
  const preferredTitle =
    sanitizePdfText(knowledgeAsset.titleEn) ||
    sanitizePdfText(knowledgeAsset.title) ||
    sanitizePdfText(knowledgeAsset.slug) ||
    "Knowledge Asset";

  const preferredSubtitle =
    sanitizePdfText(knowledgeAsset.subtitleEn) ||
    sanitizePdfText(knowledgeAsset.subtitle);

  const preferredSummary =
    sanitizePdfText(knowledgeAsset.summaryEn) ||
    sanitizePdfText(knowledgeAsset.summary);

  const preferredContent =
    sanitizePdfText(knowledgeAsset.contentEn) ||
    sanitizePdfText(knowledgeAsset.content);

  const safeKeyPoints = Array.isArray(knowledgeAsset.keyPointsEn)
    ? knowledgeAsset.keyPointsEn.map((point: unknown) => sanitizePdfText(point)).filter(Boolean)
    : Array.isArray(knowledgeAsset.keyPoints)
    ? knowledgeAsset.keyPoints.map((point: unknown) => sanitizePdfText(point)).filter(Boolean)
    : [];

  return {
    ...knowledgeAsset,
    title: preferredTitle,
    titleEn: preferredTitle,
    subtitle: preferredSubtitle,
    subtitleEn: preferredSubtitle,
    summary: preferredSummary,
    summaryEn: preferredSummary,
    content: preferredContent,
    contentEn: preferredContent,
    keyPoints: safeKeyPoints,
    keyPointsEn: safeKeyPoints,
    type: sanitizePdfText(knowledgeAsset.type) || "REPORT",
  };
}

function splitTextLines(text: string, maxChars = 95) {
  const words = (text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

async function generateFallbackPdfBuffer(knowledgeAsset: any) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 790;
  const marginX = 48;

  page.drawText(knowledgeAsset.title || "Knowledge Asset", {
    x: marginX,
    y,
    size: 22,
    font: bold,
    color: rgb(0.07, 0.17, 0.34),
  });

  y -= 30;
  if (knowledgeAsset.subtitle) {
    page.drawText(knowledgeAsset.subtitle, {
      x: marginX,
      y,
      size: 12,
      font,
      color: rgb(0.3, 0.35, 0.42),
    });
    y -= 22;
  }

  page.drawText(`Type: ${knowledgeAsset.type || "REPORT"}`, {
    x: marginX,
    y,
    size: 10,
    font,
    color: rgb(0.34, 0.39, 0.45),
  });

  y -= 28;
  page.drawText("Summary", { x: marginX, y, size: 13, font: bold, color: rgb(0.08, 0.2, 0.35) });
  y -= 18;

  for (const line of splitTextLines(knowledgeAsset.summary || "", 94).slice(0, 14)) {
    page.drawText(line, { x: marginX, y, size: 10.5, font, color: rgb(0.12, 0.14, 0.18) });
    y -= 14;
  }

  y -= 10;
  page.drawText("Content", { x: marginX, y, size: 13, font: bold, color: rgb(0.08, 0.2, 0.35) });
  y -= 18;

  for (const line of splitTextLines(knowledgeAsset.content || "", 94).slice(0, 28)) {
    if (y < 50) break;
    page.drawText(line, { x: marginX, y, size: 10, font, color: rgb(0.12, 0.14, 0.18) });
    y -= 13;
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 获取查询参数
    const { searchParams } = new URL(req.url);
    const format = (searchParams.get("format") || "pdf").toLowerCase() as "pdf" | "docx" | "html";
    const templateId = searchParams.get("templateId");
    const download = searchParams.get("download") === "true";
    const includeWatermark = searchParams.get("includeWatermark") !== "false";

    // 获取知识资产
    const knowledgeAsset = await prisma.knowledgeAsset.findUnique({
      where: { id: params.id },
    });

    if (!knowledgeAsset) {
      return NextResponse.json(
        { error: "Knowledge asset not found" },
        { status: 404 }
      );
    }

    // 权限检查：非发布的资产需要管理员权限
    if (knowledgeAsset.status === "DRAFT") {
      const isAdmin = await requireInsightAdmin();
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 403 }
        );
      }
    }

    // 获取模板配置：优先使用请求指定模板，其次使用成果自身绑定模板，最后回退默认模板
    let template = null;
    if (templateId) {
      template = await getTemplateById(templateId);
    }

    if (!template) {
      if ((format === "pdf" || format === "docx") && knowledgeAsset.primaryTemplateId) {
        template = await getTemplateById(knowledgeAsset.primaryTemplateId);
      } else if (format === "html") {
        if (knowledgeAsset.primaryTemplateId) {
          const formalTemplate = await getTemplateById(knowledgeAsset.primaryTemplateId);
          if (formalTemplate && ((formalTemplate.config as any)?.formal?.renderMode === "figma_whitepaper" || formalTemplate.code === "formal_doc_v1")) {
            template = formalTemplate;
          }
        }
        if (!template) {
          const defaultFormal = await getDefaultTemplate("FORMAL_DOCUMENT");
          if (defaultFormal && (((defaultFormal.config as any)?.formal?.renderMode === "figma_whitepaper") || defaultFormal.code === "formal_doc_v1")) {
            template = defaultFormal;
          }
        }
        if (!template && knowledgeAsset.webTemplateId) {
          template = await getTemplateById(knowledgeAsset.webTemplateId);
        }
      }
    }

    if (!template) {
      template = await getDefaultTemplate(format === "html" ? "WEBPAGE_DISPLAY" : "FORMAL_DOCUMENT");
    }

    // 根据格式生成内容
    if (format === "pdf") {
      return await generatePDFResponse(knowledgeAsset, template, includeWatermark, download);
    } else if (format === "docx") {
      return await generateDocxResponse(knowledgeAsset, download);
    } else if (format === "html") {
      return await generateHtmlResponse(knowledgeAsset, template, download);
    } else {
      return NextResponse.json(
        { error: "Unsupported format" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Export knowledge asset error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * 生成PDF响应
 */
async function generatePDFResponse(
  knowledgeAsset: any,
  template: any,
  includeWatermark: boolean,
  download: boolean
) {
  try {
    const safeAsset = createPdfSafeAsset(knowledgeAsset);

    // 构建模板配置
    const templateConfig = (template?.config?.formal || {}) as Partial<FormalDocumentTemplateConfig>;
    const finalConfig: FormalDocumentTemplateConfig = {
      styleTemplate: "professional",
      colorScheme: "blue",
      renderMode: template?.code === "formal_doc_v1" ? "figma_whitepaper" : "classic",
      accentColor: template?.code === "formal_doc_v1" ? "#f6645a" : "#2563eb",
      pageSize: "A4",
      fontSize: 11,
      fontFamily: "PingFang SC, Arial",
      tocItemsPerPage: 6,
      chapterFirstPageChars: 1600,
      chapterBodyPageChars: 2300,
      forceChapterPageBreak: true,
      includeAboutPage: true,
      includeCover: true,
      includeTableOfContents: true,
      includePageNumbers: true,
      includeHeaders: true,
      includeFooters: true,
      includeWatermark: includeWatermark,
      watermarkText: "Shanghai Climate Week 2026",
      watermarkOpacity: 0.1,
      watermarkAngle: 45,
      watermarkFontSize: 60,
      includeEventQRCode: true,
      includeReferences: true,
      includeChapters: true,
      footerText: "© Shanghai Climate Week 2026",
      headerText: "Knowledge Hub",
      ...templateConfig,
    };

    const pdfData: PDFRenderData = {
      knowledgeAsset: safeAsset,
      templateConfig: finalConfig,
      includeWatermark,
      shouldWatermark: includeWatermark,
    };

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generatePDFDocument(pdfData);
    } catch (error) {
      console.error("Primary PDF renderer failed, using fallback:", error);
      pdfBuffer = await generateFallbackPdfBuffer(safeAsset);
    }

    const baseName = knowledgeAsset.titleEn || knowledgeAsset.title || knowledgeAsset.slug || "document";
    const filename = `${baseName}_${new Date().toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": pdfBuffer.length.toString(),
        "Content-Disposition": buildContentDisposition(filename, download),
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

/**
 * 生成DOCX响应 (placeholder)
 * 完整实现可以使用 docx 库
 */
async function generateDocxResponse(
  knowledgeAsset: any,
  download: boolean
) {
  // 简化实现：返回JSON文档数据，客户端可以使用docx库生成
  const filename = `${knowledgeAsset.slug || "document"}.docx`;

  const docContent = {
    title: knowledgeAsset.titleEn || knowledgeAsset.title,
    subtitle: knowledgeAsset.subtitleEn || knowledgeAsset.subtitle,
    summary: knowledgeAsset.summaryEn || knowledgeAsset.summary,
    content: knowledgeAsset.contentEn || knowledgeAsset.content,
    keyPoints: knowledgeAsset.keyPointsEn || knowledgeAsset.keyPoints,
    references: knowledgeAsset.references,
    metadata: {
      type: knowledgeAsset.type,
      publishDate: knowledgeAsset.publishDate,
      doi: knowledgeAsset.doi,
    },
  };

  // 返回JSON数据，前端使用 docx 库或 libreoffice 转换
  return new NextResponse(JSON.stringify(docContent), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...(download
        ? {
            "Content-Disposition": `attachment; filename="${filename}.json"`,
          }
        : {}),
    },
  });
}

/**
 * 生成HTML响应
 */
async function generateHtmlResponse(
  knowledgeAsset: any,
  template: any,
  download: boolean
) {
  const formalConfig = template?.config?.formal || {};
  if (formalConfig?.renderMode === "figma_whitepaper" || template?.code === "formal_doc_v1") {
    return generateFigmaWhitepaperHtmlResponse(knowledgeAsset, formalConfig, download);
  }

  const templateConfig = template?.config?.webpage || {};

  // 构建HTML文档
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${knowledgeAsset.titleEn || knowledgeAsset.title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
    }
    
    .container {
      max-width: ${templateConfig.maxContentWidth || 900}px;
      margin: 0 auto;
      padding: 40px 20px;
      background: white;
    }
    
    .header {
      margin-bottom: 40px;
      border-bottom: 2px solid ${templateConfig.accentColor || "#0d9488"};
      padding-bottom: 20px;
    }
    
    h1 {
      font-size: 2em;
      margin-bottom: 10px;
      color: #000;
    }
    
    .subtitle {
      font-size: 1.2em;
      color: #666;
      font-style: italic;
    }
    
    .metadata {
      font-size: 0.9em;
      color: #999;
      margin-top: 15px;
    }
    
    .summary {
      background: #f9f9f9;
      padding: 20px;
      border-left: 4px solid ${templateConfig.accentColor || "#0d9488"};
      margin: 30px 0;
      border-radius: 4px;
    }
    
    .summary h2 {
      font-size: 1.1em;
      margin-bottom: 10px;
      color: #000;
    }
    
    .content {
      margin: 30px 0;
    }
    
    .content p {
      margin-bottom: 15px;
      text-align: justify;
      line-height: ${templateConfig.lineHeight || 1.6};
    }
    
    .key-points {
      margin: 30px 0;
    }
    
    .key-points h2,
    .recommendations h2,
    .references h2 {
      font-size: 1.3em;
      margin-bottom: 15px;
      color: ${templateConfig.accentColor || "#0d9488"};
      border-bottom: 2px solid ${templateConfig.accentColor || "#0d9488"};
      padding-bottom: 10px;
    }
    
    .key-points ul {
      list-style: none;
      padding-left: 0;
    }
    
    .key-points li {
      padding: 8px 0 8px 25px;
      position: relative;
    }
    
    .key-points li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: ${templateConfig.accentColor || "#0d9488"};
      font-weight: bold;
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      color: #999;
      font-size: 0.9em;
    }
    
    .download-section {
      background: ${templateConfig.accentColor || "#0d9488"}22;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
    }
    
    .download-btn {
      display: inline-block;
      background: ${templateConfig.accentColor || "#0d9488"};
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      text-decoration: none;
      margin: 5px;
      font-weight: bold;
    }
    
    .download-btn:hover {
      opacity: 0.9;
    }
    
    @media print {
      .download-section {
        display: none;
      }
      body {
        background: white;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${knowledgeAsset.titleEn || knowledgeAsset.title}</h1>
      ${knowledgeAsset.subtitleEn || knowledgeAsset.subtitle ? `<div class="subtitle">${knowledgeAsset.subtitleEn || knowledgeAsset.subtitle}</div>` : ""}
      <div class="metadata">
        <strong>Type:</strong> ${knowledgeAsset.type || "N/A"} | 
        <strong>Published:</strong> ${knowledgeAsset.publishDate ? new Date(knowledgeAsset.publishDate).toLocaleDateString() : "N/A"}
        ${knowledgeAsset.doi ? `<br><strong>DOI:</strong> ${knowledgeAsset.doi}` : ""}
      </div>
    </div>
    
    ${templateConfig.showDownloadLink ? `
    <div class="download-section">
      <p>Download this document:</p>
      <a href="/api/insights/${knowledgeAsset.id}/export?format=pdf&download=true" class="download-btn">📄 Download PDF</a>
    </div>
    ` : ""}
    
    ${knowledgeAsset.summaryEn || knowledgeAsset.summary ? `
    <div class="summary">
      <h2>Summary</h2>
      <p>${knowledgeAsset.summaryEn || knowledgeAsset.summary}</p>
    </div>
    ` : ""}
    
    ${knowledgeAsset.contentEn || knowledgeAsset.content ? `
    <div class="content">
      ${(knowledgeAsset.contentEn || knowledgeAsset.content).split("\\n\\n").map((p: string) => `<p>${escapeHtml(p)}</p>`).join("")}
    </div>
    ` : ""}
    
    ${(knowledgeAsset.keyPointsEn || knowledgeAsset.keyPoints) && Array.isArray(knowledgeAsset.keyPointsEn || knowledgeAsset.keyPoints) ? `
    <div class="key-points">
      <h2>Key Points</h2>
      <ul>
        ${(knowledgeAsset.keyPointsEn || knowledgeAsset.keyPoints).map((p: string) => `<li>${escapeHtml(p)}</li>`).join("")}
      </ul>
    </div>
    ` : ""}
    
    ${knowledgeAsset.recommendationsEn || knowledgeAsset.recommendations ? `
    <div class="recommendations">
      <h2>Recommendations</h2>
      <p>${knowledgeAsset.recommendationsEn || knowledgeAsset.recommendations}</p>
    </div>
    ` : ""}
    
    <div class="footer">
      <p>© Shanghai Climate Week 2026. All rights reserved.</p>
      <p>Generated: ${new Date().toLocaleString()}</p>
    </div>
  </div>
  
  <script>
    // 打印和下载功能
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.print();
      }
    });
  </script>
</body>
</html>
  `;

  const filename = `${knowledgeAsset.slug || "document"}.html`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...(download
        ? {
            "Content-Disposition": `attachment; filename="${filename}"`,
          }
        : {}),
    },
  });
}

/**
 * 转义HTML
 */
async function generateFigmaWhitepaperHtmlResponse(
  knowledgeAsset: any,
  formalConfig: Partial<FormalDocumentTemplateConfig>,
  download: boolean,
) {
  const config: FormalDocumentTemplateConfig = {
    styleTemplate: "professional",
    colorScheme: "blue",
    renderMode: "figma_whitepaper",
    accentColor: "#f6645a",
    pageSize: "A4",
    fontSize: 11,
    fontFamily: "PingFang SC, Arial",
    tocItemsPerPage: 6,
    chapterFirstPageChars: 1600,
    chapterBodyPageChars: 2300,
    forceChapterPageBreak: true,
    includeAboutPage: true,
    includeCover: true,
    includeTableOfContents: true,
    includePageNumbers: true,
    includeHeaders: true,
    includeFooters: true,
    includeWatermark: false,
    watermarkOpacity: 0.1,
    watermarkAngle: 45,
    watermarkFontSize: 60,
    includeEventQRCode: false,
    includeReferences: true,
    includeChapters: true,
    ...formalConfig,
  };

  const pages = buildWhitepaperPlan(knowledgeAsset, config);
  const accent = config.accentColor || "#f6645a";
  const customCss = typeof formalConfig?.customCss === "string" ? formalConfig.customCss.slice(0, 20000) : "";
  const title = escapeHtml(knowledgeAsset.titleEn || knowledgeAsset.title || "Knowledge White Paper");
  const typeLabel = escapeHtml(String(knowledgeAsset.type || "WHITE_PAPER").replace(/_/g, " "));
  const summaryPreview = escapeHtml(String(knowledgeAsset.summaryEn || knowledgeAsset.summary || "").slice(0, 240));

  const pageHtml = pages.map((page) => {
    switch (page.kind) {
      case "cover":
        return `<section class="page"><div class="title-bg"></div><div class="doc-kicker">Knowledge Hub • Shanghai Climate Week 2026</div><div class="type-pill">${typeLabel}</div><h1 class="title-main">${title}</h1>${summaryPreview ? `<p class="title-summary">${summaryPreview}</p>` : ""}<p class="title-sub">${escapeHtml(knowledgeAsset.subtitleEn || knowledgeAsset.subtitle || "")}</p><p class="title-date">${escapeHtml(knowledgeAsset.publishDate ? new Date(knowledgeAsset.publishDate).toLocaleDateString("en-US", { year: "numeric", month: "long" }) : "Shanghai Climate Week 2026")}</p></section>`;
      case "toc":
        return `<section class="page accent"><div class="toc-line"></div><h2 class="toc-title">Table of contents</h2><div class="toc-list">${page.entries.map((entry) => `<div class="toc-item"><span class="toc-label">${escapeHtml(entry.title)}</span><span class="toc-dots"></span><span class="toc-page">${entry.page}</span></div>`).join("")}</div><div class="footer-toc">${page.pageNumber}</div></section>`;
      case "intro":
        return `<section class="page white"><div class="intro-line"></div><div class="section-kicker">Overview</div><h2 class="intro-title">${escapeHtml(page.title)}</h2><p class="intro-sub">${escapeHtml(page.subtitle || "")}</p><div class="intro-body">${page.body.split(/\n\s*\n/).filter(Boolean).map((p: string) => `<p>${escapeHtml(p)}</p>`).join("")}</div><div class="footer-plain">${page.pageNumber}</div></section>`;
      case "highlights":
        return `<section class="page white"><div class="section-kicker">Executive snapshot</div><h2 class="chapter-title">Key highlights</h2><div class="chapter-line"></div><div class="highlights-grid">${page.items.map((item: string, index: number) => `<div class="highlight-card"><span class="highlight-index">${String(index + 1).padStart(2, "0")}</span><p>${escapeHtml(item)}</p></div>`).join("")}</div><div class="footer-plain">${page.pageNumber}</div></section>`;
      case "recommendations":
        return `<section class="page white"><div class="section-kicker">Action agenda</div><h2 class="chapter-title">Recommendations</h2><div class="chapter-line"></div><ol class="rec-list">${page.items.map((item: string) => `<li>${escapeHtml(item)}</li>`).join("")}</ol><div class="footer-plain">${page.pageNumber}</div></section>`;
      case "quote":
        return `<section class="page quote"><p class="quote-mark">“</p><p class="quote-text">${escapeHtml(page.text)}</p><p class="quote-caption">${escapeHtml(page.caption || "")}</p><div class="footer-plain">${page.pageNumber}</div></section>`;
      case "chapter":
        return page.continuation
          ? `<section class="page white"><div class="content-continuation-title">${escapeHtml(page.title)} · Continued</div><div class="content-body">${page.body.split(/\n\s*\n/).filter(Boolean).map((p: string) => `<p>${escapeHtml(p)}</p>`).join("")}</div><div class="footer-plain">${page.pageNumber}</div></section>`
          : `<section class="page white"><h2 class="chapter-title">${escapeHtml(page.title)}</h2><p class="chapter-sub">${escapeHtml(page.subtitle || "")}</p><div class="chapter-line"></div><div class="chapter-body">${page.body.split(/\n\s*\n/).filter(Boolean).map((p: string) => `<p>${escapeHtml(p)}</p>`).join("")}</div><div class="footer-plain">${page.pageNumber}</div></section>`;
      case "references":
        return `<section class="page white"><h2 class="chapter-title">References</h2><div class="chapter-line"></div><div class="chapter-body">${page.items.map((p: string) => `<p>${escapeHtml(p)}</p>`).join("")}</div><div class="footer-plain">${page.pageNumber}</div></section>`;
      case "about":
        return `<section class="page white"><div class="final-band"></div><div class="final-line"></div><p class="final-title">About us</p><div class="final-body">${page.body.split(/\n\s*\n/).filter(Boolean).map((p: string) => `<p>${escapeHtml(p)}</p>`).join("")}</div><div class="footer-accent">${page.pageNumber}</div></section>`;
      default:
        return "";
    }
  }).join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    @page { size: 595px 842px; margin: 0; }
    :root{ --page-width: 595px; --page-height: 842px; --accent: ${accent}; --paper: #ebebeb; --text: #3a3a3a; --muted: #5e5e5e; --caption: #868686; --quote-bg: #e9ddcf; }
    *{ box-sizing:border-box; }
    html, body{ margin:0; padding:0; }
    body{ background:#d8d8d8; font-family: Arial, Helvetica, sans-serif; color: var(--text); }
    .document{ width:max-content; margin:24px auto 64px; }
    .page{ position:relative; width:var(--page-width); height:var(--page-height); overflow:hidden; margin:0 auto 24px; box-shadow:0 10px 28px rgba(15,23,42,.18); background:var(--paper); break-after:page; page-break-after:always; }
    .page.white{ background:#fff; }
    .page.accent{ background:var(--accent); }
    .page.quote{ background:var(--quote-bg); }
    .footer-accent,.footer-plain,.footer-toc{ position:absolute; left:0; width:595px; height:40px; display:flex; align-items:center; justify-content:center; font-size:12px; }
    .footer-accent{ top:802px; background:var(--accent); color:#fff; }
    .footer-plain{ top:802px; color:var(--muted); }
    .footer-toc{ top:794px; color:#fff; }
    .title-bg{ position:absolute; left:0; top:0; width:595px; height:567px; background:var(--accent); }
    .doc-kicker{ position:absolute; left:64px; top:78px; display:inline-flex; align-items:center; padding:7px 14px; border-radius:999px; background:rgba(255,255,255,.95); color:var(--accent); font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
    .type-pill{ position:absolute; right:64px; top:78px; display:inline-flex; align-items:center; justify-content:center; padding:7px 14px; border-radius:999px; background:#111827; color:#fff; font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
    .title-main{ position:absolute; left:64px; top:215px; width:437px; margin:0; color:#fff; font-size:58px; line-height:62px; letter-spacing:-1.1px; font-weight:800; }
    .title-summary{ position:absolute; left:64px; top:355px; width:408px; margin:0; color:rgba(255,255,255,.92); font-size:14px; line-height:20px; }
    .title-sub{ position:absolute; left:64px; top:590px; width:444px; margin:0; color:#5e5e5e; font-size:30px; line-height:38px; letter-spacing:-0.64px; font-weight:700; font-family: Georgia, "Times New Roman", serif; }
    .title-date{ position:absolute; left:64px; top:708px; margin:0; color:#868686; font-size:16px; text-transform:uppercase; }
    .toc-line{ position:absolute; left:64px; top:112px; width:64px; height:1px; background:#fff; }
    .toc-title{ position:absolute; left:64px; top:170px; width:436px; margin:0; color:#fff; font-size:44px; line-height:52px; font-weight:700; }
    .toc-list{ position:absolute; left:64px; top:300px; width:467px; color:#fff; font-size:12px; line-height:18px; }
    .toc-item{ display:flex; align-items:center; gap:8px; margin-bottom:8px; }
    .toc-label{ white-space:nowrap; }
    .toc-dots{ flex:1; border-bottom:1px dotted rgba(255,255,255,.8); transform:translateY(-1px); }
    .toc-page{ width:28px; text-align:right; }
    .intro-line{ position:absolute; left:64px; top:96px; width:96px; height:1px; background:var(--accent); }
    .section-kicker{ position:absolute; left:64px; top:120px; color:var(--accent); font-size:11px; letter-spacing:.14em; font-weight:700; text-transform:uppercase; }
    .intro-title{ position:absolute; left:64px; top:180px; width:467px; margin:0; color:#000; font-size:40px; line-height:48px; font-weight:700; }
    .intro-sub{ position:absolute; left:64px; top:260px; width:467px; margin:0; color:#5e5e5e; font-size:22px; line-height:28px; font-weight:600; font-family: Georgia, "Times New Roman", serif; }
    .intro-body{ position:absolute; left:64px; top:340px; width:467px; height:420px; overflow:hidden; font-size:12px; line-height:16px; }
    .highlights-grid{ position:absolute; left:64px; top:230px; width:467px; display:grid; grid-template-columns:1fr; gap:12px; }
    .highlight-card{ display:flex; gap:14px; align-items:flex-start; padding:14px 16px; border-radius:14px; background:#f8fafc; border:1px solid #dbe4ea; box-shadow:0 1px 3px rgba(15,23,42,.04); }
    .highlight-index{ display:inline-flex; min-width:34px; height:34px; align-items:center; justify-content:center; border-radius:999px; background:var(--accent); color:#fff; font-size:11px; font-weight:700; }
    .highlight-card p{ margin:0; font-size:12px; line-height:17px; }
    .rec-list{ position:absolute; left:88px; top:230px; width:423px; margin:0; padding:0; color:var(--text); }
    .rec-list li{ margin:0 0 12px 0; font-size:13px; line-height:19px; padding-left:4px; }
    .quote-mark{ position:absolute; left:64px; top:200px; width:456px; margin:0; color:var(--accent); font-size:102px; line-height:45px; font-weight:700; font-family: Georgia, "Times New Roman", serif; }
    .quote-text{ position:absolute; left:64px; top:250px; width:456px; margin:0; color:var(--text); font-size:28px; line-height:36px; font-weight:600; font-family: Georgia, "Times New Roman", serif; }
    .quote-caption{ position:absolute; left:64px; top:640px; width:456px; margin:0; color:var(--muted); font-size:14px; text-transform:uppercase; }
    .chapter-title{ position:absolute; left:64px; top:79px; width:467px; margin:0; color:#000; font-size:42px; line-height:48px; font-weight:700; }
    .chapter-sub{ position:absolute; left:64px; top:160px; width:467px; margin:0; color:var(--accent); font-size:22px; line-height:28px; font-weight:600; font-family: Georgia, "Times New Roman", serif; }
    .chapter-line{ position:absolute; left:64px; top:210px; width:64px; height:1px; background:var(--accent); }
    .chapter-body,.content-body{ position:absolute; left:64px; top:230px; width:467px; height:530px; overflow:hidden; font-size:12px; line-height:16px; }
    .content-continuation-title{ position:absolute; left:64px; top:72px; width:467px; margin:0; color:var(--accent); font-size:14px; font-weight:700; text-transform:uppercase; letter-spacing:.12em; }
    .content-body{ top:110px; height:650px; }
    .final-band{ position:absolute; left:0; top:593px; width:595px; height:249px; background:var(--accent); }
    .final-line{ position:absolute; left:64px; top:623px; width:64px; height:1px; background:#fff; }
    .final-title{ position:absolute; left:64px; top:648px; width:467px; margin:0; color:#fff; font-size:34px; line-height:42px; font-weight:700; font-family: Georgia, "Times New Roman", serif; }
    .final-body{ position:absolute; left:64px; top:707px; width:467px; margin:0; color:#fff; font-size:12px; line-height:16px; }
    .final-body p,.chapter-body p,.content-body p,.intro-body p{ margin:0 0 8px 0; }
    ${customCss}
    @media print{ body{ background:#fff; } .document{ margin:0; } .page{ margin:0; box-shadow:none; } }
  </style>
</head>
<body><div class="document">${pageHtml}</div></body>
</html>`;

  const filename = `${knowledgeAsset.slug || "document"}_formal.html`;
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...(download ? { "Content-Disposition": `attachment; filename="${filename}"` } : {}),
    },
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
