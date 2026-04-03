"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Calendar, Eye } from "lucide-react";
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

export function NewsSection() {
  const t = useTranslations("newsSection");
  const locale = useLocale();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadNews() {
      try {
        const response = await fetch("/api/news?pageSize=3&published=true", {
          cache: "no-store",
        });
        const payload = await response.json();
        if (payload.success) {
          setNews(payload.data?.news ?? []);
        }
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    }
    loadNews();
  }, []);

  if (!isLoading && news.length === 0) return null;

  return (
    <section className="py-20 sm:py-28 bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            {t("title")}
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {news.map((item, index) => {
            const title = locale === "en" ? (item.titleEn || item.title) : item.title;
            const excerpt = locale === "en" ? (item.excerptEn || item.excerpt) : item.excerpt;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.15 }}
              >
                <Link href={`/news/${item.slug}`}>
                  <div className="group rounded-2xl overflow-hidden border border-slate-100 hover:shadow-lg transition-all duration-300 bg-white h-full flex flex-col">
                    {item.coverImage && (
                      <div className="aspect-video overflow-hidden relative">
                        <Image
                          src={item.coverImage}
                          alt={title}
                          fill
                          unoptimized
                          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <div className="p-6 flex flex-col flex-1">
                      <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors line-clamp-2">
                        {title}
                      </h3>
                      {excerpt && (
                        <p className="text-sm text-slate-500 line-clamp-3 mb-4 flex-1">
                          {excerpt}
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
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center mt-12"
        >
          <Link href="/news">
            <Button variant="outline" className="group border-slate-300 hover:border-emerald-600 hover:text-emerald-600">
              {t("viewAll")}
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
