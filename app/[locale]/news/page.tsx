"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Calendar, Eye, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

type NewsItem = {
  id: string;
  title: string;
  titleEn?: string | null;
  slug: string;
  excerpt?: string | null;
  excerptEn?: string | null;
  coverImage?: string | null;
  publishedAt?: string | null;
  views: number;
};

export default function NewsPage() {
  const t = useTranslations("newsSection");
  const locale = useLocale();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/news?page=${page}&pageSize=9&published=true`);
        const json = await res.json();
        if (json.success) {
          setNews(json.data?.news ?? []);
          setTotalPages(json.data?.pagination?.totalPages ?? 1);
        }
      } catch { /* silent */ }
      setLoading(false);
    }
    load();
  }, [page]);

  function loc(item: NewsItem, field: "title" | "excerpt") {
    const en = field === "title" ? item.titleEn : item.excerptEn;
    const zh = field === "title" ? item.title : item.excerpt;
    return locale === "en" ? en || zh : zh;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-emerald-900 via-slate-900 to-emerald-950 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">{t("title")}</h1>
            <p className="text-white/70 mt-2">{t("subtitle")}</p>
          </motion.div>
        </div>
      </section>

      {/* News Grid */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : news.length === 0 ? (
            <p className="text-center text-slate-500 py-20">
              {locale === "en" ? "No news yet." : "暂无新闻。"}
            </p>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {news.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.08 }}
                  >
                    <Link href={`/news/${item.slug}`}>
                      <div className="group rounded-2xl overflow-hidden border border-slate-100 hover:shadow-lg transition-all duration-300 bg-white h-full flex flex-col">
                        {item.coverImage ? (
                          <div className="aspect-video overflow-hidden">
                            <img
                              src={item.coverImage}
                              alt={loc(item, "title") || ""}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          </div>
                        ) : (
                          <div className="aspect-video bg-gradient-to-br from-emerald-50 to-slate-100 flex items-center justify-center">
                            <span className="text-3xl">📰</span>
                          </div>
                        )}
                        <div className="p-6 flex flex-col flex-1">
                          <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors line-clamp-2">
                            {loc(item, "title")}
                          </h3>
                          {loc(item, "excerpt") && (
                            <p className="text-sm text-slate-500 line-clamp-3 mb-4 flex-1">
                              {loc(item, "excerpt")}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-xs text-slate-400 mt-auto">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>
                                {item.publishedAt
                                  ? new Date(item.publishedAt).toLocaleDateString(
                                      locale === "en" ? "en-US" : "zh-CN",
                                      { month: "short", day: "numeric", year: "numeric" }
                                    )
                                  : ""}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              <span>{item.views}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-12">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    {locale === "en" ? "Previous" : "上一页"}
                  </Button>
                  <span className="flex items-center px-4 text-sm text-slate-500">{page} / {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    {locale === "en" ? "Next" : "下一页"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
