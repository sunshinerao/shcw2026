"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Check, ArrowRight, Building2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

export default function PartnersPage() {
  const t = useTranslations("partnersPage");

  const sponsorTiers = [
    {
      name: t("tiers.chief.name"),
      nameEn: t("tiers.chief.nameEn"),
      price: "¥300,000-500,000",
      color: "from-slate-700 to-slate-900",
      bgColor: "bg-slate-50",
      borderColor: "border-slate-200",
      features: [
        t("tiers.chief.features.0"),
        t("tiers.chief.features.1"),
        t("tiers.chief.features.2"),
        t("tiers.chief.features.3"),
        t("tiers.chief.features.4"),
        t("tiers.chief.features.5"),
        t("tiers.chief.features.6"),
      ],
      sponsors: [t("tiers.chief.sponsors.0"), t("tiers.chief.sponsors.1")],
    },
    {
      name: t("tiers.partner.name"),
      nameEn: t("tiers.partner.nameEn"),
      price: "¥50,000-200,000",
      color: "from-amber-500 to-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      features: [
        t("tiers.partner.features.0"),
        t("tiers.partner.features.1"),
        t("tiers.partner.features.2"),
        t("tiers.partner.features.3"),
        t("tiers.partner.features.4"),
        t("tiers.partner.features.5"),
        t("tiers.partner.features.6"),
      ],
      sponsors: [
        t("tiers.partner.sponsors.0"),
        t("tiers.partner.sponsors.1"),
        t("tiers.partner.sponsors.2"),
        t("tiers.partner.sponsors.3"),
      ],
    },
    {
      name: t("tiers.ecosystem.name"),
      nameEn: t("tiers.ecosystem.nameEn"),
      price: "¥30,000-50,000",
      color: "from-slate-400 to-slate-500",
      bgColor: "bg-slate-50",
      borderColor: "border-slate-200",
      features: [
        t("tiers.ecosystem.features.0"),
        t("tiers.ecosystem.features.1"),
        t("tiers.ecosystem.features.2"),
        t("tiers.ecosystem.features.3"),
        t("tiers.ecosystem.features.4"),
        t("tiers.ecosystem.features.5"),
      ],
      sponsors: [
        t("tiers.ecosystem.sponsors.0"),
        t("tiers.ecosystem.sponsors.1"),
        t("tiers.ecosystem.sponsors.2"),
        t("tiers.ecosystem.sponsors.3"),
      ],
    },
    {
      name: t("tiers.media.name"),
      nameEn: t("tiers.media.nameEn"),
      price: t("tiers.media.price"),
      color: "from-emerald-600 to-emerald-700",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      features: [
        t("tiers.media.features.0"),
        t("tiers.media.features.1"),
        t("tiers.media.features.2"),
        t("tiers.media.features.3"),
        t("tiers.media.features.4"),
      ],
      sponsors: [t("tiers.media.sponsors.0"), t("tiers.media.sponsors.1"), t("tiers.media.sponsors.2")],
    },
  ];

  const partnerTypes = [
    {
      title: t("partnerTypes.forum.title"),
      description: t("partnerTypes.forum.description"),
      icon: "🎤",
    },
    {
      title: t("partnerTypes.knowledge.title"),
      description: t("partnerTypes.knowledge.description"),
      icon: "📚",
    },
    {
      title: t("partnerTypes.community.title"),
      description: t("partnerTypes.community.description"),
      icon: "🌱",
    },
    {
      title: t("partnerTypes.showcase.title"),
      description: t("partnerTypes.showcase.description"),
      icon: "🏆",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="bg-slate-900 py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
              {t("hero.title")}
            </h1>
            <p className="text-lg text-slate-400 mb-8">
              {t("hero.description")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                {t("hero.download")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Link href="/contact">
                <Button size="lg" className="bg-white text-emerald-600 hover:bg-emerald-50 font-semibold">
                  <Mail className="w-4 h-4 mr-2" />
                  {t("hero.contact")}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Sponsor Tiers */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">{t("tiersTitle")}</h2>
              <p className="text-slate-600">{t("tiersSubtitle")}</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {sponsorTiers.map((tier, index) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`rounded-2xl overflow-hidden border ${tier.borderColor} ${tier.bgColor}`}
              >
                {/* Header */}
                <div className={`bg-gradient-to-r ${tier.color} p-6 text-white`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold">{tier.name}</h3>
                      <p className="text-white/80 text-sm">{tier.nameEn}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold">{tier.price}</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Features */}
                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <Check className="w-5 h-5 text-emerald-600 mr-3 mt-0.5 shrink-0" />
                        <span className="text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Current Sponsors */}
                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-sm text-slate-500 mb-3">{t("currentPartners")}</p>
                    <div className="flex flex-wrap gap-2">
                      {tier.sponsors.map((sponsor) => (
                        <div
                          key={sponsor}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200"
                        >
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-600">{sponsor}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Partner Types */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">{t("otherWaysTitle")}</h2>
              <p className="text-slate-600">{t("otherWaysSubtitle")}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {partnerTypes.map((type, index) => (
              <motion.div
                key={type.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:border-emerald-200 hover:shadow-lg transition-all"
              >
                <div className="text-4xl mb-4">{type.icon}</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{type.title}</h3>
                <p className="text-slate-600 text-sm">{type.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-emerald-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            {t("cta.title")}
          </h2>
          <p className="text-emerald-100 text-lg mb-8">
            {t("cta.description")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-emerald-600 hover:bg-emerald-50">
              <Mail className="w-4 h-4 mr-2" />
              partners@shanghaiclimateweek.org.cn
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
