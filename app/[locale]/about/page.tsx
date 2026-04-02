"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Target, Globe, Users, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

type SiteContent = {
  key: string;
  title: string | null;
  titleEn: string | null;
  subtitle: string | null;
  subtitleEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  extra: Record<string, Record<string, string>> | null;
};

export default function AboutPage() {
  const t = useTranslations("aboutPage");
  const locale = useLocale();
  const [contents, setContents] = useState<Record<string, SiteContent>>({});

  useEffect(() => {
    const keys = ["about_us", "mission", "highlights", "timeline", "team"];
    keys.forEach(async (key) => {
      try {
        const res = await fetch(`/api/site-content?key=${key}`);
        const json = await res.json();
        if (json.success && json.data) {
          setContents((prev) => ({ ...prev, [key]: json.data }));
        }
      } catch { /* use i18n fallback */ }
    });
  }, []);

  /** Read a top-level field from a content block, with locale awareness. */
  function loc(c: SiteContent | undefined, field: "title" | "subtitle" | "description"): string | null {
    if (!c) return null;
    const en = c[`${field}En` as keyof SiteContent] as string | null;
    const zh = c[field] as string | null;
    return locale === "en" ? en || zh : zh;
  }

  /** Read a nested extra field from a content block. */
  function ext(c: SiteContent | undefined, itemKey: string, field: string): string | null {
    const extra = c?.extra;
    if (!extra?.[itemKey]) return null;
    const item = extra[itemKey];
    return locale === "en" ? item[`${field}En`] || item[field] : item[field];
  }

  const highlightKeys = ["system", "action", "momentum", "winwin"] as const;
  const highlightIcons = [Target, Zap, Globe, Users];

  const highlights = highlightKeys.map((key, i) => ({
    icon: highlightIcons[i],
    title: ext(contents.highlights || contents.mission, key, "title") || t(`highlights.${key}.title`),
    description: ext(contents.highlights || contents.mission, key, "description") || t(`highlights.${key}.description`),
  }));

  const timeline = ["2024", "2025", "2026"].map((year) => ({
    year,
    title: ext(contents.timeline, year, "title") || t(`timeline.${year}.title`),
    description: ext(contents.timeline, year, "description") || t(`timeline.${year}.description`),
  }));

  const teamKeys = ["chair", "viceChair", "secretaryGeneral"] as const;
  const team = teamKeys.map((key) => ({
    name: ext(contents.team, key, "name") || t(`team.${key}.name`),
    role: ext(contents.team, key, "role") || t(`team.${key}.role`),
    bio: ext(contents.team, key, "bio") || t(`team.${key}.bio`),
  }));

  const missionVisible = ext(contents.mission, "_meta", "visible") !== "false";
  const highlightsVisible = ext(contents.highlights, "_meta", "visible") !== "false";
  const timelineVisible = ext(contents.timeline, "_meta", "visible") !== "false";
  const teamVisible = ext(contents.team, "_meta", "visible") !== "false";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="relative bg-slate-900 py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/50 via-slate-900 to-slate-900" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              {t("hero.title")}
            </h1>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              {t("hero.description")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission */}
      {(missionVisible || highlightsVisible) && (
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {missionVisible && (
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
                <h2 className="text-3xl font-bold text-slate-900 mb-6">{loc(contents.mission, "title") || t("mission.title")}</h2>
              <p className="text-lg text-emerald-600 font-semibold mb-4">
                  {loc(contents.mission, "subtitle") || t("mission.tagline")}
              </p>
              <p className="text-slate-600 leading-relaxed mb-6">
                  {loc(contents.mission, "description") || t("mission.description")}
              </p>
              <div className="flex gap-4">
                <Link href="/events">
                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                      {t("mission.exploreEvents")}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/partners">
                  <Button variant="outline">
                      {t("mission.becomePartner")}
                  </Button>
                </Link>
              </div>
            </motion.div>
            )}
            {highlightsVisible && (
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-2 gap-4"
            >
              {highlights.map((item, index) => (
                <div
                  key={item.title}
                  className="bg-white rounded-2xl p-6 border border-slate-100 hover:shadow-lg transition-shadow"
                >
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600">{item.description}</p>
                </div>
              ))}
            </motion.div>
            )}
          </div>
        </div>
      </section>
      )}

      {/* Timeline */}
      {timelineVisible && (
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">{loc(contents.timeline, "title") || t("timelineTitle")}</h2>
              <p className="text-slate-600">{loc(contents.timeline, "subtitle") || t("timelineSubtitle")}</p>
          </div>
          <div className="max-w-3xl mx-auto">
            {timeline.map((item, index) => (
              <motion.div
                key={item.year}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex gap-8 mb-12 last:mb-0"
              >
                <div className="w-24 shrink-0 text-right">
                  <span className="text-2xl font-bold text-emerald-600">{item.year}</span>
                </div>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200 -translate-x-4" />
                  <div className="absolute left-0 top-2 w-3 h-3 bg-emerald-600 rounded-full -translate-x-[19px]" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-slate-600">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Team */}
      {teamVisible && (
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">{loc(contents.team, "title") || t("teamTitle")}</h2>
              <p className="text-slate-600">{loc(contents.team, "subtitle") || t("teamSubtitle")}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {team.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 text-center border border-slate-100"
              >
                <div className="w-20 h-20 bg-emerald-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl font-bold text-emerald-600">
                    {member.name.charAt(0)}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-lg">{member.name}</h3>
                <p className="text-emerald-600 font-medium">{member.role}</p>
                <p className="text-slate-500 text-sm mt-2">{member.bio}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* CTA */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            {t("cta.title")}
          </h2>
          <p className="text-slate-400 text-lg mb-8">
            {t("cta.description")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                {t("cta.register")}
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" className="bg-white text-emerald-900 hover:bg-emerald-50">
                {t("cta.contact")}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
