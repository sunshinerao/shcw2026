"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Speaker = {
  id: string;
  name: string;
  nameEn?: string | null;
  avatar?: string | null;
  title?: string | null;
  titleEn?: string | null;
  organization?: string | null;
  organizationEn?: string | null;
  bio?: string | null;
  bioEn?: string | null;
  isKeynote: boolean;
};

export default function SpeakersPage() {
  const t = useTranslations("speakersPage");
  const locale = useLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/speakers?limit=100");
        const json = await res.json();
        if (json.success) {
          setSpeakers(json.data ?? []);
        }
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const filtered = searchQuery
    ? speakers.filter((s) => {
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          (s.nameEn ?? "").toLowerCase().includes(q) ||
          (s.organization ?? "").toLowerCase().includes(q) ||
          (s.organizationEn ?? "").toLowerCase().includes(q)
        );
      })
    : speakers;

  const keynoteSpeakers = filtered.filter((s) => s.isKeynote);
  const otherSpeakers = filtered.filter((s) => !s.isKeynote);
  const heroTitle = locale.startsWith("zh") ? "嘉宾" : "Speakers";

  function localize(zh?: string | null, en?: string | null) {
    return locale === "en" ? en || zh || "" : zh || "";
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="bg-slate-900 py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">{heroTitle}</h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">{t("hero.description", { count: speakers.length })}</p>
          </motion.div>
        </div>
      </section>

      {/* Search */}
      <section className="bg-white border-b border-slate-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input placeholder={t("searchPlaceholder")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
      ) : (
        <>
          {/* Keynote */}
          {keynoteSpeakers.length > 0 && (
            <section className="py-12">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                  <span className="w-2 h-8 bg-amber-500 rounded-full mr-3" />
                  {t("keynoteTitle")}
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {keynoteSpeakers.map((s, i) => (
                    <SpeakerCard key={s.id} speaker={s} index={i} featured localize={localize} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* All */}
          <section className="py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6">{t("allTitle", { count: filtered.length })}</h2>
              {filtered.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl"><p className="text-slate-500">{t("emptyState")}</p></div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {otherSpeakers.map((s, i) => (
                    <SpeakerCard key={s.id} speaker={s} index={i} localize={localize} />
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SpeakerCard({
  speaker,
  index,
  featured,
  localize,
}: {
  speaker: Speaker;
  index: number;
  featured?: boolean;
  localize: (zh?: string | null, en?: string | null) => string;
}) {
  const name = localize(speaker.name, speaker.nameEn);
  const title = localize(speaker.title, speaker.titleEn);
  const org = localize(speaker.organization, speaker.organizationEn);
  const bio = localize(speaker.bio, speaker.bioEn);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className={`bg-white rounded-2xl overflow-hidden border transition-all hover:shadow-lg ${featured ? "border-amber-200 shadow-md" : "border-slate-100"}`}
    >
      <div className={`h-24 ${featured ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-gradient-to-r from-emerald-500 to-teal-500"}`} />
      <div className="px-6 pb-6">
        <div className="-mt-12 mb-4">
          <Avatar className="w-24 h-24 border-4 border-white shadow-md">
            <AvatarImage src={speaker.avatar ?? undefined} />
            <AvatarFallback className="bg-slate-100 text-slate-600 text-2xl">{speaker.name.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>
        <div className="mb-4">
          <h3 className="text-xl font-bold text-slate-900">{name}</h3>
          {title && <p className="text-emerald-600 font-medium">{title}</p>}
          {org && <p className="text-slate-500 text-sm">{org}</p>}
        </div>
        {bio && <p className="text-slate-600 text-sm line-clamp-3">{bio}</p>}
      </div>
    </motion.div>
  );
}
