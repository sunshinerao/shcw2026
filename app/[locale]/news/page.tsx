"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Calendar, ArrowRight, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  isFeatured?: boolean;
}

export default function NewsPage() {
  const t = useTranslations("newsPage");
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const newsItems: NewsItem[] = [
    {
      id: "1",
      title: t("items.1.title"),
      excerpt: t("items.1.excerpt"),
      date: "2026-03-15",
      category: t("categories.announcement"),
      isFeatured: true,
    },
    {
      id: "2",
      title: t("items.2.title"),
      excerpt: t("items.2.excerpt"),
      date: "2026-03-10",
      category: t("categories.speaker"),
    },
    {
      id: "3",
      title: t("items.3.title"),
      excerpt: t("items.3.excerpt"),
      date: "2026-03-08",
      category: t("categories.partner"),
    },
    {
      id: "4",
      title: t("items.4.title"),
      excerpt: t("items.4.excerpt"),
      date: "2026-03-05",
      category: t("categories.signing"),
    },
    {
      id: "5",
      title: t("items.5.title"),
      excerpt: t("items.5.excerpt"),
      date: "2026-03-01",
      category: t("categories.announcement"),
    },
    {
      id: "6",
      title: t("items.6.title"),
      excerpt: t("items.6.excerpt"),
      date: "2026-02-28",
      category: t("categories.exhibitor"),
    },
  ];

  const categories = [
    { key: "all", label: t("categories.all") },
    { key: "announcement", label: t("categories.announcement") },
    { key: "speaker", label: t("categories.speaker") },
    { key: "partner", label: t("categories.partner") },
    { key: "signing", label: t("categories.signing") },
    { key: "exhibitor", label: t("categories.exhibitor") },
  ];

  let filteredNews = newsItems;
  
  if (activeCategory !== "all") {
    filteredNews = filteredNews.filter((item) => {
      const category = categories.find((entry) => entry.key === activeCategory);
      return item.category === category?.label;
    });
  }
  
  if (searchQuery) {
    filteredNews = filteredNews.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  const featuredNews = newsItems.find(item => item.isFeatured);
  const regularNews = filteredNews.filter(item => !item.isFeatured || activeCategory !== "全部");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="bg-slate-900 py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              {t("hero.title")}
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              {t("hero.subtitle")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search & Filter */}
      <section className="bg-white border-b border-slate-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Input
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    activeCategory === cat.key
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured News */}
      {featuredNews && activeCategory === "all" && !searchQuery && (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-white rounded-2xl overflow-hidden shadow-lg border border-slate-100"
            >
              <div className="grid lg:grid-cols-2">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 h-64 lg:h-auto flex items-center justify-center">
                  <span className="text-white text-lg font-medium">Featured Image</span>
                </div>
                <div className="p-8 lg:p-12">
                  <Badge className="bg-emerald-100 text-emerald-700 mb-4">
                    {featuredNews.category}
                  </Badge>
                  <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-4">
                    {featuredNews.title}
                  </h2>
                  <p className="text-slate-600 mb-6 line-clamp-3">
                    {featuredNews.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-slate-500">
                      <Calendar className="w-4 h-4 mr-2" />
                      {featuredNews.date}
                    </div>
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                      {t("readMore")}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* News List */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6">
            {activeCategory === "all"
              ? t("latest")
              : categories.find((category) => category.key === activeCategory)?.label}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularNews.map((news, index) => (
              <motion.article
                key={news.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-lg transition-shadow"
              >
                <div className="h-48 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                  <Tag className="w-8 h-8 text-slate-400" />
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="secondary" className="text-xs">
                      {news.category}
                    </Badge>
                    <span className="text-xs text-slate-500">{news.date}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 hover:text-emerald-600 transition-colors">
                    {news.title}
                  </h3>
                  <p className="text-slate-600 text-sm line-clamp-3 mb-4">
                    {news.excerpt}
                  </p>
                  <button className="text-emerald-600 text-sm font-medium inline-flex items-center hover:underline">
                    {t("readMore")}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
