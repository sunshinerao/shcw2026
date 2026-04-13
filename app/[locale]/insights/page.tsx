"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocale } from "next-intl";
import { Calendar, FileText, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

type Insight = {
  id: string;
  slug: string;
  title: string;
  titleEn?: string | null;
  subtitle?: string | null;
  subtitleEn?: string | null;
  summary?: string | null;
  summaryEn?: string | null;
  type: string;
  coverImage?: string | null;
  publishDate?: string | null;
  accessType: string;
  fileFormat?: string | null;
  isFeatured: boolean;
  isHighlight: boolean;
};

const typeOptions = [
  "ALL",
  "WHITE_PAPER",
  "REPORT",
  "INITIATIVE",
  "POLICY_BRIEF",
  "GUIDE",
  "DECLARATION",
  "SUMMARY",
];

function formatDate(dateStr: string | null | undefined, locale: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString(locale === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function labelType(type: string, locale: string) {
  const map: Record<string, { zh: string; en: string }> = {
    WHITE_PAPER: { zh: "白皮书", en: "White Paper" },
    REPORT: { zh: "报告", en: "Report" },
    INITIATIVE: { zh: "倡议", en: "Initiative" },
    POLICY_BRIEF: { zh: "政策简报", en: "Policy Brief" },
    GUIDE: { zh: "指南", en: "Guide" },
    DECLARATION: { zh: "宣言", en: "Declaration" },
    SUMMARY: { zh: "会议成果", en: "Summary" },
  };
  return locale === "en" ? map[type]?.en || type : map[type]?.zh || type;
}

export default function InsightsPage() {
  const locale = useLocale();
  const [items, setItems] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ALL");
  const [freeOnly, setFreeOnly] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("pageSize", "48");
    if (type !== "ALL") params.set("type", type);
    if (freeOnly) params.set("freeOnly", "true");

    setLoading(true);
    fetch(`/api/public/insights?${params.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setItems(json.data?.items ?? []);
        }
      })
      .finally(() => setLoading(false));
  }, [type, freeOnly]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.title, item.titleEn, item.summary, item.summaryEn]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q))
    );
  }, [items, query]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <section className="relative overflow-hidden border-b border-slate-800 bg-[radial-gradient(circle_at_top,#1f2f4f_0%,#020617_60%)] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-semibold tracking-tight"
          >
            Knowledge Hub
          </motion.h1>
          <p className="mt-4 max-w-3xl text-slate-300">
            {locale === "en"
              ? "A verifiable library of climate action outputs: reports, white papers, initiatives, and practical insights."
              : "全球气候行动的可验证知识资产库：白皮书、报告、倡议与实践洞察。"}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              className="pl-9 bg-slate-900 border-slate-700"
              placeholder={locale === "en" ? "Search insights..." : "搜索成果..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {typeOptions.map((option) => (
              <Button
                key={option}
                size="sm"
                variant={type === option ? "default" : "outline"}
                className={type === option ? "bg-emerald-600 hover:bg-emerald-700" : "border-slate-700 text-slate-300"}
                onClick={() => setType(option)}
              >
                {option === "ALL" ? (locale === "en" ? "All" : "全部") : labelType(option, locale)}
              </Button>
            ))}
          </div>
          <Button
            size="sm"
            variant={freeOnly ? "default" : "outline"}
            className={freeOnly ? "bg-sky-600 hover:bg-sky-700" : "border-slate-700 text-slate-300"}
            onClick={() => setFreeOnly((v) => !v)}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            {locale === "en" ? "Free/Preview" : "免费/可预览"}
          </Button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400">{locale === "en" ? "Loading..." : "加载中..."}</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-400">{locale === "en" ? "No insights found." : "暂无成果。"}</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item, index) => {
              const title = locale === "en" && item.titleEn ? item.titleEn : item.title;
              const summary = locale === "en" && item.summaryEn ? item.summaryEn : item.summary;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.03 }}
                >
                  <Link href={`/insights/${item.slug}`}>
                    <article className="h-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 hover:border-emerald-500/50 transition-colors">
                      <div className="relative aspect-[16/9] bg-slate-800">
                        {item.coverImage ? (
                          <Image src={item.coverImage} alt={title} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-500">
                            <FileText className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-3 p-5">
                        <div className="flex items-center justify-between gap-2">
                          <Badge className="bg-slate-800 text-slate-200 border border-slate-700">{labelType(item.type, locale)}</Badge>
                          {item.publishDate && (
                            <span className="inline-flex items-center text-xs text-slate-400">
                              <Calendar className="mr-1 h-3.5 w-3.5" />
                              {formatDate(item.publishDate, locale)}
                            </span>
                          )}
                        </div>
                        <h3 className="line-clamp-2 text-lg font-semibold text-slate-100">{title}</h3>
                        {summary && <p className="line-clamp-3 text-sm text-slate-400">{summary}</p>}
                        <div className="pt-1 text-xs text-slate-400">
                          {item.accessType === "PUBLIC"
                            ? locale === "en" ? "Public" : "公开"
                            : item.accessType === "LOGIN_REQUIRED"
                            ? locale === "en" ? "Login required for download" : "登录后下载"
                            : item.accessType === "PAID"
                            ? locale === "en" ? "Paid" : "付费"
                            : locale === "en" ? "Restricted" : "受限"}
                        </div>
                      </div>
                    </article>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
