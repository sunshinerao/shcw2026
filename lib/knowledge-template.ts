/**
 * Knowledge Asset Template System
 * Manages configurations for formal documents and webpage displays
 */

export type KnowledgeTemplateType = "FORMAL_DOCUMENT" | "WEBPAGE_DISPLAY";
export type DocumentFormat = "PDF" | "DOCX";

// 正式文档模板配置
export interface FormalDocumentTemplateConfig {
  // 文档风格
  styleTemplate: "default" | "professional" | "minimal";
  colorScheme: "blue" | "green" | "gray";
  
  // 页面配置
  pageSize: "A4" | "Letter";
  fontSize: number;
  fontFamily: string;
  
  // 包含的元素
  includeCover: boolean;
  includeTableOfContents: boolean;
  includePageNumbers: boolean;
  includeHeaders: boolean;
  includeFooters: boolean;
  includeWatermark: boolean;
  watermarkText?: string;
  
  // 水印配置
  watermarkOpacity: number; // 0-1
  watermarkAngle: number;   // degrees
  watermarkFontSize: number;
  
  // 特殊页面
  includeEventQRCode: boolean;
  includeReferences: boolean;
  includeChapters: boolean;
  
  // 页脚/页眉信息
  footerText?: string;
  footerTextEn?: string;
  headerText?: string;
  headerTextEn?: string;
}

// 网页展示模板配置
export interface WebpageTemplateConfig {
  layout: "standard" | "minimal" | "detailed" | "card-based";
  colorScheme: "light" | "dark" | "system";
  
  // 内容显示
  showTableOfContents: boolean;
  showKeyPoints: boolean;
  showRecommendations: boolean;
  showReferences: boolean;
  showDownloadLink: boolean;
  showMetadata: boolean;
  
  // 导出功能
  enablePdfExport: boolean;
  enableDocxExport: boolean;
  enablePrint: boolean;
  
  // 样式配置
  accentColor: string;    // hex color
  maxContentWidth: number; // px
  lineHeight: number;      // multiplier
}

export interface KnowledgeTemplateConfig {
  formal?: FormalDocumentTemplateConfig;
  webpage?: WebpageTemplateConfig;
}

// 预定义的模板
export const DEFAULT_TEMPLATES = {
  // 正式文档模板 v1
  FORMAL_DOCUMENT_V1: {
    code: "formal_doc_v1",
    name: "标准正式文档",
    nameEn: "Standard Formal Document",
    templateType: "FORMAL_DOCUMENT" as KnowledgeTemplateType,
    documentFormat: "PDF",
    isDefault: true,
    config: {
      formal: {
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
        includeWatermark: true,
        watermarkText: "上海气候周 2026",
        watermarkOpacity: 0.1,
        watermarkAngle: 45,
        watermarkFontSize: 60,
        includeEventQRCode: true,
        includeReferences: true,
        includeChapters: true,
        footerText: "© Shanghai Climate Week 2026",
        headerText: "知识成果",
      },
    } as KnowledgeTemplateConfig,
  },

  // 正式文档模板 v2 - 最小化
  FORMAL_DOCUMENT_MINIMAL: {
    code: "formal_doc_minimal",
    name: "简化正式文档",
    nameEn: "Minimal Formal Document",
    templateType: "FORMAL_DOCUMENT" as KnowledgeTemplateType,
    documentFormat: "PDF",
    isDefault: false,
    config: {
      formal: {
        styleTemplate: "minimal",
        colorScheme: "gray",
        pageSize: "A4",
        fontSize: 10,
        fontFamily: "Arial, sans-serif",
        includeCover: false,
        includeTableOfContents: false,
        includePageNumbers: true,
        includeHeaders: false,
        includeFooters: false,
        includeWatermark: false,
        includeEventQRCode: false,
        includeReferences: false,
        includeChapters: false,
      },
    } as KnowledgeTemplateConfig,
  },

  // 网页展示模板 v1 - 标准版
  WEBPAGE_STANDARD: {
    code: "webpage_standard",
    name: "标准网页展示",
    nameEn: "Standard Webpage Display",
    templateType: "WEBPAGE_DISPLAY" as KnowledgeTemplateType,
    isDefault: true,
    config: {
      webpage: {
        layout: "standard",
        colorScheme: "light",
        showTableOfContents: true,
        showKeyPoints: true,
        showRecommendations: true,
        showReferences: true,
        showDownloadLink: true,
        showMetadata: true,
        enablePdfExport: true,
        enableDocxExport: true,
        enablePrint: true,
        accentColor: "#0d9488",
        maxContentWidth: 900,
        lineHeight: 1.6,
      },
    } as KnowledgeTemplateConfig,
  },

  // 网页展示模板 v2 - 详细版
  WEBPAGE_DETAILED: {
    code: "webpage_detailed",
    name: "详细网页展示",
    nameEn: "Detailed Webpage Display",
    templateType: "WEBPAGE_DISPLAY" as KnowledgeTemplateType,
    isDefault: false,
    config: {
      webpage: {
        layout: "detailed",
        colorScheme: "light",
        showTableOfContents: true,
        showKeyPoints: true,
        showRecommendations: true,
        showReferences: true,
        showDownloadLink: true,
        showMetadata: true,
        enablePdfExport: true,
        enableDocxExport: true,
        enablePrint: true,
        accentColor: "#059669",
        maxContentWidth: 1000,
        lineHeight: 1.8,
      },
    } as KnowledgeTemplateConfig,
  },

  // 网页展示模板 v3 - 卡片式
  WEBPAGE_CARD_BASED: {
    code: "webpage_card",
    name: "卡片式网页展示",
    nameEn: "Card-Based Webpage Display",
    templateType: "WEBPAGE_DISPLAY" as KnowledgeTemplateType,
    isDefault: false,
    config: {
      webpage: {
        layout: "card-based",
        colorScheme: "light",
        showTableOfContents: false,
        showKeyPoints: true,
        showRecommendations: true,
        showReferences: false,
        showDownloadLink: true,
        showMetadata: false,
        enablePdfExport: true,
        enableDocxExport: false,
        enablePrint: false,
        accentColor: "#10b981",
        maxContentWidth: 1200,
        lineHeight: 1.5,
      },
    } as KnowledgeTemplateConfig,
  },
};

// 获取所有默认模板配置
export function getDefaultTemplates() {
  return Object.values(DEFAULT_TEMPLATES);
}

// 根据代码获取模板
export function getTemplateByCode(code: string) {
  return Object.values(DEFAULT_TEMPLATES).find(t => t.code === code);
}

// 根据类型和是否默认获取模板
export function getTemplatesByType(
  templateType: KnowledgeTemplateType,
  isDefault?: boolean
) {
  return Object.values(DEFAULT_TEMPLATES).filter(
    t => t.templateType === templateType && (isDefault === undefined || t.isDefault === isDefault)
  );
}

// 获取默认的正式文档模板
export function getDefaultFormalDocumentTemplate() {
  return DEFAULT_TEMPLATES.FORMAL_DOCUMENT_V1;
}

// 获取默认的网页展示模板
export function getDefaultWebpageTemplate() {
  return DEFAULT_TEMPLATES.WEBPAGE_STANDARD;
}

// 合并模板配置（用于覆盖默认值）
export function mergeTemplateConfig(
  baseConfig: KnowledgeTemplateConfig,
  overrides: Partial<KnowledgeTemplateConfig>
): KnowledgeTemplateConfig {
  return {
    formal: overrides.formal
      ? { ...baseConfig.formal, ...overrides.formal }
      : baseConfig.formal,
    webpage: overrides.webpage
      ? { ...baseConfig.webpage, ...overrides.webpage }
      : baseConfig.webpage,
  };
}
