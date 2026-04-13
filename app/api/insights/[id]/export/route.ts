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

    // 获取模板配置
    let template = null;
    if (templateId) {
      template = await prisma.knowledgeTemplate.findUnique({
        where: { id: templateId },
      });
    }

    if (!template && format === "pdf") {
      // 如果未指定或未找到模板，使用默认正式文档模板
      template = await getDefaultTemplate("FORMAL_DOCUMENT");
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
      pageSize: "A4",
      fontSize: 11,
      fontFamily: "PingFang SC, Arial",
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
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
