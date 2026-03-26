"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Building2,
  TrendingUp,
  Leaf,
  Globe,
  Users,
  Sparkles,
  TreePine,
  ArrowRight,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type TrackCategory = "institution" | "economy" | "foundation" | "accelerator";

type Track = {
  id: string;
  code: string;
  name: string;
  nameEn?: string | null;
  category: TrackCategory;
  description: string;
  descriptionEn?: string | null;
  partners: string[];
  partnersEn: string[];
  color: string;
  icon: string;
  eventCount: number;
};

const iconMap: Record<string, React.ElementType> = {
  Building2,
  TrendingUp,
  Leaf,
  Globe,
  Users,
  Sparkles,
  TreePine,
};

function TrackCard({ track, index }: { track: Track; index: number }) {
  const t = useTranslations();
  const locale = useLocale();
  const Icon = iconMap[track.icon] || Globe;
  const partnerNames = locale === "en" ? track.partnersEn ?? track.partners : track.partners;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-transparent hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${track.color}15` }}
        >
          <Icon className="w-6 h-6" style={{ color: track.color }} />
        </div>
        <span className="text-2xl font-bold opacity-20" style={{ color: track.color }}>
          {track.code}
        </span>
      </div>

      <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">
        {locale === "en" ? track.nameEn || track.name : track.name}
      </h3>
      <p className="text-sm text-slate-600 mb-4 line-clamp-2">
        {locale === "en" ? track.descriptionEn || track.description : track.description}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {partnerNames.slice(0, 2).map((partner) => (
          <span key={partner} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
            {partner}
          </span>
        ))}
        {partnerNames.length > 2 && (
          <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
            +{partnerNames.length - 2}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <span className="text-xs text-slate-400">{t("tracks.card.eventCount", { count: track.eventCount })}</span>
        <Link href={`/events?track=${track.id}`} className="flex items-center text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors group/link">
          {t("tracks.card.exploreMore")}
          <ChevronRight className="w-4 h-4 transition-transform group-hover/link:translate-x-0.5" />
        </Link>
      </div>
    </motion.div>
  );
}

export function TracksSection() {
  const t = useTranslations();
  const locale = useLocale();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeCategory, setActiveCategory] = useState<"all" | TrackCategory>("all");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadTracks() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/tracks?locale=${locale}`, { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || "Failed to load tracks");
        }

        if (!cancelled) {
          setTracks(payload.data || []);
        }
      } catch (error) {
        console.error("Load tracks failed:", error);
        if (!cancelled) {
          setTracks([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadTracks();

    return () => {
      cancelled = true;
    };
  }, [locale]);

  const categoryTabs: Array<{ key: "all" | TrackCategory; label: string }> = [
    { key: "all", label: t("tracks.tabs.all") },
    { key: "institution", label: t("tracks.tabs.institution") },
    { key: "economy", label: t("tracks.tabs.economy") },
    { key: "foundation", label: t("tracks.tabs.foundation") },
    { key: "accelerator", label: t("tracks.tabs.accelerator") },
  ];

  const filteredTracks = activeCategory === "all" ? tracks : tracks.filter((track) => track.category === activeCategory);

  if (!isLoading && tracks.length === 0) return null;

  return (
    <section id="tracks" className="pt-20 sm:pt-28 pb-12 sm:pb-16 bg-slate-50" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">{t("tracks.title")}</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">{t("tracks.subtitle")}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-2 mb-10"
        >
          {categoryTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveCategory(tab.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === tab.key
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        {isLoading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTracks.map((track, index) => (
              <TrackCard key={track.id} track={track} index={index} />
            ))}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-8"
        >
          <Link href="/events">
            <Button
              variant="outline"
              size="lg"
              className="group border-slate-300 text-slate-700 hover:border-emerald-600 hover:text-emerald-600"
            >
              {t("tracks.viewAll")}
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
