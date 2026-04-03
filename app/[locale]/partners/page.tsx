"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Building2, FileText, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

type Sponsor = {
  id: string;
  name: string;
  nameEn?: string | null;
  logo: string;
  website?: string | null;
  tier: string;
  order: number;
};

const tierOrder = ["platinum", "gold", "silver", "bronze", "partner"];

const tierColors: Record<string, string> = {
  platinum: "from-slate-700 to-slate-900",
  gold: "from-amber-500 to-amber-600",
  silver: "from-slate-400 to-slate-500",
  bronze: "from-orange-500 to-orange-600",
  partner: "from-emerald-600 to-emerald-700",
};

function isLocalImagePath(src: string) {
  return src.startsWith("/") || src.startsWith("./");
}

export default function PartnersPage() {
  const t = useTranslations("partnersPage");
  const locale = useLocale();
  const [sponsorsByTier, setSponsorsByTier] = useState<Record<string, Sponsor[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sponsors?isActive=true", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const grouped: Record<string, Sponsor[]> = {};
          for (const sponsor of data.data as Sponsor[]) {
            if (!grouped[sponsor.tier]) {
              grouped[sponsor.tier] = [];
            }
            grouped[sponsor.tier].push(sponsor);
          }
          setSponsorsByTier(grouped);
        }
      })
      .catch(() => {
        setSponsorsByTier({});
      })
      .finally(() => setLoading(false));
  }, []);

  const activeTiers = tierOrder.filter((tier) => sponsorsByTier[tier]?.length);

  const tierLabelKey: Record<string, string> = {
    platinum: "tiers.chief.name",
    gold: "tiers.partner.name",
    silver: "tiers.ecosystem.name",
    bronze: "tiers.ecosystem.name",
    partner: "tiers.media.name",
  };

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
              <Link href="/partners/cooperation-plans">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                  <FileText className="w-4 h-4 mr-2" />
                  {t("hero.download")}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
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

      {/* Partner Logos */}
      {!loading && activeTiers.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">{t("currentPartners")}</h2>
              <p className="text-slate-600">{t("currentPartnersSubtitle")}</p>
            </div>

            <div className="space-y-14">
              {activeTiers.map((tier, index) => (
                <motion.div
                  key={tier}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="text-center mb-6">
                    <span className={`inline-block px-5 py-1.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r ${tierColors[tier] || tierColors.partner}`}>
                      {t(tierLabelKey[tier] || "tiers.ecosystem.name")}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-6">
                    {sponsorsByTier[tier].map((sponsor) => {
                      const displayName = locale === "en" ? sponsor.nameEn || sponsor.name : sponsor.name;
                      const card = (
                        <div className="relative flex h-24 w-40 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
                          {sponsor.logo ? (
                            <Image
                              src={sponsor.logo}
                              alt={displayName}
                              fill
                              unoptimized={!isLocalImagePath(sponsor.logo)}
                              sizes="160px"
                              className="object-contain p-3"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-slate-400">
                              <Building2 className="h-5 w-5" />
                              <span className="text-center text-xs leading-tight">{displayName}</span>
                            </div>
                          )}
                        </div>
                      );

                      return sponsor.website ? (
                        <a key={sponsor.id} href={sponsor.website} target="_blank" rel="noopener noreferrer">
                          {card}
                        </a>
                      ) : (
                        <div key={sponsor.id}>{card}</div>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

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
