"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

type Speaker = {
  id: string;
  name: string;
  nameEn?: string | null;
  title?: string | null;
  titleEn?: string | null;
  organization?: string | null;
  organizationEn?: string | null;
  avatar?: string | null;
  isKeynote: boolean;
};

export function SpeakersSection() {
  const t = useTranslations("speakersSection");
  const locale = useLocale();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [speakers, setSpeakers] = useState<Speaker[]>([]);

  useEffect(() => {
    async function loadSpeakers() {
      try {
        const response = await fetch(`/api/speakers?limit=8&isKeynote=true`, {
          cache: "no-store",
        });
        const payload = await response.json();
        if (payload.success) {
          setSpeakers(payload.data ?? []);
        }
      } catch {
        // silent
      }
    }
    loadSpeakers();
  }, []);

  if (speakers.length === 0) return null;

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

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {speakers.map((speaker, index) => {
            const name = locale === "en" ? (speaker.nameEn || speaker.name) : speaker.name;
            const title = locale === "en" ? (speaker.titleEn || speaker.title) : speaker.title;
            const org = locale === "en" ? (speaker.organizationEn || speaker.organization) : speaker.organization;
            return (
              <motion.div
                key={speaker.id}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center group"
              >
                <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden bg-slate-200 ring-4 ring-white shadow-lg group-hover:ring-emerald-100 transition-all">
                  {speaker.avatar ? (
                    <img
                      src={speaker.avatar}
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-12 h-12 text-slate-400" />
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900">{name}</h3>
                {title && <p className="text-sm text-emerald-600 font-medium">{title}</p>}
                {org && <p className="text-sm text-slate-500 mt-1">{org}</p>}
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center mt-12"
        >
          <Link href="/speakers">
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
