"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, Copy, Download, ExternalLink, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

function normalizeSlug(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue) return "";

  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
}

type InsightDetail = {
  id: string;
  slug: string;
  title: string;
  titleEn?: string | null;
  subtitle?: string | null;
  subtitleEn?: string | null;
  type: string;
  publishDate?: string | null;
  coverImage?: string | null;
  summary?: string | null;
  summaryEn?: string | null;
  content?: string | null;
  contentEn?: string | null;
  keyPoints?: string[] | null;
  keyPointsEn?: string[] | null;
  fileUrl?: string | null;
  fileFormat?: string | null;
  fileSize?: number | null;
  accessType: string;
  downloadEnabled: boolean;
  citation?: string | null;
  accessNotice?: string;
  events: Array<{ event: { id: string; title: string; titleEn?: string | null } }>;
  speakers: Array<{ speaker: { id: string; name: string; nameEn?: string | null } }>;
  institutions: Array<{ institution: { id: string; slug: string; name: string; nameEn?: string | null } }>;
};

function fileExtension(format: string | null | undefined) {
  const lower = (format || "").toLowerCase();
  if (lower === "word") return "doc";
  if (lower === "msword") return "doc";
  if (lower === "application/pdf") return "pdf";
  if (lower === "application/msword") return "doc";
  if (lower.includes("wordprocessingml")) return "docx";
  return lower || "file";
}

function safeFilePart(input: string | null | undefined, fallback: string) {
  const value = (input || "").trim();
  if (!value) return fallback;
  return value.replace(/[\\/:*?"<>|]/g, "_");
}

function formatDate(dateStr: string | null | undefined, locale: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString(locale === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function InsightDetailPage() {
  const locale = useLocale();
  const params = useParams<{ slug: string }>();
  const slug = normalizeSlug(params?.slug);

  const [item, setItem] = useState<InsightDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailUrl, setDetailUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDetailUrl(window.location.href);
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/public/insights/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((json) => setItem(json.success ? json.data : null))
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const title = locale === "en" && item?.titleEn ? item.titleEn : item?.title;
  const subtitle = locale === "en" && item?.subtitleEn ? item.subtitleEn : item?.subtitle;
  const summary = locale === "en" && item?.summaryEn ? item.summaryEn : item?.summary;
  const content = locale === "en" && item?.contentEn ? item.contentEn : item?.content;
  const keyPoints = useMemo(() => {
    const kp = locale === "en" ? item?.keyPointsEn : item?.keyPoints;
    if (Array.isArray(kp)) return kp;
    return [];
  }, [item?.keyPoints, item?.keyPointsEn, locale]);

  async function downloadOriginalFile() {
    if (!item?.fileUrl) return;

    const firstSpeaker = item.speakers?.[0]?.speaker;
    const authorName = locale === "en"
      ? firstSpeaker?.nameEn || firstSpeaker?.name || "author"
      : firstSpeaker?.name || firstSpeaker?.nameEn || "作者";
    const baseTitle = safeFilePart(title, "knowledge");
    const baseAuthor = safeFilePart(authorName, "author");
    const ext = fileExtension(item.fileFormat);
    const filename = `${baseTitle}-${baseAuthor}.${ext}`;

    const link = document.createElement("a");
    link.href = item.fileUrl;
    link.download = filename;
    link.rel = "noreferrer";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function showFullText() {
    const targetSlug = item?.slug || slug;
    const encodedSlug = encodeURIComponent(targetSlug);
    window.open(`/${locale}/insights/${encodedSlug}/formatted`, "_blank", "noopener,noreferrer");
  }

  function buildFullTextLink() {
    const targetSlug = encodeURIComponent(item?.slug || slug);
    if (detailUrl) {
      const base = typeof window !== "undefined" ? window.location.origin : "";
      if (base && detailUrl.startsWith(base)) {
        return `${base}/${locale}/insights/${targetSlug}/formatted`;
      }
    }
    if (typeof window !== "undefined") {
      return `${window.location.origin}/${locale}/insights/${targetSlug}/formatted`;
    }
    return `/${locale}/insights/${targetSlug}/formatted`;
  }

  if (loading) {
    return <div className="py-24 text-center text-slate-500">{locale === "en" ? "Loading..." : "加载中..."}</div>;
  }

  if (!item) {
    return <div className="py-24 text-center text-slate-500">{locale === "en" ? "Not found" : "未找到该成果"}</div>;
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="bg-slate-900 text-white py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Link href="/insights" className="text-sm text-slate-300 hover:text-white">{locale === "en" ? "← Back to Knowledge Hub" : "← Back to Knowledge Hub"}</Link>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mt-6 grid gap-8 md:grid-cols-[1fr_300px]">
            <div>
              <Badge className="mb-4 bg-emerald-600 text-white border-none">{item.type}</Badge>
              <h1 className="text-3xl md:text-4xl font-semibold leading-tight">{title}</h1>
              {subtitle && <p className="mt-3 text-slate-300">{subtitle}</p>}
              <div className="mt-4 text-sm text-slate-300 inline-flex items-center">
                <Calendar className="mr-1.5 h-4 w-4" />
                {formatDate(item.publishDate, locale)}
              </div>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
              {item.coverImage ? (
                <Image src={item.coverImage} alt={title || "cover"} fill className="object-cover" unoptimized />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-500"><FileText className="h-8 w-8" /></div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 grid gap-8 lg:grid-cols-[1fr_320px]">
        <main className="space-y-8">
          {summary && (
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">{locale === "en" ? "Summary" : "摘要"}</h2>
              <p className="text-slate-700 leading-7">{summary}</p>
            </section>
          )}

          {keyPoints.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">{locale === "en" ? "Key Insights" : "关键结论"}</h2>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                {keyPoints.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </section>
          )}

          {content && (
            <section id="insight-full-content">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">{locale === "en" ? "Content" : "正文"}</h2>
              <div className="prose prose-slate max-w-none whitespace-pre-wrap">{content}</div>
            </section>
          )}

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">{locale === "en" ? "Related" : "关联内容"}</h2>
            <div className="space-y-3 text-sm text-slate-700">
              <div>
                <div className="font-medium">{locale === "en" ? "Events" : "关联活动"}</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {item.events.map((e) => (
                    <Link key={e.event.id} href={`/events/${e.event.id}`} className="rounded-full border border-slate-200 bg-white px-3 py-1 hover:border-emerald-400">
                      {locale === "en" && e.event.titleEn ? e.event.titleEn : e.event.title}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-medium">{locale === "en" ? "Organizations" : "关联机构"}</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {item.institutions.map((i) => (
                    <Link key={i.institution.id} href={`/partners/${i.institution.slug}`} className="rounded-full border border-slate-200 bg-white px-3 py-1 hover:border-emerald-400">
                      {locale === "en" && i.institution.nameEn ? i.institution.nameEn : i.institution.name}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-medium">{locale === "en" ? "Speakers" : "关联嘉宾"}</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {item.speakers.map((s) => (
                    <span key={s.speaker.id} className="rounded-full border border-slate-200 bg-white px-3 py-1">
                      {locale === "en" && s.speaker.nameEn ? s.speaker.nameEn : s.speaker.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>

        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="font-semibold text-slate-900 mb-3">{locale === "en" ? "Download" : "下载"}</h3>
            {item.fileUrl && item.downloadEnabled ? (
              <div className="space-y-2">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={downloadOriginalFile}>
                  <Download className="mr-2 h-4 w-4" />
                  {locale === "en" ? "Download File" : "下载文件"}
                </Button>
                <a href={`/api/insights/${item.id}/export?format=pdf&download=true`} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    {locale === "en" ? "Download Formal PDF" : "下载正式PDF"}
                  </Button>
                </a>
                <Button variant="outline" className="w-full" onClick={showFullText}>
                  <FileText className="mr-2 h-4 w-4" />
                  {locale === "en" ? "Show Full Text" : "显示全文"}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                {item.accessNotice === "login_required"
                  ? locale === "en" ? "Login required to download." : "请登录后下载。"
                  : item.accessNotice === "paid_required"
                  ? locale === "en" ? "Payment required to download." : "需付费后下载。"
                  : locale === "en" ? "No downloadable file." : "暂无可下载文件。"}
              </p>
            )}
            {(item.fileFormat || item.fileSize) && (
              <p className="mt-2 text-xs text-slate-500">
                {item.fileFormat || ""}
                {item.fileSize ? ` · ${(item.fileSize / 1024 / 1024).toFixed(1)} MB` : ""}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="font-semibold text-slate-900 mb-3">{locale === "en" ? "Citation" : "引用"}</h3>
            <p className="text-sm text-slate-600 break-words">
              {locale === "en"
                ? `${title || "Knowledge Asset"}. Full text: ${buildFullTextLink()}`
                : `${title || "知识成果"}。全文链接：${buildFullTextLink()}`}
            </p>
            <Button
              variant="outline"
              className="mt-3 w-full"
              onClick={() => navigator.clipboard.writeText(buildFullTextLink())}
            >
              <Copy className="mr-2 h-4 w-4" />
              {locale === "en" ? "Copy Citation" : "复制引用"}
            </Button>
          </div>

          {item.fileUrl && (
            <a href={item.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm text-emerald-700 hover:underline">
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              {locale === "en" ? "Open Original File" : "打开原文件"}
            </a>
          )}
        </aside>
      </section>
    </div>
  );
}
