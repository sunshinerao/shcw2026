"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Calendar, Eye, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

type NewsDetail = {
  id: string;
  title: string;
  titleEn?: string | null;
  slug: string;
  excerpt?: string | null;
  excerptEn?: string | null;
  content: string;
  contentEn?: string | null;
  coverImage?: string | null;
  publishedAt?: string | null;
  views: number;
};

export default function NewsDetailPage() {
  const t = useTranslations("newsSection");
  const locale = useLocale();
  const params = useParams();
  const slug = params.slug as string;
  const [article, setArticle] = useState<NewsDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/news/${encodeURIComponent(slug)}`);
        const json = await res.json();
        if (json.success && json.data) {
          setArticle(json.data);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      }
      setLoading(false);
    }
    if (slug) load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-slate-500">{locale === "en" ? "Article not found." : "文章未找到。"}</p>
        <Link href="/news">
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />{locale === "en" ? "Back to News" : "返回新闻"}</Button>
        </Link>
      </div>
    );
  }

  const title = locale === "en" ? (article.titleEn || article.title) : article.title;
  const content = locale === "en" ? (article.contentEn || article.content) : article.content;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <section className="bg-gradient-to-br from-emerald-900 via-slate-900 to-emerald-950 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/news">
            <Button variant="ghost" className="text-white/70 hover:text-white mb-6 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />{locale === "en" ? "Back to News" : "返回新闻"}
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">{title}</h1>
          <div className="flex items-center gap-4 text-sm text-white/60">
            {article.publishedAt && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{new Date(article.publishedAt).toLocaleDateString(locale === "en" ? "en-US" : "zh-CN", { month: "long", day: "numeric", year: "numeric" })}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{article.views} {locale === "en" ? "views" : "阅读"}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Cover Image */}
      {article.coverImage && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
          <img src={article.coverImage} alt={title} className="w-full rounded-2xl shadow-lg object-cover max-h-96" />
        </div>
      )}

      {/* Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose prose-slate prose-lg max-w-none prose-headings:text-slate-900 prose-a:text-emerald-600">
          {content.split("\n").map((paragraph, i) => (
            paragraph.trim() ? <p key={i}>{paragraph}</p> : null
          ))}
        </div>
      </article>
    </div>
  );
}
