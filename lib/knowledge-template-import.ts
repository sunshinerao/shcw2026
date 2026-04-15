import type {
  FormalDocumentTemplateConfig,
  KnowledgeTemplateConfig,
  KnowledgeTemplateType,
} from "@/lib/knowledge-template";

const MAX_SOURCE_HTML = 120_000;
const MAX_CSS = 40_000;

export type TemplateImportValidation = {
  isValid: boolean;
  warnings: string[];
  detectedFeatures: string[];
  enforcedRules: string[];
};

function sanitizeImportedHtml(html: string) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+=(["']).*?\1/gi, "")
    .replace(/javascript:/gi, "")
    .trim()
    .slice(0, MAX_SOURCE_HTML);
}

function sanitizeCss(css: string) {
  return css
    .replace(/<style[^>]*>/gi, "")
    .replace(/<\/style>/gi, "")
    .replace(/@import[^;]+;/gi, "")
    .trim()
    .slice(0, MAX_CSS);
}

function extractStyleBlocks(html: string) {
  return Array.from(html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi))
    .map((match) => match[1] || "")
    .join("\n");
}

function extractAccentColor(source: string) {
  const cssVar = source.match(/--accent\s*:\s*(#[0-9a-fA-F]{3,8}|rgb\([^\)]+\))/i)?.[1];
  if (cssVar) return cssVar;

  const background = source.match(/(?:background|color)\s*:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})/i)?.[1];
  if (background) return background;

  return "#f6645a";
}

function extractFontFamily(source: string) {
  const font = source.match(/font-family\s*:\s*([^;]+);/i)?.[1]?.trim();
  return font || "PingFang SC, Arial";
}

export function validateImportedHtmlTemplate(sourceHtml: string): TemplateImportValidation {
  const html = sourceHtml || "";
  const warnings: string[] = [];
  const detectedFeatures: string[] = [];

  const markers = [
    { label: "cover title", pattern: /title|hero|cover/i },
    { label: "table of contents block", pattern: /table of contents|toc|目录/i },
    { label: "chapter block", pattern: /chapter|section|正文/i },
    { label: "quote block", pattern: /quote|pull-quote|引语/i },
    { label: "about/final block", pattern: /about us|about|final|封底/i },
  ];

  for (const marker of markers) {
    if (marker.pattern.test(html)) {
      detectedFeatures.push(marker.label);
    } else {
      warnings.push(`Imported HTML does not explicitly expose a ${marker.label}; the system will use the default page shell for this part.`);
    }
  }

  return {
    isValid: true,
    warnings,
    detectedFeatures,
    enforcedRules: [
      "TOC pagination is always system-generated.",
      "Chapter first-page and continuation-page pagination is always system-generated.",
      "Chapter boundaries always force a page break.",
      "TOC page numbers are always backfilled from the computed page plan.",
    ],
  };
}

export function enforceFormalTemplateContract(
  config: Partial<FormalDocumentTemplateConfig> = {},
): FormalDocumentTemplateConfig {
  return {
    styleTemplate: config.styleTemplate ?? "professional",
    colorScheme: config.colorScheme ?? "blue",
    renderMode: "figma_whitepaper",
    accentColor: config.accentColor?.trim() || "#f6645a",
    pageSize: config.pageSize ?? "A4",
    fontSize: Math.max(10, Math.min(14, config.fontSize ?? 11)),
    fontFamily: config.fontFamily?.trim() || "PingFang SC, Arial",
    tocItemsPerPage: Math.max(4, Math.min(12, config.tocItemsPerPage ?? 6)),
    chapterFirstPageChars: Math.max(800, config.chapterFirstPageChars ?? 1600),
    chapterBodyPageChars: Math.max(1000, config.chapterBodyPageChars ?? 2300),
    forceChapterPageBreak: true,
    includeAboutPage: config.includeAboutPage !== false,
    includeCover: config.includeCover !== false,
    includeTableOfContents: true,
    includePageNumbers: true,
    includeHeaders: config.includeHeaders !== false,
    includeFooters: config.includeFooters !== false,
    includeWatermark: config.includeWatermark !== false,
    watermarkText: config.watermarkText || "Shanghai Climate Week 2026",
    watermarkOpacity: config.watermarkOpacity ?? 0.1,
    watermarkAngle: config.watermarkAngle ?? 45,
    watermarkFontSize: config.watermarkFontSize ?? 60,
    includeEventQRCode: config.includeEventQRCode ?? true,
    includeReferences: config.includeReferences !== false,
    includeChapters: true,
    footerText: config.footerText || "© Shanghai Climate Week 2026",
    footerTextEn: config.footerTextEn || "© Shanghai Climate Week 2026",
    headerText: config.headerText || "Knowledge Hub",
    headerTextEn: config.headerTextEn || "Knowledge Hub",
    templateContractVersion: "shcw-formal-v1",
    importedFrom: config.importedFrom || "manual",
    sourceHtml: typeof config.sourceHtml === "string" && config.sourceHtml.trim()
      ? sanitizeImportedHtml(config.sourceHtml)
      : undefined,
    customCss: typeof config.customCss === "string" && config.customCss.trim()
      ? sanitizeCss(config.customCss)
      : undefined,
  };
}

export function importFigmaHtmlAsFormalTemplate(params: {
  sourceHtml: string;
  baseConfig?: Partial<FormalDocumentTemplateConfig>;
}) {
  const cleanedHtml = sanitizeImportedHtml(params.sourceHtml || "");
  const extractedCss = sanitizeCss(extractStyleBlocks(cleanedHtml));
  const validation = validateImportedHtmlTemplate(cleanedHtml);

  const config = enforceFormalTemplateContract({
    ...(params.baseConfig || {}),
    importedFrom: "figma-html",
    sourceHtml: cleanedHtml,
    customCss: extractedCss || params.baseConfig?.customCss,
    accentColor: params.baseConfig?.accentColor || extractAccentColor(extractedCss || cleanedHtml),
    fontFamily: params.baseConfig?.fontFamily || extractFontFamily(extractedCss || cleanedHtml),
  });

  return { config, validation };
}

export function normalizeTemplateConfigForSystem(params: {
  templateType: KnowledgeTemplateType;
  config?: KnowledgeTemplateConfig | null;
  sourceHtml?: string;
}) {
  const baseConfig = (params.config || {}) as KnowledgeTemplateConfig;

  if (params.templateType !== "FORMAL_DOCUMENT") {
    return {
      config: baseConfig,
      validation: null as TemplateImportValidation | null,
    };
  }

  if (typeof params.sourceHtml === "string" && params.sourceHtml.trim()) {
    const imported = importFigmaHtmlAsFormalTemplate({
      sourceHtml: params.sourceHtml,
      baseConfig: baseConfig.formal || {},
    });

    return {
      config: {
        ...baseConfig,
        formal: imported.config,
      } satisfies KnowledgeTemplateConfig,
      validation: imported.validation,
    };
  }

  return {
    config: {
      ...baseConfig,
      formal: enforceFormalTemplateContract(baseConfig.formal || {}),
    } satisfies KnowledgeTemplateConfig,
    validation: null as TemplateImportValidation | null,
  };
}
