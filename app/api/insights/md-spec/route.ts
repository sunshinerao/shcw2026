import { NextRequest, NextResponse } from "next/server";
import { requireInsightAdmin } from "@/lib/insight-auth";

export const dynamic = "force-dynamic";

const ZH_SPEC = `---
title: 上海气候周2026知识产出白皮书
subtitle: 面向2026年全球气候行动的战略框架
author: 张三, 李四
tags: 气候变化, 绿色转型, 供应链
---

<!-- SUMMARY -->
本白皮书系统梳理了上海气候周2026的核心议题与战略框架，为各参与方提供行动指引。

<!-- PULL_QUOTE -->
气候行动不是成本，而是通往未来的最优投资路径。

<!-- PULL_QUOTE_CAPTION -->
张三，清华大学气候研究院院长

<!-- ABOUT_US -->
（可选）填写后将覆盖全局机构简介。如不填写，封底将使用网站全局设置中的机构简介。

# 第一章：背景与挑战
<!-- CHAPTER_SUBTITLE -->
全球气候治理的现实困境

本章正文段落一。内容应为完整的段落，段落之间用空行隔开。

本章正文段落二。更多内容……

## KEY_POINTS
- 全球平均气温较工业化前水平已上升1.2°C
- 发展中国家面临减排与发展的双重压力
- 供应链绿色化是撬动系统性变革的关键杠杆

# 第二章：战略框架
<!-- CHAPTER_SUBTITLE -->
面向2030的行动路线图

本章正文……

## KEY_POINTS
- 本章要点一
- 本章要点二
- 本章要点三

# 第三章：结论与建议

本章正文……

## KEY_POINTS
- 结论要点一

## REFERENCES
1. IPCC, 2023. Sixth Assessment Report. Geneva: IPCC.
2. World Bank, 2024. Climate Finance Review. Washington D.C.
3. 生态环境部, 2025. 中国碳市场年度报告. 北京.

## RECOMMENDATIONS
- 《全球气候治理蓝皮书2025》
- UNFCCC国家自主贡献综合报告
- 本系列白皮书第一册：《绿色供应链行动指南》
`;

const EN_SPEC = `---
titleEn: Shanghai Climate Week 2026 Knowledge White Paper
subtitleEn: Strategic Framework for Global Climate Action 2026
tagsEn: climate change, green transition, supply chain
---

<!-- SUMMARY_EN -->
This white paper systematically reviews the core topics and strategic framework of SHCW2026, providing action guidance for all stakeholders.

<!-- PULL_QUOTE_EN -->
Climate action is not a cost—it is the optimal investment path to the future.

<!-- PULL_QUOTE_CAPTION_EN -->
Zhang San, Director, Tsinghua Climate Institute

<!-- ABOUT_US_EN -->
(Optional) Fill in to override the global organization description. If left blank, the back cover will use the site-wide About Us setting.

# Chapter 1: Background and Challenges
<!-- CHAPTER_SUBTITLE_EN -->
The Real Dilemma of Global Climate Governance

Chapter body paragraph one. Content should be complete paragraphs separated by blank lines.

Chapter body paragraph two. More content…

## KEY_POINTS_EN
- Global average temperature has risen 1.2°C above pre-industrial levels
- Developing nations face dual pressure: emissions reduction and development
- Green supply chains are the key lever for systemic change

# Chapter 2: Strategic Framework
<!-- CHAPTER_SUBTITLE_EN -->
Action Roadmap Toward 2030

Chapter body text…

## KEY_POINTS_EN
- Key point one for this chapter
- Key point two for this chapter
- Key point three for this chapter

# Chapter 3: Conclusions and Recommendations

Chapter body text…

## KEY_POINTS_EN
- Conclusion point one

## RECOMMENDATIONS_EN
- Global Climate Governance Blue Book 2025
- UNFCCC NDC Synthesis Report
- Series Volume 1: Green Supply Chain Action Guide
`;

/**
 * GET /api/insights/md-spec?lang=zh  — download Chinese MD spec template
 * GET /api/insights/md-spec?lang=en  — download English MD spec template
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await requireInsightAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const lang = new URL(req.url).searchParams.get("lang");
    const isEn = lang === "en";

    const content = isEn ? EN_SPEC : ZH_SPEC;
    const filename = isEn
      ? "knowledge_asset_spec_en.md"
      : "knowledge_asset_spec_zh.md";

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("MD spec download error:", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
