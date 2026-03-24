"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Search, Filter, Linkedin, Twitter, Globe, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { speakers, getSpeakerCategories, getSpeakersByCategory } from "@/lib/data/speakers";

export default function SpeakersPage() {
  const t = useTranslations("speakersPage");
  const locale = useLocale() as "zh" | "en";
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const categories = getSpeakerCategories(locale);

  let filteredSpeakers = getSpeakersByCategory(activeCategory, locale);
  
  if (searchQuery) {
    filteredSpeakers = filteredSpeakers.filter((speaker) => 
      speaker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (speaker.nameEn ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      speaker.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      speaker.topics.some((topic) => topic.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }

  const keynoteSpeakers = filteredSpeakers.filter((speaker) => speaker.isKeynote);
  const otherSpeakers = filteredSpeakers.filter((speaker) => !speaker.isKeynote);

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
              {t("hero.description", { count: speakers.length })}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search & Filter */}
      <section className="bg-white border-b border-slate-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* Category Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Filter className="w-5 h-5 text-slate-400 shrink-0" />
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

      {/* Keynote Speakers */}
      {keynoteSpeakers.length > 0 && (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
              <span className="w-2 h-8 bg-amber-500 rounded-full mr-3" />
              {t("keynoteTitle")}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {keynoteSpeakers.map((speaker, index) => (
                <SpeakerCard key={speaker.id} speaker={speaker} index={index} featured />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Speakers */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6">
            {t("allTitle", { count: filteredSpeakers.length })}
          </h2>
          {filteredSpeakers.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl">
              <p className="text-slate-500">{t("emptyState")}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherSpeakers.map((speaker, index) => (
                <SpeakerCard key={speaker.id} speaker={speaker} index={index} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

interface SpeakerCardProps {
  speaker: typeof speakers[0];
  index: number;
  featured?: boolean;
}

function SpeakerCard({ speaker, index, featured }: SpeakerCardProps) {
  const t = useTranslations("speakersPage");

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`bg-white rounded-2xl overflow-hidden border transition-all hover:shadow-lg ${
        featured ? "border-amber-200 shadow-md" : "border-slate-100"
      }`}
    >
      {/* Header */}
      <div className={`h-24 ${featured ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-gradient-to-r from-emerald-500 to-teal-500"}`} />
      
      {/* Content */}
      <div className="px-6 pb-6">
        {/* Avatar */}
        <div className="-mt-12 mb-4">
          <Avatar className="w-24 h-24 border-4 border-white shadow-md">
            <AvatarImage src={speaker.avatar} />
            <AvatarFallback className="bg-slate-100 text-slate-600 text-2xl">
              {speaker.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Info */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-slate-900">{speaker.name}</h3>
            {speaker.nameEn && (
              <span className="text-sm text-slate-400">{speaker.nameEn}</span>
            )}
          </div>
          <p className="text-emerald-600 font-medium">{speaker.title}</p>
          <p className="text-slate-500 text-sm">{speaker.organization}</p>
        </div>

        {/* Bio */}
        <p className="text-slate-600 text-sm mb-4 line-clamp-3">
          {speaker.bio}
        </p>

        {/* Topics */}
        <div className="flex flex-wrap gap-2 mb-4">
          {speaker.topics.slice(0, 3).map((topic) => (
            <Badge key={topic} variant="secondary" className="bg-slate-100 text-slate-600">
              {topic}
            </Badge>
          ))}
        </div>

        {/* Events */}
        {speaker.events && speaker.events.length > 0 && (
          <div className="flex items-center text-sm text-slate-500 mb-4">
            <Calendar className="w-4 h-4 mr-2" />
            <span>{t("eventCount", { count: speaker.events.length })}</span>
          </div>
        )}

        {/* Social */}
        <div className="flex gap-2">
          {speaker.social?.linkedin && (
            <Button variant="ghost" size="icon" className="w-8 h-8">
              <Linkedin className="w-4 h-4" />
            </Button>
          )}
          {speaker.social?.twitter && (
            <Button variant="ghost" size="icon" className="w-8 h-8">
              <Twitter className="w-4 h-4" />
            </Button>
          )}
          {speaker.social?.website && (
            <Button variant="ghost" size="icon" className="w-8 h-8">
              <Globe className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
