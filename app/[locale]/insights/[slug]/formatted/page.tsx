/**
 * 知识成果 - 正式格式化展示页面
 * Route: /[locale]/insights/[slug]/formatted
 */

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  Download,
  FileText,
  Printer,
  Clock,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Props {
  params: {
    locale: string;
    slug: string;
  };
}

type WebpageTemplateRuntimeConfig = {
  layout?: "standard" | "minimal" | "detailed" | "card-based";
  showTableOfContents?: boolean;
  showKeyPoints?: boolean;
  showRecommendations?: boolean;
  showReferences?: boolean;
  showDownloadLink?: boolean;
  showMetadata?: boolean;
  enablePdfExport?: boolean;
  enableDocxExport?: boolean;
  enablePrint?: boolean;
  accentColor?: string;
  maxContentWidth?: number;
  lineHeight?: number;
};

function normalizeSlugParam(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export async function generateMetadata({ params }: Props) {
  const normalizedSlug = normalizeSlugParam(params.slug);
  const asset = await prisma.knowledgeAsset.findUnique({
    where: { slug: normalizedSlug },
  });

  if (!asset) return { title: "Not Found" };

  const titleText = params.locale === "en" ? asset.titleEn : asset.title;
  return {
    title: `${titleText} - Knowledge Hub`,
    description:
      params.locale === "en" ? asset.summaryEn : asset.summary,
  };
}

export default async function FormattedKnowledgeAssetPage({ params }: Props) {
  const { locale } = params;
  const isEnglish = locale === "en";
  const normalizedSlug = normalizeSlugParam(params.slug);

  // 获取知识资产
  const asset = await prisma.knowledgeAsset.findUnique({
    where: { slug: normalizedSlug },
    include: {
      events: { include: { event: true } },
      institutions: { include: { institution: true } },
      tracks: { include: { track: true } },
    },
  });

  if (!asset) {
    notFound();
  }

  // 权限检查
  if (asset.status === "DRAFT") {
    // 对于draft资产，需要管理员权限，这里简单返回notFound
    // 实际应该在服务器端检查session
    notFound();
  }

  const webTemplate = asset.webTemplateId
    ? await prisma.knowledgeTemplate.findUnique({
        where: { id: asset.webTemplateId },
        select: {
          id: true,
          name: true,
          nameEn: true,
          config: true,
        },
      })
    : null;

  const webpageConfig = ((webTemplate?.config as any)?.webpage || {}) as WebpageTemplateRuntimeConfig;
  const layout = webpageConfig.layout || "standard";
  const accentColor = webpageConfig.accentColor || "#0d9488";
  const showMetadata = webpageConfig.showMetadata !== false;
  const showToc = webpageConfig.showTableOfContents !== false;
  const showKeyPoints = webpageConfig.showKeyPoints !== false;
  const showRecommendations = webpageConfig.showRecommendations !== false;
  const showReferences = webpageConfig.showReferences !== false;
  const showDownload = webpageConfig.showDownloadLink !== false;
  const enablePdfExport = webpageConfig.enablePdfExport !== false;
  const enablePrint = webpageConfig.enablePrint !== false;
  const maxContentWidth = Math.max(720, Math.min(1400, webpageConfig.maxContentWidth || 900));
  const lineHeight = Math.max(1.4, Math.min(2.2, webpageConfig.lineHeight || 1.7));

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleDateString(isEnglish ? "en-US" : "zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const title = isEnglish ? asset.titleEn : asset.title;
  const subtitle = isEnglish ? asset.subtitleEn : asset.subtitle;
  const summary = isEnglish ? asset.summaryEn : asset.summary;
  const content = isEnglish ? asset.contentEn : asset.content;
  const keyPoints = (isEnglish ? asset.keyPointsEn : asset.keyPoints) || [];
  const recommendations = isEnglish
    ? asset.recommendationsEn
    : asset.recommendations;
  const references = asset.references || [];
  const chapters = isEnglish ? asset.chaptersEn : asset.chapters;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto px-4 py-12" style={{ maxWidth: `${maxContentWidth}px` }}>
        {/* 返回链接 */}
        <div className="mb-6">
          <Link
            href={`/${locale}/insights`}
            className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-medium"
          >
            ← Back to Knowledge Hub
          </Link>
        </div>

        {/* 主卡片 */}
        <Card className="bg-white shadow-lg rounded-xl overflow-hidden">
          {/* 页头 */}
          <div className="px-8 py-12 text-white" style={{ background: `linear-gradient(90deg, ${accentColor}, #0f766e)` }}>
            <div className="max-w-4xl mx-auto">
              {asset.coverImage && (
                <img
                  src={asset.coverImage}
                  alt={title}
                  className="w-full max-w-md h-48 object-cover rounded-lg mb-6 opacity-90"
                />
              )}

              <h1 className="text-4xl font-bold mb-4">{title}</h1>

              {subtitle && (
                <p className="text-xl text-emerald-100 mb-6 italic">
                  {subtitle}
                </p>
              )}

              {/* 元数据条 */}
              {showMetadata && (
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  <span>{asset.type}</span>
                </div>

                {asset.publishDate && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{formatDate(asset.publishDate)}</span>
                  </div>
                )}

                {asset.doi && (
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{asset.doi}</span>
                  </div>
                )}
              </div>
              )}
            </div>
          </div>

          {/* 导出工具栏 */}
          <div className="bg-slate-50 px-8 py-4 border-b border-slate-200 flex flex-wrap gap-3 justify-between items-center">
            <div className="flex gap-2 flex-wrap">
              {showDownload && asset.downloadEnabled && (
                <>
                  {enablePdfExport && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="gap-2"
                  >
                    <a
                      href={`/api/insights/${asset.id}/export?format=pdf&download=true`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="w-4 h-4" />
                      {isEnglish ? "Download PDF" : "下载 PDF"}
                    </a>
                  </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="gap-2"
                  >
                    <a
                      href={`/api/insights/${asset.id}/export?format=html&download=true`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FileText className="w-4 h-4" />
                      {isEnglish ? "Export HTML" : "导出 HTML"}
                    </a>
                  </Button>
                </>
              )}

              {enablePrint && (
              <Button variant="outline" size="sm" asChild className="gap-2">
                <a
                  href={`/api/insights/${asset.id}/export?format=html`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Printer className="w-4 h-4" />
                  {isEnglish ? "Print View" : "打印视图"}
                </a>
              </Button>
              )}
            </div>

            {/* 查看原始页面链接 */}
            <div>
              <Link
                href={`/${locale}/insights/${asset.slug}`}
                className="text-sm text-slate-600 hover:text-slate-900 underline"
              >
                {isEnglish ? "View Standard Page" : "查看标准页面"}
              </Link>
            </div>
          </div>

          {/* 主要内容区域 */}
          <div className="px-8 py-12">
            {/* 摘要 */}
            {summary && (
              <div className={`mb-12 p-6 rounded-lg border ${layout === "minimal" ? "bg-slate-50 border-slate-200" : "bg-emerald-50 border-emerald-200"}`}>
                <h2 className="text-xl font-bold text-emerald-900 mb-3">
                  {isEnglish ? "Summary" : "摘要"}
                </h2>
                <p className="text-slate-700" style={{ lineHeight }}>{summary}</p>
              </div>
            )}

            {/* 目录 (if chapters exist) */}
            {showToc && chapters && Array.isArray(chapters) && chapters.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">
                  {isEnglish ? "Table of Contents" : "目录"}
                </h2>
                <ol className="list-decimal list-inside space-y-2 ml-4">
                  {(chapters as any[]).map((ch: any, idx: number) => (
                    <li
                      key={idx}
                      className="text-slate-700 hover:text-slate-900 cursor-pointer"
                    >
                      {ch.title || `${isEnglish ? "Section" : "第"} ${idx + 1} ${isEnglish ? "" : "节"}`}
                      {ch.pageStart && `(p. ${ch.pageStart})`}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* 主要内容 */}
            {content && (
              <div className="mb-12 prose prose-sm max-w-none">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">
                  {isEnglish ? "Content" : "正文内容"}
                </h2>
                <div
                  className="text-slate-700 leading-relaxed whitespace-pre-wrap"
                  style={{ lineHeight }}
                >
                  {content}
                </div>
              </div>
            )}

            {/* 关键点 */}
            {showKeyPoints && keyPoints && keyPoints.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">
                  {isEnglish ? "Key Points" : "关键要点"}
                </h2>
                <ul className="space-y-3">
                  {(keyPoints as string[]).map((point: string, idx: number) => (
                    <li
                      key={idx}
                      className="flex gap-3 text-slate-700 leading-relaxed"
                    >
                      <span className="inline-flex items-center justify-center flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold mt-0.5">
                        ✓
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 推荐 */}
            {showRecommendations && recommendations && (
              <div className="mb-12 p-6 bg-blue-50 rounded-lg border border-blue-200">
                <h2 className="text-xl font-bold text-blue-900 mb-3">
                  {isEnglish ? "Recommendations" : "建议"}
                </h2>
                <p className="text-blue-800 leading-relaxed">
                  {recommendations}
                </p>
              </div>
            )}

            {/* 参考资料 */}
            {showReferences && references && references.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">
                  {isEnglish ? "References" : "参考资料"}
                </h2>
                <ol className="list-decimal list-inside space-y-2 ml-4">
                  {(references as any[]).map((ref: any, idx: number) => (
                    <li key={idx} className="text-slate-700">
                      {typeof ref === "string" ? ref : ref.title || JSON.stringify(ref)}
                    </li>
                  ))}

                  {webTemplate && (
                    <div className="mt-12 border-t border-slate-200 pt-4 text-xs text-slate-500">
                      {isEnglish
                        ? `Template: ${webTemplate.nameEn || webTemplate.name}`
                        : `模板：${webTemplate.name}`}
                    </div>
                  )}
                </ol>
              </div>
            )}

            {/* 相关信息 */}
            <div className="mt-16 pt-8 border-t border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-6">
                {isEnglish ? "Related Information" : "相关信息"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 相关事件 */}
                {asset.events && asset.events.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3">
                      {isEnglish ? "Related Events" : "相关活动"}
                    </h4>
                    <ul className="space-y-2">
                      {asset.events.map((ea: any) => (
                        <li key={ea.eventId}>
                          <Link
                            href={`/${locale}/events/${ea.event.id}`}
                            className="text-emerald-600 hover:text-emerald-700 underline"
                          >
                            {isEnglish ? ea.event.titleEn || ea.event.title : ea.event.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 相关轨道 */}
                {asset.tracks && asset.tracks.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3">
                      {isEnglish ? "Related Tracks" : "相关轨道"}
                    </h4>
                    <ul className="space-y-2">
                      {asset.tracks.map((ta: any) => (
                        <li key={ta.trackId}>
                          <span className="text-slate-700">{ta.track.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 页脚 */}
          <div className="bg-slate-50 px-8 py-6 border-t border-slate-200 text-center text-sm text-slate-600">
            <p>© 2026 Shanghai Climate Week. All rights reserved.</p>
            <p className="mt-2">
              {isEnglish ? "Generated:" : "生成时间:"} {new Date().toLocaleString()}
            </p>
          </div>
        </Card>

        {/* 下方空间 */}
        <div className="mt-12"></div>
      </div>

      {/* 打印样式 */}
      <style>{`
        @media print {
          .bg-gradient-to-br,
          .border-b,
          .border-t {
            border: none;
            background: white;
          }
          
          button,
          a[href*="Back"],
          a[href*="View"] {
            display: none !important;
          }
          
          body {
            background: white;
          }
          
          .max-w-4xl {
            max-width: 100%;
          }
          
          .shadow-lg {
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
}
