/**
 * Knowledge Asset PDF Document Renderer
 * Generates professional formatted PDF documents with templates
 */

import PDFDocument from "pdfkit";
import { Readable } from "stream";
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

      // 设置字体和基本样式
      setupDocumentStyles(doc, data.templateConfig);

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

/**
 * 渲染封面页
 */
function renderCover(doc: PDFKit.PDFDocument, data: PDFRenderData) {
  const config = data.templateConfig;
  const asset = data.knowledgeAsset;
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const centerX = pageWidth / 2;

  // 背景色块
  doc.rect(0, 0, pageWidth, pageHeight * 0.4).fill("#0d9488");

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
  let y = 50;
  const pageWidth = doc.page.width;
  const maxWidth = pageWidth - 100;

  // 标题
  doc
    .fontSize(20)
    .font("Helvetica-Bold")
    .fill("#000000")
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
      .fill("#000000")
      .text("Summary", 50, y);

    y += 15;
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(asset.summary, 50, y, { width: maxWidth });

    y = doc.y + 20;
  }

  // 主要内容
  if (asset.content) {
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fill("#000000")
      .text("Content", 50, y);

    y += 15;

    // 分段落添加内容
    const paragraphs = asset.content.split("\n\n");
    for (const para of paragraphs) {
      if (y > doc.page.height - 100) {
        if (config.includePageNumbers) {
          renderPageNumber(doc, config);
        }
        if (config.includeHeaders) {
          renderHeader(doc, asset, config);
        }
        doc.addPage();
        y = 50;
      }

      doc
        .fontSize(10)
        .font("Helvetica")
        .fill("#000000")
        .text(para, 50, y, { width: maxWidth });

      y = doc.y + 12;
    }
  }

  // 关键点
  if (asset.keyPoints && Array.isArray(asset.keyPoints) && asset.keyPoints.length > 0) {
    if (y > doc.page.height - 150) {
      if (config.includePageNumbers) {
        renderPageNumber(doc, config);
      }
      doc.addPage();
      y = 50;
    }

    y += 15;
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fill("#000000")
      .text("Key Points", 50, y);

    y += 15;

    (asset.keyPoints as string[]).forEach((point) => {
      if (y > doc.page.height - 100) {
        if (config.includePageNumbers) {
          renderPageNumber(doc, config);
        }
        doc.addPage();
        y = 50;
      }

      doc
        .fontSize(10)
        .font("Helvetica")
        .fill("#000000");

      doc.text(`• ${point}`, 60, y, { width: maxWidth - 10 });
      y = doc.y + 8;
    });
  }

  if (config.includePageNumbers) {
    renderPageNumber(doc, config);
  }
}

/**
 * 渲染参考资料页
 */
function renderReferences(doc: PDFKit.PDFDocument, data: PDFRenderData) {
  const config = data.templateConfig;
  const references = data.knowledgeAsset.references as any[] | null;

  if (!references || !Array.isArray(references)) return;

  if (config.includePageNumbers) {
    renderPageNumber(doc, config);
  }

  doc.addPage();

  // 标题
  doc
    .fontSize(16)
    .font("Helvetica-Bold")
    .fill("#000000")
    .text("References", 50, 50);

  let y = 80;
  const maxWidth = doc.page.width - 100;

  // 参考文献列表
  references.forEach((ref, idx) => {
    if (y > doc.page.height - 100) {
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
  const headerText = config.headerText || asset.titleEn || asset.title || "";

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
