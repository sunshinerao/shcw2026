"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";

interface Sponsor {
  id: string;
  name: string;
  nameEn?: string;
  logo: string;
  website?: string;
  tier: string;
  order: number;
}

const tierConfig: Record<string, { color: string }> = {
  platinum: { color: "from-purple-600 to-purple-800" },
  gold: { color: "from-amber-500 to-amber-600" },
  silver: { color: "from-slate-400 to-slate-500" },
  bronze: { color: "from-orange-500 to-orange-600" },
  partner: { color: "from-emerald-500 to-emerald-600" },
};

// Map tier to i18n key
const tierI18nKey: Record<string, string> = {
  platinum: "partners.tiers.chief",
  gold: "partners.tiers.partner",
  silver: "partners.tiers.ecosystem",
  bronze: "partners.tiers.ecosystem",
  partner: "partners.tiers.ecosystem",
};

// Grid config per tier
const tierGridClass: Record<string, string> = {
  platinum: "grid-cols-2 md:grid-cols-4 max-w-3xl mx-auto gap-6",
  gold: "grid-cols-2 md:grid-cols-4 max-w-4xl mx-auto gap-4",
  silver: "grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3",
  bronze: "grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3",
  partner: "grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3",
};

function isLocalImagePath(src: string) {
  return src.startsWith("/");
}

function SponsorCard({ sponsor, locale, isSmallTier }: { sponsor: Sponsor; locale: string; isSmallTier: boolean }) {
  const displayName = locale === "en" ? (sponsor.nameEn || sponsor.name) : sponsor.name;
  const hasLogo = sponsor.logo && sponsor.logo !== "";

  const content = (
    <div className={`w-full ${isSmallTier ? "h-12" : "h-16"} flex items-center justify-center transition-all overflow-hidden relative`}>
      {hasLogo ? (
        isLocalImagePath(sponsor.logo) ? (
          <Image
            src={sponsor.logo}
            alt={displayName}
            fill
            sizes={isSmallTier ? "120px" : "200px"}
            className="object-contain p-2"
          />
        ) : (
          <Image
            src={sponsor.logo}
            alt={displayName}
            fill
            unoptimized
            sizes={isSmallTier ? "120px" : "200px"}
            className="w-full h-full object-contain p-2"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
            }}
          />
        )
      ) : null}
      <div className={`flex items-center space-x-2 text-slate-400 ${hasLogo && !isLocalImagePath(sponsor.logo) ? "hidden" : hasLogo ? "hidden" : ""}`}>
        <Building2 className="w-5 h-5 flex-shrink-0" />
        <span className={`${isSmallTier ? "text-xs" : "text-sm"} font-medium text-center`}>{displayName}</span>
      </div>
    </div>
  );

  if (sponsor.website) {
    return (
      <a href={sponsor.website} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }
  return content;
}

export function PartnersSection() {
  const t = useTranslations();
  const locale = useLocale();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [sponsorsByTier, setSponsorsByTier] = useState<Record<string, Sponsor[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sponsors?isActive=true&showOnHomepage=true")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const grouped: Record<string, Sponsor[]> = {};
          for (const s of data.data as Sponsor[]) {
            if (!grouped[s.tier]) grouped[s.tier] = [];
            grouped[s.tier].push(s);
          }
          setSponsorsByTier(grouped);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Tier display order
  const tierOrder = ["platinum", "gold", "silver", "bronze", "partner"];
  const activeTiers = tierOrder.filter((t) => sponsorsByTier[t]?.length);

  const tierLabels: Record<string, string> = {
    platinum: t("partners.tiers.chief"),
    gold: t("partners.tiers.partner"),
    silver: t("partners.tiers.ecosystem"),
    bronze: t("partners.tiers.ecosystem"),
    partner: t("partners.tiers.ecosystem"),
  };

  if (!loading && activeTiers.length === 0) {
    return null;
  }

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
          {activeTiers.map((tier, i) => {
            const isSmallTier = tier === "silver" || tier === "bronze" || tier === "partner";
            return (
              <motion.div
                key={tier}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.1 * (i + 1) }}
              >
                <div className="text-center mb-6">
                  <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r ${tierConfig[tier]?.color || tierConfig.partner.color}`}>
                    {tierLabels[tier]}
                  </span>
                </div>
                <div className={`grid ${tierGridClass[tier] || tierGridClass.partner}`}>
                  {sponsorsByTier[tier].map((sponsor) => (
                    <SponsorCard key={sponsor.id} sponsor={sponsor} locale={locale} isSmallTier={isSmallTier} />
                  ))}
                </div>
              </motion.div>
            );
          })}
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
