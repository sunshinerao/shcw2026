export const KNOWLEDGE_ASSET_TYPES = [
  "WHITE_PAPER",
  "REPORT",
  "INITIATIVE",
  "POLICY_BRIEF",
  "GUIDE",
  "DECLARATION",
  "SUMMARY",
] as const;

export type KnowledgeAssetTypeKey = (typeof KNOWLEDGE_ASSET_TYPES)[number];

export type KnowledgeTypePreset = {
  type: KnowledgeAssetTypeKey;
  labelZh: string;
  labelEn: string;
  formalTemplateCode: string;
  webTemplateCode: string;
  formalTemplateCodeStandard: string;
  formalTemplateCodeSimple: string;
  webTemplateCodeStandard: string;
  webTemplateCodeCard: string;
  toneZh: string;
  toneEn: string;
  sectionFocusZh: string;
  sectionFocusEn: string;
  mdSpecTemplate?: string;
};

export type KnowledgeTypeSettingsMap = Record<KnowledgeAssetTypeKey, KnowledgeTypePreset>;

export const SUPPORTED_KNOWLEDGE_TEMPLATE_CODES = [
  "formal_doc_v1",
  "formal_doc_minimal",
  "webpage_standard",
  "webpage_card",
] as const;

export const KNOWLEDGE_TYPE_PRESETS: KnowledgeTypeSettingsMap = {
  WHITE_PAPER: {
    type: "WHITE_PAPER",
    labelZh: "白皮书",
    labelEn: "White Paper",
    formalTemplateCode: "formal_doc_v1",
    webTemplateCode: "webpage_standard",
    formalTemplateCodeStandard: "formal_doc_v1",
    formalTemplateCodeSimple: "formal_doc_minimal",
    webTemplateCodeStandard: "webpage_standard",
    webTemplateCodeCard: "webpage_card",
    toneZh: "战略分析、行业判断、政策建议",
    toneEn: "strategic analysis, industry outlook, policy recommendations",
    sectionFocusZh: "背景、挑战、框架、建议",
    sectionFocusEn: "background, challenges, framework, recommendations",
  },
  REPORT: {
    type: "REPORT",
    labelZh: "报告",
    labelEn: "Report",
    formalTemplateCode: "formal_doc_v1",
    webTemplateCode: "webpage_standard",
    formalTemplateCodeStandard: "formal_doc_v1",
    formalTemplateCodeSimple: "formal_doc_minimal",
    webTemplateCodeStandard: "webpage_standard",
    webTemplateCodeCard: "webpage_card",
    toneZh: "事实归纳、数据支撑、阶段性结论",
    toneEn: "fact-based reporting, evidence, conclusions",
    sectionFocusZh: "概况、发现、数据、结论",
    sectionFocusEn: "overview, findings, evidence, conclusions",
  },
  INITIATIVE: {
    type: "INITIATIVE",
    labelZh: "倡议",
    labelEn: "Initiative",
    formalTemplateCode: "formal_doc_minimal",
    webTemplateCode: "webpage_card",
    formalTemplateCodeStandard: "formal_doc_v1",
    formalTemplateCodeSimple: "formal_doc_minimal",
    webTemplateCodeStandard: "webpage_standard",
    webTemplateCodeCard: "webpage_card",
    toneZh: "行动号召、参与方式、共识表达",
    toneEn: "call to action, participation, shared commitment",
    sectionFocusZh: "愿景、行动项、参与方式",
    sectionFocusEn: "vision, actions, participation",
  },
  POLICY_BRIEF: {
    type: "POLICY_BRIEF",
    labelZh: "政策简报",
    labelEn: "Policy Brief",
    formalTemplateCode: "formal_doc_v1",
    webTemplateCode: "webpage_standard",
    formalTemplateCodeStandard: "formal_doc_v1",
    formalTemplateCodeSimple: "formal_doc_minimal",
    webTemplateCodeStandard: "webpage_standard",
    webTemplateCodeCard: "webpage_card",
    toneZh: "短而清晰、问题导向、建议导向",
    toneEn: "concise, issue-driven, recommendation-led",
    sectionFocusZh: "问题、影响、政策建议",
    sectionFocusEn: "issue, impact, policy options",
  },
  GUIDE: {
    type: "GUIDE",
    labelZh: "指南",
    labelEn: "Guide",
    formalTemplateCode: "formal_doc_minimal",
    webTemplateCode: "webpage_standard",
    formalTemplateCodeStandard: "formal_doc_v1",
    formalTemplateCodeSimple: "formal_doc_minimal",
    webTemplateCodeStandard: "webpage_standard",
    webTemplateCodeCard: "webpage_card",
    toneZh: "实践导向、操作清晰、步骤化",
    toneEn: "practical, clear, step-by-step",
    sectionFocusZh: "适用场景、方法、步骤、工具",
    sectionFocusEn: "use cases, methods, steps, tools",
  },
  DECLARATION: {
    type: "DECLARATION",
    labelZh: "宣言",
    labelEn: "Declaration",
    formalTemplateCode: "formal_doc_v1",
    webTemplateCode: "webpage_card",
    formalTemplateCodeStandard: "formal_doc_v1",
    formalTemplateCodeSimple: "formal_doc_minimal",
    webTemplateCodeStandard: "webpage_standard",
    webTemplateCodeCard: "webpage_card",
    toneZh: "立场鲜明、共同承诺、对外表达",
    toneEn: "clear stance, joint commitment, public statement",
    sectionFocusZh: "背景、共同原则、承诺事项",
    sectionFocusEn: "background, principles, commitments",
  },
  SUMMARY: {
    type: "SUMMARY",
    labelZh: "会议成果",
    labelEn: "Summary",
    formalTemplateCode: "formal_doc_minimal",
    webTemplateCode: "webpage_card",
    formalTemplateCodeStandard: "formal_doc_v1",
    formalTemplateCodeSimple: "formal_doc_minimal",
    webTemplateCodeStandard: "webpage_standard",
    webTemplateCodeCard: "webpage_card",
    toneZh: "会议概述、成果提炼、关键结论",
    toneEn: "event overview, outcomes, key takeaways",
    sectionFocusZh: "议题回顾、亮点、成果、后续",
    sectionFocusEn: "topics, highlights, outcomes, next steps",
  },
};

export function normalizeKnowledgeAssetType(type?: string | null): KnowledgeAssetTypeKey {
  const normalized = String(type || "REPORT").trim().toUpperCase();
  return (KNOWLEDGE_ASSET_TYPES as readonly string[]).includes(normalized)
    ? (normalized as KnowledgeAssetTypeKey)
    : "REPORT";
}

function buildDefaultStructuredMarkdownSpecFromPreset(preset: KnowledgeTypePreset) {
  return `---
type: ${preset.type}
title: ${preset.labelZh}示例标题
titleEn: Example ${preset.labelEn} Title
subtitle: 请填写一句中文副标题
subtitleEn: Please provide a one-line English subtitle
author: 上海气候周研究团队
tags: 标签1, 标签2
tagsEn: tag1, tag2
---

<!-- SUMMARY -->
请填写中文摘要，建议 120-220 字，内容风格：${preset.toneZh}。

<!-- SUMMARY_EN -->
Please provide the English summary in 120-220 words. Tone: ${preset.toneEn}.

<!-- PULL_QUOTE -->
请填写一句精选引语（可选）。

<!-- PULL_QUOTE_EN -->
Optional pull quote in English.

<!-- PULL_QUOTE_CAPTION -->
引语署名（可选）

<!-- PULL_QUOTE_CAPTION_EN -->
Quote attribution (optional)

<!-- ABOUT_US -->
可选：封底中文机构介绍。

<!-- ABOUT_US_EN -->
Optional: English about-us text for the back page.

> 模版映射说明 / Template mapping
> - SUMMARY / SUMMARY_EN → 导言页 / Introduction page
> - PULL_QUOTE / PULL_QUOTE_EN → 引语页 / Quote page
> - 各章节正文与 KEY_POINTS → 目录、章节分页与 Key Highlights
> - RECOMMENDATIONS / RECOMMENDATIONS_EN → 建议页 / Recommendations page
> - ABOUT_US / ABOUT_US_EN → 封底页 / About us page

# 第一章：核心主题
<!-- CHAPTER_TITLE_EN -->
Chapter 1: Core Theme
<!-- CHAPTER_SUBTITLE -->
本章建议围绕：${preset.sectionFocusZh}
<!-- CHAPTER_SUBTITLE_EN -->
Suggested focus: ${preset.sectionFocusEn}

这里填写中文正文段落。请使用完整段落，段落之间空一行。

<!-- CONTENT_EN -->
Write the English body for this chapter here. Use complete paragraphs separated by blank lines.

## KEY_POINTS
- 中文关键要点一
- 中文关键要点二

## KEY_POINTS_EN
- English key point one
- English key point two

# 第二章：行动路径
<!-- CHAPTER_TITLE_EN -->
Chapter 2: Action Path
<!-- CHAPTER_SUBTITLE -->
结合具体对象、场景或建议展开。
<!-- CHAPTER_SUBTITLE_EN -->
Expand with concrete actors, scenarios or recommendations.

这里填写第二章中文正文。

<!-- CONTENT_EN -->
Write the English content for chapter 2 here.

## KEY_POINTS
- 第二章中文要点

## KEY_POINTS_EN
- Chapter 2 English point

## REFERENCES
1. 参考资料一
2. 参考资料二

## RECOMMENDATIONS
- 推荐阅读或后续行动一
- 推荐阅读或后续行动二

## RECOMMENDATIONS_EN
- Recommended reading or next action one
- Recommended reading or next action two
`;
}

function renderKnowledgeSpecTemplate(template: string, preset: KnowledgeTypePreset) {
  return template
    .replaceAll("{{type}}", preset.type)
    .replaceAll("{{labelZh}}", preset.labelZh)
    .replaceAll("{{labelEn}}", preset.labelEn)
    .replaceAll("{{toneZh}}", preset.toneZh)
    .replaceAll("{{toneEn}}", preset.toneEn)
    .replaceAll("{{sectionFocusZh}}", preset.sectionFocusZh)
    .replaceAll("{{sectionFocusEn}}", preset.sectionFocusEn);
}

export function normalizeKnowledgeTypeSettings(value: unknown): KnowledgeTypeSettingsMap {
  const base = KNOWLEDGE_TYPE_PRESETS;
  const result = {} as KnowledgeTypeSettingsMap;

  for (const type of KNOWLEDGE_ASSET_TYPES) {
    const defaults = base[type];
    const current = value && typeof value === "object" && !Array.isArray(value)
      ? (value as Partial<Record<KnowledgeAssetTypeKey, Partial<KnowledgeTypePreset>>>)[type]
      : undefined;

    const normalizedFormalTemplateCode = typeof current?.formalTemplateCode === "string" && current.formalTemplateCode.trim()
      ? current.formalTemplateCode.trim()
      : defaults.formalTemplateCode;
    const normalizedWebTemplateCode = typeof current?.webTemplateCode === "string" && current.webTemplateCode.trim()
      ? current.webTemplateCode.trim()
      : defaults.webTemplateCode;

    result[type] = {
      ...defaults,
      type,
      labelZh: typeof current?.labelZh === "string" && current.labelZh.trim() ? current.labelZh.trim() : defaults.labelZh,
      labelEn: typeof current?.labelEn === "string" && current.labelEn.trim() ? current.labelEn.trim() : defaults.labelEn,
      formalTemplateCode: normalizedFormalTemplateCode,
      webTemplateCode: normalizedWebTemplateCode,
      formalTemplateCodeStandard: typeof current?.formalTemplateCodeStandard === "string" && current.formalTemplateCodeStandard.trim()
        ? current.formalTemplateCodeStandard.trim()
        : defaults.formalTemplateCodeStandard,
      formalTemplateCodeSimple: typeof current?.formalTemplateCodeSimple === "string" && current.formalTemplateCodeSimple.trim()
        ? current.formalTemplateCodeSimple.trim()
        : defaults.formalTemplateCodeSimple,
      webTemplateCodeStandard: typeof current?.webTemplateCodeStandard === "string" && current.webTemplateCodeStandard.trim()
        ? current.webTemplateCodeStandard.trim()
        : defaults.webTemplateCodeStandard,
      webTemplateCodeCard: typeof current?.webTemplateCodeCard === "string" && current.webTemplateCodeCard.trim()
        ? current.webTemplateCodeCard.trim()
        : defaults.webTemplateCodeCard,
      toneZh: typeof current?.toneZh === "string" && current.toneZh.trim() ? current.toneZh.trim() : defaults.toneZh,
      toneEn: typeof current?.toneEn === "string" && current.toneEn.trim() ? current.toneEn.trim() : defaults.toneEn,
      sectionFocusZh: typeof current?.sectionFocusZh === "string" && current.sectionFocusZh.trim()
        ? current.sectionFocusZh.trim()
        : defaults.sectionFocusZh,
      sectionFocusEn: typeof current?.sectionFocusEn === "string" && current.sectionFocusEn.trim()
        ? current.sectionFocusEn.trim()
        : defaults.sectionFocusEn,
      mdSpecTemplate: typeof current?.mdSpecTemplate === "string" && current.mdSpecTemplate.trim()
        ? current.mdSpecTemplate
        : buildDefaultStructuredMarkdownSpecFromPreset({ ...defaults, ...(current || {}), type }),
    };
  }

  return result;
}

export function getKnowledgeTypePreset(
  type?: string | null,
  settings?: unknown,
): KnowledgeTypePreset {
  return normalizeKnowledgeTypeSettings(settings)[normalizeKnowledgeAssetType(type)];
}

export function buildStructuredMarkdownSpec(type?: string | null, settings?: unknown) {
  const preset = getKnowledgeTypePreset(type, settings);
  const template = preset.mdSpecTemplate?.trim() || buildDefaultStructuredMarkdownSpecFromPreset(preset);
  return renderKnowledgeSpecTemplate(template, preset);
}
