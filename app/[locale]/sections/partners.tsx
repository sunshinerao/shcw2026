"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

const sponsorNameEn: Record<string, string> = {
  "亚洲开发银行": "Asian Development Bank",
  "UNESCO东亚办事处": "UNESCO East Asia Office",
  "全球气候学院": "Global Climate Academy",
  "新开发银行": "New Development Bank",
  "查塔姆研究所": "Chatham House",
  "盒马鲜生": "Hema Fresh",
  "清华循环研究院": "Tsinghua Circular Economy Institute",
  "宁远研究院": "Ningyuan Institute",
};

const sponsors = {
  chief: [
    { name: "亚洲开发银行", logo: "/images/sponsors/adb.svg" },
    { name: "UNESCO东亚办事处", logo: "/images/sponsors/unesco.svg" },
  ],
  partner: [
    { name: "全球气候学院", logo: "/images/sponsors/gcc.svg" },
    { name: "新开发银行", logo: "/images/sponsors/ndb.svg" },
    { name: "WWF China", logo: "/images/sponsors/wwf.svg" },
    { name: "查塔姆研究所", logo: "/images/sponsors/chatham.svg" },
  ],
  ecosystem: [
    { name: "盒马鲜生", logo: "/images/sponsors/hema.svg" },
    { name: "Oatly", logo: "/images/sponsors/oatly.svg" },
    { name: "IPE", logo: "/images/sponsors/ipe.svg" },
    { name: "Chapter Zero", logo: "/images/sponsors/cz.svg" },
    { name: "清华循环研究院", logo: "/images/sponsors/tsinghua.svg" },
    { name: "宁远研究院", logo: "/images/sponsors/ningyuan.svg" },
  ],
};

const tierConfig = {
  chief: { color: "from-slate-700 to-slate-900" },
  partner: { color: "from-amber-500 to-amber-600" },
  ecosystem: { color: "from-slate-400 to-slate-500" },
};

function SponsorPlaceholder({ name }: { name: string }) {
  return (
    <div className="w-full h-16 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
      <div className="flex items-center space-x-2 text-slate-400">
        <Building2 className="w-5 h-5" />
        <span className="text-sm font-medium">{name}</span>
      </div>
    </div>
  );
}

export function PartnersSection() {
  const t = useTranslations();
  const locale = useLocale();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const tierLabels = {
    chief: t("partners.tiers.chief"),
    partner: t("partners.tiers.partner"),
    ecosystem: t("partners.tiers.ecosystem"),
  };

  const localizeSponsorName = (name: string) =>
    locale === "en" ? sponsorNameEn[name] ?? name : name;

  return (
    <section className="py-20 sm:py-28 bg-slate-50" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            {t("partners.title")}
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {t("partners.subtitle")}
          </p>
        </motion.div>

        {/* Sponsor Tiers */}
        <div className="space-y-12">
          {/* Chief */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="text-center mb-6">
              <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r ${tierConfig.chief.color}`}>
                {tierLabels.chief}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {sponsors.chief.map((sponsor) => (
                <SponsorPlaceholder key={sponsor.name} name={localizeSponsorName(sponsor.name)} />
              ))}
            </div>
          </motion.div>

          {/* Partner */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="text-center mb-6">
              <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r ${tierConfig.partner.color}`}>
                {tierLabels.partner}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {sponsors.partner.map((sponsor) => (
                <SponsorPlaceholder key={sponsor.name} name={localizeSponsorName(sponsor.name)} />
              ))}
            </div>
          </motion.div>

          {/* Ecosystem */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="text-center mb-6">
              <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r ${tierConfig.ecosystem.color}`}>
                {tierLabels.ecosystem}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {sponsors.ecosystem.map((sponsor) => (
                <div key={sponsor.name} className="h-12">
                  <div className="w-full h-full bg-slate-100 rounded border border-slate-200 flex items-center justify-center">
                    <span className="text-xs text-slate-500 font-medium text-center px-2">
                      {localizeSponsorName(sponsor.name)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-16"
        >
          <p className="text-slate-600 mb-6">
            {t("partners.ctaText")}
          </p>
          <Link href="/partners">
            <Button 
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {t("partners.cta")}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
