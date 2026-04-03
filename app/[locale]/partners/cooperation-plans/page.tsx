"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

type CooperationPlan = {
  id: string;
  tierType: string;
  name: string;
  nameEn: string;
  description?: string | null;
  descriptionEn?: string | null;
  price?: string | null;
  features: string[];
  featuresEn: string[];
  order: number;
  isActive: boolean;
};

const tierGradients: Record<string, string> = {
  platinum: "from-slate-700 to-slate-900",
  gold: "from-amber-500 to-amber-600",
  silver: "from-slate-400 to-slate-500",
  bronze: "from-orange-500 to-orange-600",
  partner: "from-emerald-600 to-emerald-700",
};

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export default function CooperationPlansPage() {
  const t = useTranslations("partnersPage");
  const locale = useLocale();
  const [tiers, setTiers] = useState<CooperationPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cooperation-plans", { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        if (payload.success && Array.isArray(payload.data)) {
          const normalized = (payload.data as CooperationPlan[])
            .filter((tier) => tier.isActive)
            .map((tier) => ({
              ...tier,
              features: toStringArray(tier.features),
              featuresEn: toStringArray(tier.featuresEn),
            }))
            .sort((a, b) => a.order - b.order);
          setTiers(normalized);
        }
      })
      .catch(() => {
        setTiers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t("cooperationPlans.title")}</h1>
            <p className="mt-3 text-slate-600">{t("cooperationPlans.subtitle")}</p>
          </div>
          <Link href="/partners">
            <Button variant="outline" className="border-slate-300 bg-white">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("cooperationPlans.back")}
            </Button>
          </Link>
        </div>

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-slate-500">
            {t("cooperationPlans.loading")}
          </div>
        )}

        {!loading && tiers.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <h2 className="text-xl font-semibold text-slate-900">{t("cooperationPlans.emptyTitle")}</h2>
            <p className="mt-3 text-slate-600">{t("cooperationPlans.emptyDescription")}</p>
          </div>
        )}

        {!loading && tiers.length > 0 && (
          <div className="grid gap-8 lg:grid-cols-2">
            {tiers.map((tier, index) => {
              const localizedName = locale === "en" ? tier.nameEn : tier.name;
              const localizedDescription = locale === "en" ? tier.descriptionEn : tier.description;
              const localizedFeatures = locale === "en" ? tier.featuresEn : tier.features;
              return (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className={`bg-gradient-to-r ${tierGradients[tier.tierType] || tierGradients.partner} p-6 text-white`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold">{localizedName}</h2>
                        {locale !== "en" && tier.nameEn && (
                          <p className="mt-1 text-sm text-white/80">{tier.nameEn}</p>
                        )}
                      </div>
                      {tier.price && <p className="text-right text-2xl font-bold">{tier.price}</p>}
                    </div>
                    {localizedDescription && <p className="mt-4 text-sm text-white/90">{localizedDescription}</p>}
                  </div>

                  <div className="p-6">
                    <ul className="space-y-3">
                      {localizedFeatures.map((feature) => (
                        <li key={feature} className="flex items-start">
                          <Check className="mr-3 mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                          <span className="text-slate-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}