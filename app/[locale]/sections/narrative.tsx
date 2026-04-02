"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { RefreshCw, Target, Compass, HeartHandshake, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

const narratives = [
  {
    icon: RefreshCw,
    key: "system",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    icon: Target,
    key: "action",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  {
    icon: Compass,
    key: "momentum",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  {
    icon: HeartHandshake,
    key: "winwin",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
];

type SiteContent = {
  title: string | null;
  titleEn: string | null;
  subtitle: string | null;
  subtitleEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  extra?: Record<string, Record<string, string>> | null;
};

export function NarrativeSection() {
  const t = useTranslations();
  const locale = useLocale();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [content, setContent] = useState<Record<string, SiteContent | null>>({
    mission: null,
    highlights: null,
  });

  useEffect(() => {
    async function load() {
      try {
        const [missionRes, highlightsRes] = await Promise.all([
          fetch("/api/site-content?key=mission"),
          fetch("/api/site-content?key=highlights"),
        ]);
        const [missionJson, highlightsJson] = await Promise.all([missionRes.json(), highlightsRes.json()]);

        setContent({
          mission: missionJson.success && missionJson.data ? missionJson.data : null,
          highlights: highlightsJson.success && highlightsJson.data ? highlightsJson.data : null,
        });
      } catch {
        // fall back to i18n
      }
    }
    load();
  }, []);

  const title = content.mission
    ? (locale === "en" ? content.mission.titleEn || content.mission.title : content.mission.title) || t("mission.title")
    : t("mission.title");
  const subtitle = content.mission
    ? (locale === "en" ? content.mission.subtitleEn || content.mission.subtitle : content.mission.subtitle) || t("mission.subtitle")
    : t("mission.subtitle");
  const description = content.mission
    ? (locale === "en" ? content.mission.descriptionEn || content.mission.description : content.mission.description) || t("mission.description")
    : t("mission.description");

  function getHighlightField(itemKey: string, field: "title" | "description") {
    const source = content.highlights?.extra || content.mission?.extra;
    const item = source?.[itemKey];
    if (!item) return null;
    if (locale === "en") {
      return item[`${field}En`] || item[field] || null;
    }
    return item[field] || null;
  }

  return (
    <section className="py-20 sm:py-28 bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">
              {title}
            </h2>
            <p className="text-xl text-emerald-600 font-semibold mb-6">
              {subtitle}
            </p>
            <p className="text-slate-600 text-lg leading-relaxed mb-8">
              {description}
            </p>
            <Link href="/about">
              <Button 
                variant="outline" 
                className="group border-slate-300 text-slate-700 hover:border-emerald-600 hover:text-emerald-600"
              >
                {t("mission.learnMore")}
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>

          {/* Right Grid */}
          <div className="grid sm:grid-cols-2 gap-6">
            {narratives.map((item, index) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="p-6 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-lg transition-all duration-300 border border-slate-100"
              >
                <div className={`w-12 h-12 rounded-xl ${item.bgColor} flex items-center justify-center mb-4`}>
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  {getHighlightField(item.key, "title") || t(`mission.highlights.${item.key}.title`)}
                </h3>
                <p className="text-sm text-slate-500">
                  {getHighlightField(item.key, "description") || t(`mission.highlights.${item.key}.desc`)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
