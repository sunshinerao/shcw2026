"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface StatItemProps {
  value: string;
  label: string;
  delay: number;
}

function StatItem({ value, label, delay }: StatItemProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    if (isInView) {
      const numValue = parseInt(value.replace(/\D/g, ""));
      const suffix = value.replace(/\d/g, "");
      let start = 0;
      const duration = 2000;
      const step = numValue / (duration / 16);
      
      const timer = setInterval(() => {
        start += step;
        if (start >= numValue) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(start) + suffix);
        }
      }, 16);

      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      className="text-center"
    >
      <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-emerald-700 mb-2">
        {displayValue}
      </div>
      <div className="text-slate-600 text-sm sm:text-base font-medium">{label}</div>
    </motion.div>
  );
}

export function StatsSection() {
  const t = useTranslations();
  const [statsData, setStatsData] = useState({ eventDays: 0, forums: 0, keynoteSpeakers: 0, attendees: 200000 });

  useEffect(() => {
    fetch("/api/stats/homepage")
      .then((res) => res.json())
      .then((data) => setStatsData(data))
      .catch(() => {});
  }, []);

  const stats = [
    { value: statsData.eventDays > 0 ? `${statsData.eventDays}+` : "0", label: t("stats.days") },
    { value: statsData.forums > 0 ? `${statsData.forums}+` : "0", label: t("stats.forums") },
    { value: statsData.keynoteSpeakers > 0 ? `${statsData.keynoteSpeakers}+` : "0", label: t("stats.speakers") },
    { value: `${statsData.attendees}+`, label: t("stats.attendees") },
  ];

  return (
    <section className="py-16 sm:py-20 bg-emerald-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, index) => (
            <StatItem
              key={stat.label}
              value={stat.value}
              label={stat.label}
              delay={index * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
