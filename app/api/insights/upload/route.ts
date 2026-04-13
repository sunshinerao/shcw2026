/**
 * 知识成果文件上传API
 * POST /api/insights/upload
 * 
 * 功能：
 * - 接收文件上传
 * - 提取文件内容和元数据
 * - 调用AI生成摘要、标题、内容
 * - 返回结构化数据供表单填充
 */

import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { execFile } from "child_process";
import { promisify } from "util";
import os from "os";
import path from "path";
import { promises as fs } from "fs";
import { requireInsightAdmin } from "@/lib/insight-auth";
import { getSystemSettingsForServer } from "@/lib/system-settings";
import { translateMissingInsightFieldsToEnglish } from "@/lib/ai-translation";

const execFileAsync = promisify(execFile);

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const PUBLISH_ALLOWED_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/json",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

const CORE_ALLOWED_TYPES = new Set([
  "text/markdown",
  "text/x-markdown",
  "text/plain",
]);

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function fileNameWithoutExt(name: string) {
  return name.replace(/\.[^.]+$/, "").trim();
}

function getFileExtension(name: string) {
  return name.toLowerCase().split(".").pop() || "";
}

function isMarkdownFile(file: File) {
  const ext = getFileExtension(file.name);
  return CORE_ALLOWED_TYPES.has(file.type) || ext === "md" || ext === "markdown";
}

function sanitizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function summarizeText(text: string, maxLen = 240) {
  const cleaned = sanitizeText(text);
  if (!cleaned) return "";
  return cleaned.length <= maxLen ? cleaned : `${cleaned.slice(0, maxLen - 1)}...`;
}

function excerptText(text: string, maxLen = 900) {
  const cleaned = sanitizeText(text);
  if (!cleaned) return "";
  return cleaned.length <= maxLen ? cleaned : `${cleaned.slice(0, maxLen - 1)}...`;
}

function parseSimpleFrontmatter(raw: string) {
  const frontmatterMatch = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!frontmatterMatch) {
    return { fields: {} as Record<string, string>, body: raw };
  }

  const fields: Record<string, string> = {};
  const lines = frontmatterMatch[1].split("\n");
  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim().replace(/^['\"]|['\"]$/g, "");
    if (key && value) fields[key] = value;
  }

  return { fields, body: raw.slice(frontmatterMatch[0].length) };
}

function getMarkdownParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((part) => part.replace(/^#+\s+/gm, "").trim())
    .map((part) => part.replace(/\[(.*?)\]\((.*?)\)/g, "$1"))
    .map((part) => part.replace(/[`>*_-]/g, " "))
    .map((part) => sanitizeText(part))
    .filter(Boolean);
}

/**
 * Extracts the text block following an HTML comment marker like <!-- SUMMARY -->.
 * Returns the block up to the next comment marker or end of string.
 */
function extractCommentBlock(body: string, marker: string): string {
  const regex = new RegExp(`<!--\\s*${marker}\\s*-->([\\s\\S]*?)(?=<!--[A-Z_]+-->|$)`, "i");
  const match = body.match(regex);
  if (!match) return "";
  return match[1].trim();
}

/**
 * Extracts list items under a ## SPECIAL_HEADING section.
 * Returns string[] of items.
 */
function extractSpecialSection(body: string, heading: string): string[] {
  const regex = new RegExp(`^##\\s+${heading}\\s*$([\\s\\S]*?)(?=^##\\s|^#\\s|$)`, "im");
  const match = body.match(regex);
  if (!match) return [];
  return match[1]
    .split("\n")
    .map((line) => line.replace(/^[-*\d.]+\s*/, "").trim())
    .filter(Boolean);
}

type ParsedChapter = {
  title: string;
  subtitle: string;
  content: string;
  keyPoints: string[];
};

/**
 * Full structured markdown parser for the SHCW knowledge asset format.
 * Handles zh or en variant based on `lang` parameter.
 */
function parseCoreMarkdown(raw: string, fileName: string, lang: "zh" | "en" = "zh") {
  const { fields, body } = parseSimpleFrontmatter(raw);

  // --- Frontmatter fields ---
  const titleField = lang === "zh"
    ? (fields.title || fields["标题"] || "")
    : (fields.titleen || fields.title || "");
  const subtitleField = lang === "zh"
    ? (fields.subtitle || fields["副标题"] || "")
    : (fields.subtitleen || fields.subtitle || "");
  const authorField = fields.author || fields.authors || fields["作者"] || fields.by || "";
  const tagsField = lang === "zh"
    ? (fields.tags || fields["标签"] || "")
    : (fields.tagsen || fields.tags || "");

  // --- Comment-block sections ---
  const summaryMarker = lang === "zh" ? "SUMMARY" : "SUMMARY_EN";
  const pullQuoteMarker = lang === "zh" ? "PULL_QUOTE" : "PULL_QUOTE_EN";
  const pullQuoteCaptionMarker = lang === "zh" ? "PULL_QUOTE_CAPTION" : "PULL_QUOTE_CAPTION_EN";
  const aboutUsMarker = lang === "zh" ? "ABOUT_US" : "ABOUT_US_EN";
  const chapterSubtitleMarker = lang === "zh" ? "CHAPTER_SUBTITLE" : "CHAPTER_SUBTITLE_EN";
  const keyPointsHeading = lang === "zh" ? "KEY_POINTS" : "KEY_POINTS_EN";
  const refsHeading = "REFERENCES";
  const recsHeading = lang === "zh" ? "RECOMMENDATIONS" : "RECOMMENDATIONS_EN";

  const extractedSummary = extractCommentBlock(body, summaryMarker);
  const pullQuote = extractCommentBlock(body, pullQuoteMarker);
  const pullQuoteCaption = extractCommentBlock(body, pullQuoteCaptionMarker);
  const aboutUs = extractCommentBlock(body, aboutUsMarker);

  // --- Chapter parsing ---
  // Split on lines starting with a single # (h1), preserve the heading
  const chapterSplits = body.split(/(?=^# .+$)/m).filter((s) => s.trim());

  const chapters: ParsedChapter[] = [];
  let preambleBlock = "";

  for (const block of chapterSplits) {
    const headingMatch = block.match(/^# (.+)$/m);
    if (!headingMatch) {
      // Content before first chapter
      preambleBlock = block;
      continue;
    }

    const chapterTitle = headingMatch[1].trim();

    // Extract chapter subtitle from <!-- CHAPTER_SUBTITLE --> or <!-- CHAPTER_SUBTITLE_EN -->
    const subMatch = block.match(new RegExp(`<!--\\s*${chapterSubtitleMarker}\\s*-->\\s*([^\\n<]+)`));
    const chapterSubtitle = subMatch ? subMatch[1].trim() : "";

    // Extract key points for this chapter
    const chapterKeyPoints = extractSpecialSection(block, keyPointsHeading);

    // Remove heading line, comment markers, and KEY_POINTS section from content
    const contentRaw = block
      .replace(/^# .+$/m, "")
      .replace(new RegExp(`<!--\\s*${chapterSubtitleMarker}\\s*-->\\s*[^\\n]*`, "g"), "")
      .replace(new RegExp(`^##\\s+${keyPointsHeading}\\s*$[\\s\\S]*?(?=^##\\s|^#\\s|$)`, "im"), "")
      .replace(/<!--[A-Z_]+-->/g, "")
      .trim();

    const cleanedContent = contentRaw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join("\n");

    chapters.push({
      title: chapterTitle,
      subtitle: chapterSubtitle,
      content: cleanedContent,
      keyPoints: chapterKeyPoints,
    });
  }

  // --- Top-level special sections ---
  const references = extractSpecialSection(body, refsHeading);
  const recommendations = extractSpecialSection(body, recsHeading);

  // --- Derive title/subtitle from first chapter or filename ---
  const firstHeading = body.match(/^# (.+)$/m)?.[1]?.trim() || "";
  const title = titleField || firstHeading || fileNameWithoutExt(fileName) || "Untitled";
  const subtitle = subtitleField || title;

  // --- Summary fallback ---
  const paragraphs = preambleBlock ? getMarkdownParagraphs(preambleBlock) : [];
  const summary = extractedSummary || paragraphs[0] || (chapters[0]?.content ? summarizeText(chapters[0].content) : "");

  // Full content = concatenation of all chapter content
  const fullContent = chapters
    .map((c) => [c.title ? `# ${c.title}` : "", c.subtitle ? `## ${c.subtitle}` : "", c.content].filter(Boolean).join("\n\n"))
    .join("\n\n---\n\n");

  return {
    title: sanitizeText(title),
    subtitle: sanitizeText(subtitle),
    author: sanitizeText(authorField),
    tags: sanitizeText(tagsField),
    summary: sanitizeText(summary),
    pullQuote: sanitizeText(pullQuote),
    pullQuoteCaption: sanitizeText(pullQuoteCaption),
    aboutUs: sanitizeText(aboutUs),
    chapters,
    references,
    recommendations,
    fullContent: fullContent || body.trim(),
    lang,
  };
}

function xmlEscape(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function compactSubtitle(text: string, maxLen = 72) {
  const cleaned = sanitizeText(text);
  if (!cleaned) return "";
  return cleaned.length <= maxLen ? cleaned : `${cleaned.slice(0, maxLen - 1)}...`;
}

function createAutoCoverDataUrl(input: {
  title: string;
  format: string;
  subtitle?: string;
}) {
  const title = xmlEscape(input.title || "Knowledge Asset");
  const format = xmlEscape((input.format || "FILE").toUpperCase());
  const subtitle = xmlEscape(compactSubtitle(input.subtitle || ""));

  const subtitleBlock = subtitle
    ? `<text x="52" y="268" font-family="Arial, sans-serif" font-size="26" fill="#A7B6D9">${subtitle}</text>`
    : "";

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="675" viewBox="0 0 1200 675" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0B1732"/>
      <stop offset="100%" stop-color="#103A5F"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#bg)"/>
  <rect x="48" y="48" width="1104" height="579" rx="24" fill="#0F223F" fill-opacity="0.55" stroke="#3A5A87" stroke-opacity="0.35"/>
  <text x="52" y="112" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#60E2A4">Knowledge Hub</text>
  <text x="52" y="175" font-family="Arial, sans-serif" font-size="56" font-weight="700" fill="#F4F8FF">${title}</text>
  ${subtitleBlock}
  <rect x="52" y="520" width="150" height="52" rx="26" fill="#0FB57F"/>
  <text x="127" y="553" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#062C20">${format}</text>
</svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function mimeFromImageExtension(filePath: string) {
  const ext = filePath.toLowerCase().split(".").pop();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  if (ext === "svg") return "image/svg+xml";
  return "application/octet-stream";
}

async function extractFirstDocxImage(fileBuffer: Buffer) {
  try {
    const zip = await JSZip.loadAsync(fileBuffer);
    const mediaFiles = Object.keys(zip.files)
      .filter((name) => name.startsWith("word/media/") && !zip.files[name].dir)
      .sort();

    const firstImage = mediaFiles.find((name) => /\.(png|jpe?g|gif|webp|svg)$/i.test(name));
    if (!firstImage) return null;

    const imageBuffer = await zip.files[firstImage].async("nodebuffer");
    const mimeType = mimeFromImageExtension(firstImage);
    return `data:${mimeType};base64,${imageBuffer.toString("base64")}`;
  } catch {
    return null;
  }
}

async function extractQuickLookThumbnail(fileName: string, fileBuffer: Buffer) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "insight-thumb-"));
  const safeFileName = fileName.replace(/[/\\]/g, "_") || `upload-${Date.now()}`;
  const inputPath = path.join(tempDir, safeFileName);

  try {
    await fs.writeFile(inputPath, fileBuffer);

    try {
      await execFileAsync("qlmanage", ["-t", "-s", "1200", "-o", tempDir, inputPath], {
        timeout: 10000,
      });
    } catch {
      return null;
    }

    const generatedFiles = await fs.readdir(tempDir);
    const pngFile = generatedFiles.find((name) => name.endsWith(".png"));
    if (!pngFile) return null;

    const png = await fs.readFile(path.join(tempDir, pngFile));
    return `data:image/png;base64,${png.toString("base64")}`;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function extractCoverImage(file: File, fileBuffer: Buffer) {
  const isDocFile =
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.type === "application/msword";

  if (isDocFile) {
    const embeddedImage = await extractFirstDocxImage(fileBuffer);
    if (embeddedImage) return embeddedImage;
  }

  return extractQuickLookThumbnail(file.name, fileBuffer);
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // continue
  }

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return null;
    }
  }

  return null;
}

async function generateInsightDraftWithAI(input: {
  titleHint: string;
  sourceText: string;
}): Promise<{
  title: string;
  summary: string;
  summaryEn: string;
  shortContent: string;
  shortContentEn: string;
} | null> {
  try {
    const settings = await getSystemSettingsForServer();
    const apiKey = settings.openaiApiKey || process.env.OPENAI_API_KEY || "";
    if (!apiKey) {
      return null;
    }

    const model = settings.openaiModel || "gpt-4o-mini";
    const prompt = [
      "You are assisting an editorial knowledge-base workflow.",
      "Based on the provided document excerpt, generate fields for a Knowledge Hub asset.",
      "Output JSON only with keys: title, summary_zh, summary_en, short_content_zh, short_content_en",
      "Rules:",
      "- summary_zh and summary_en: 90-180 words each",
      "- short_content_zh and short_content_en: 2-4 short paragraphs each",
      "- Keep facts grounded in source text; do not invent data",
      "- title should be concise and editorial",
      `Title hint: ${input.titleHint || "N/A"}`,
      "Document excerpt:",
      input.sourceText,
    ].join("\n\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: "You are a concise climate content editor. Return valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const completion = await response.json();
    const content = completion?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      return null;
    }

    const parsed = extractJsonObject(content);
    if (!parsed) {
      return null;
    }

    const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
    const summary = typeof parsed.summary_zh === "string" ? parsed.summary_zh.trim() : "";
    const summaryEn = typeof parsed.summary_en === "string" ? parsed.summary_en.trim() : "";
    const shortContent = typeof parsed.short_content_zh === "string" ? parsed.short_content_zh.trim() : "";
    const shortContentEn = typeof parsed.short_content_en === "string" ? parsed.short_content_en.trim() : "";

    if (!summary && !shortContent) {
      return null;
    }

    return { title, summary, summaryEn, shortContent, shortContentEn };
  } catch (error) {
    console.error("AI generation error:", error);
    return null;
  }
}

async function extractDocxText(file: File) {
  try {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const entry = zip.file("word/document.xml");
    if (!entry) return "";
    const xml = await entry.async("text");
    return xml
      .replace(/<w:p[^>]*>/g, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return "";
  }
}

async function extractPdfMetadata(file: File) {
  try {
    const pdf = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
    const title = pdf.getTitle() || "";
    const author = pdf.getAuthor() || "";
    const pageCount = pdf.getPageCount();

    return {
      title: title || author || "PDF Document",
      summary: `PDF document with ${pageCount} pages.`,
      pageCount,
    };
  } catch {
    return {
      title: "PDF Document",
      summary: "PDF document uploaded.",
      pageCount: 0,
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    // 权限检查
    const admin = await requireInsightAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const uploadModeRaw = (formData.get("uploadMode") as string | null) || "publish";
    const uploadMode = uploadModeRaw === "core" ? "core" : "publish";

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: "File too large (max 10MB)" }, { status: 400 });
    }

    const isCoreUpload = uploadMode === "core";
    const uploadLangRaw = (formData.get("uploadLang") as string | null) || "zh";
    const uploadLang: "zh" | "en" = uploadLangRaw === "en" ? "en" : "zh";
    const typeAllowed = isCoreUpload
      ? (CORE_ALLOWED_TYPES.has(file.type) || isMarkdownFile(file))
      : PUBLISH_ALLOWED_TYPES.has(file.type);

    if (!typeAllowed) {
      return NextResponse.json(
        { success: false, error: `Unsupported file type: ${file.type || "unknown"}` },
        { status: 400 }
      );
    }

    // 转换为base64
    const bytes = await file.arrayBuffer();
    const fileBuffer = Buffer.from(bytes);
    const base64 = fileBuffer.toString("base64");
    const url = `data:${file.type};base64,${base64}`;

    const inferredTitle = fileNameWithoutExt(file.name);
    const inferredFormat = file.name.split(".").pop()?.toUpperCase() || "FILE";

    if (isCoreUpload) {
      if (!isMarkdownFile(file)) {
        return NextResponse.json(
          { success: false, error: "Core upload only supports Markdown files (.md/.markdown)" },
          { status: 400 }
        );
      }

      const markdownRaw = await file.text();
      const parsed = parseCoreMarkdown(markdownRaw, file.name, uploadLang);

      // For zh uploads, try to translate missing En fields
      // For en uploads, the parsed fields ARE the En fields — no translation needed
      const needsTranslation = uploadLang === "zh";
      const translated = needsTranslation
        ? await translateMissingInsightFieldsToEnglish({
            title: parsed.title,
            subtitle: parsed.subtitle,
            summary: parsed.summary,
            content: parsed.fullContent,
          })
        : {};

      const finalTitle = parsed.title;
      const finalSubtitle = parsed.subtitle || finalTitle;
      const finalSummary = parsed.summary || summarizeText(parsed.fullContent, 240);

      // Build chapters with keyPoints embedded
      const chaptersJson = parsed.chapters.map((c, i) => ({
        index: i,
        title: c.title,
        subtitle: c.subtitle,
        content: c.content,
        keyPoints: c.keyPoints,
      }));

      // En-side: for zh uploads populate with AI translation, for en uploads use chapter content
      const isEnLang = uploadLang === "en";

      return NextResponse.json({
        success: true,
        data: {
          url,
          filename: file.name,
          mode: "core",
          lang: uploadLang,
          extracted: {
            // For zh: populate zh fields; for en: only en fields (caller merges)
            ...(isEnLang ? {} : {
              title: finalTitle,
              subtitle: finalSubtitle,
              author: parsed.author || "",
              tags: parsed.tags || "",
              summary: finalSummary,
              pullQuote: parsed.pullQuote || "",
              pullQuoteCaption: parsed.pullQuoteCaption || "",
              aboutUs: parsed.aboutUs || "",
              chapters: chaptersJson,
              references: parsed.references,
              recommendations: parsed.recommendations,
              fullContent: parsed.fullContent,
              slugSuggestion: slugify(finalTitle),
              fileFormat: "MD",
              coverImage: createAutoCoverDataUrl({
                title: finalTitle,
                format: "MD",
                subtitle: finalSubtitle,
              }),
            }),
            // En fields
            titleEn: isEnLang ? finalTitle : (translated.titleEn || finalTitle),
            subtitleEn: isEnLang ? finalSubtitle : (translated.subtitleEn || finalSubtitle),
            summaryEn: isEnLang ? finalSummary : (translated.summaryEn || finalSummary),
            pullQuoteEn: isEnLang ? (parsed.pullQuote || "") : "",
            pullQuoteCaptionEn: isEnLang ? (parsed.pullQuoteCaption || "") : "",
            aboutUsEn: isEnLang ? (parsed.aboutUs || "") : "",
            chaptersEn: isEnLang ? chaptersJson : [],
            recommendationsEn: isEnLang ? parsed.recommendations : [],
            tagsEn: isEnLang ? (parsed.tags || "") : "",
            fullContentEn: isEnLang ? parsed.fullContent : (translated.contentEn || ""),
            aiGenerated: needsTranslation && Boolean(translated.titleEn || translated.summaryEn),
          },
        },
      });
    }
    let summary = "";
    let summaryEn = "";
    let shortContent = "";
    let shortContentEn = "";
    let sourceForAI = "";
    let subtitle = "";
    let subtitleEn = "";
    const extractedCoverImage = await extractCoverImage(file, fileBuffer);

    // 根据文件类型提取内容
    if (
      file.type === "text/plain" ||
      file.type === "text/markdown" ||
      file.type === "application/json" ||
      file.type === "text/csv"
    ) {
      const text = await file.text();
      sourceForAI = excerptText(text, 8000);
      summary = summarizeText(text);
      summaryEn = summary;
      shortContent = excerptText(text, 900);
      shortContentEn = shortContent;
    } else if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.type === "application/msword"
    ) {
      const text = await extractDocxText(file);
      sourceForAI = excerptText(text, 8000);
      summary = summarizeText(text);
      summaryEn = summary;
      shortContent = excerptText(text, 900);
      shortContentEn = shortContent;
    } else if (file.type === "application/pdf") {
      const pdfMeta = await extractPdfMetadata(file);
      summary = pdfMeta.summary;
      summaryEn = summary;
      subtitle = compactSubtitle(pdfMeta.summary, 80);
      subtitleEn = subtitle;
      sourceForAI = [
        `Title hint: ${pdfMeta.title}`,
        `Page count: ${pdfMeta.pageCount || 0}`,
      ].join("\n");

      // 尝试调用AI生成摘要
      if (sourceForAI) {
        const aiDraft = await generateInsightDraftWithAI({
          titleHint: pdfMeta.title || inferredTitle,
          sourceText: sourceForAI,
        });

        if (aiDraft) {
          summary = aiDraft.summary || summary;
          summaryEn = aiDraft.summaryEn || summaryEn;
          shortContent = aiDraft.shortContent || "";
          shortContentEn = aiDraft.shortContentEn || "";

          return NextResponse.json({
            success: true,
            data: {
              url,
              filename: file.name,
              extracted: {
                title: aiDraft.title || pdfMeta.title || inferredTitle,
                subtitle: subtitle,
                subtitleEn: subtitleEn,
                summary,
                summaryEn,
                shortContent,
                shortContentEn,
                coverImage:
                  extractedCoverImage ||
                  createAutoCoverDataUrl({
                    title: aiDraft.title || pdfMeta.title || inferredTitle,
                    format: "PDF",
                    subtitle: subtitle,
                  }),
                slugSuggestion: slugify(aiDraft.title || pdfMeta.title || inferredTitle),
                fileFormat: "PDF",
                aiGenerated: true,
              },
            },
          });
        }
      }
    }

    // 尝试通过AI优化其他文件类型
    if (sourceForAI) {
      const aiDraft = await generateInsightDraftWithAI({
        titleHint: inferredTitle,
        sourceText: sourceForAI,
      });

      if (aiDraft) {
        return NextResponse.json({
          success: true,
          data: {
            url,
            filename: file.name,
            mode: "publish",
            extracted: {
              title: aiDraft.title || inferredTitle,
              subtitle: compactSubtitle(aiDraft.summary || summary, 80),
              subtitleEn: compactSubtitle(aiDraft.summaryEn || summaryEn, 80),
              summary: aiDraft.summary || summary,
              summaryEn: aiDraft.summaryEn || summaryEn,
              shortContent: aiDraft.shortContent || shortContent,
              shortContentEn: aiDraft.shortContentEn || shortContentEn,
              coverImage:
                extractedCoverImage ||
                createAutoCoverDataUrl({
                  title: aiDraft.title || inferredTitle,
                  format: inferredFormat,
                  subtitle: aiDraft.summary || summary,
                }),
              slugSuggestion: slugify(aiDraft.title || inferredTitle),
              fileFormat: inferredFormat,
              aiGenerated: true,
            },
          },
        });
      }
    }

    // 本地提取作为备选
      return NextResponse.json({
      success: true,
      data: {
        url,
        filename: file.name,
          mode: "publish",
        extracted: {
          title: inferredTitle,
          subtitle: compactSubtitle(summary, 80),
          subtitleEn: compactSubtitle(summaryEn, 80),
          summary,
          summaryEn,
          shortContent,
          shortContentEn,
          coverImage:
            extractedCoverImage ||
            createAutoCoverDataUrl({
              title: inferredTitle,
              format: inferredFormat,
              subtitle: summary,
            }),
          slugSuggestion: slugify(inferredTitle),
          fileFormat: inferredFormat,
          aiGenerated: false,
        },
      },
    });
  } catch (error) {
    console.error("Upload insight file error:", error);
    return NextResponse.json({ success: false, error: "Failed to upload file" }, { status: 500 });
  }
}
