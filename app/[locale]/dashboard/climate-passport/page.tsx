"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Calendar, Loader2, QrCode, ShieldCheck, Sparkles, Star } from "lucide-react";
import { buildPassportAchievements, formatLearningHours, getEventDurationMinutes, type SupportedLocale } from "@/lib/climate-passport";
import { Link } from "@/i18n/routing";

interface ProfileResponse {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: string;
  points: number;
  climatePassportId?: string | null;
  createdAt: string;
}

interface RegistrationItem {
  checkedInAt?: string | null;
  event: {
    date: string;
    startTime: string;
    endTime: string;
  };
}

export default function ClimatePassportPage() {
  const t = useTranslations("dashboardPassportPage");
  const tLayout = useTranslations("dashboardLayout");
  const locale = useLocale() as SupportedLocale;
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [passportQrCode, setPassportQrCode] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchPassportData() {
      try {
        const [profileResponse, registrationResponse, qrResponse] = await Promise.all([
          fetch(`/api/user/profile?locale=${locale}`),
          fetch(`/api/user/registrations?locale=${locale}`),
          fetch(`/api/qrcode?type=passport&locale=${locale}`),
        ]);

        const profileData = await profileResponse.json();
        const registrationData = await registrationResponse.json();
        const qrData = await qrResponse.json();

        if (!active) {
          return;
        }

        if (profileData.success) {
          setProfile(profileData.data);
        }

        if (registrationData.success) {
          setRegistrations(registrationData.data.registrations || []);
          setWishlistCount((registrationData.data.wishlist || []).length);
        }

        if (qrData.success) {
          setPassportQrCode(qrData.data.qrCode);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchPassportData();
    return () => {
      active = false;
    };
  }, [locale]);

  const attendedCount = useMemo(
    () => registrations.filter((registration) => Boolean(registration.checkedInAt)).length,
    [registrations]
  );

  const learningMinutes = useMemo(
    () =>
      registrations
        .filter((registration) => Boolean(registration.checkedInAt))
        .reduce(
          (total, registration) =>
            total + getEventDurationMinutes(registration.event.date, registration.event.startTime, registration.event.endTime),
          0
        ),
    [registrations]
  );

  const achievements = useMemo(
    () =>
      buildPassportAchievements(
        {
          hasPassport: Boolean(profile?.climatePassportId),
          registeredCount: registrations.length,
          attendedCount,
          wishlistCount,
          points: profile?.points || 0,
          learningMinutes,
        },
        locale
      ),
    [attendedCount, learningMinutes, locale, profile?.climatePassportId, profile?.points, registrations.length, wishlistCount]
  );

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[420px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{t("title")}</h1>
        <p className="text-slate-600">{t("subtitle")}</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.05 }}>
        <Card className="overflow-hidden border-0 shadow-xl bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.12),_transparent_35%),linear-gradient(135deg,#0f172a,#065f46_60%,#052e16)] text-white">
          <CardContent className="p-0">
            <div className="grid lg:grid-cols-[1.6fr_1fr] gap-0">
              <div className="p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-white/10">
                <div className="flex items-start justify-between gap-6 mb-8">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-emerald-100/80 mb-3">{t("card.authority")}</p>
                    <h2 className="text-3xl font-semibold mb-2">{t("card.name")}</h2>
                    <p className="text-emerald-100/80 max-w-xl">{t("card.description")}</p>
                  </div>
                  <Badge className="bg-white/10 text-white border border-white/15 hover:bg-white/10">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                    {t("card.active")}
                  </Badge>
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                  <Avatar className="w-28 h-28 border-4 border-white/20 shadow-2xl">
                    <AvatarImage src={profile.avatar || undefined} />
                    <AvatarFallback className="bg-emerald-900 text-white text-3xl">{profile.name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-4">
                    <div>
                      <p className="text-3xl font-bold tracking-wide">{profile.climatePassportId || t("card.pendingId")}</p>
                      <p className="text-sm text-emerald-100/80 mt-2">{profile.name}</p>
                      <p className="text-sm text-emerald-100/70">{tLayout.has(`roles.${profile.role}`) ? tLayout(`roles.${profile.role}`) : profile.role}</p>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-3">
                      <div className="rounded-2xl bg-white/10 p-4 border border-white/10">
                        <p className="text-xs text-emerald-100/70 mb-1">{t("stats.points")}</p>
                        <p className="text-2xl font-bold">{profile.points}</p>
                      </div>
                      <div className="rounded-2xl bg-white/10 p-4 border border-white/10">
                        <p className="text-xs text-emerald-100/70 mb-1">{t("stats.attended")}</p>
                        <p className="text-2xl font-bold">{attendedCount}</p>
                      </div>
                      <div className="rounded-2xl bg-white/10 p-4 border border-white/10">
                        <p className="text-xs text-emerald-100/70 mb-1">{t("stats.learning")}</p>
                        <p className="text-2xl font-bold">{formatLearningHours(learningMinutes, locale)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-3 text-sm text-emerald-50/90">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 border border-white/10">
                    <Calendar className="w-4 h-4 mr-2" />
                    {t("card.issueDate", { date: new Date(profile.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "zh-CN") })}
                  </span>
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 border border-white/10">
                    <Award className="w-4 h-4 mr-2" />
                    {t("card.achievements", { count: achievements.filter((item) => item.unlocked).length })}
                  </span>
                </div>
              </div>

              <div className="p-8 lg:p-10 bg-black/10 backdrop-blur-sm">
                <div className="rounded-[28px] bg-white text-slate-900 p-6 shadow-2xl">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t("qr.label")}</p>
                      <h3 className="text-lg font-semibold">{t("qr.title")}</h3>
                    </div>
                    <Badge variant="outline" className="border-emerald-200 text-emerald-700">
                      <Sparkles className="w-3.5 h-3.5 mr-1" />
                      {t("qr.badge")}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-center rounded-3xl bg-slate-50 border border-slate-100 p-4 min-h-[220px]">
                    {passportQrCode ? (
                      <div className="w-44 h-44 [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: passportQrCode }} />
                    ) : (
                      <QrCode className="w-20 h-20 text-slate-300" />
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-4">{t("qr.description")}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle>{t("achievements.title")}</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`rounded-2xl border p-4 transition-colors ${achievement.unlocked ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${achievement.unlocked ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                      <Star className="w-4 h-4" />
                    </div>
                    <Badge variant="outline" className={achievement.unlocked ? "border-emerald-300 text-emerald-700" : "border-slate-300 text-slate-500"}>
                      {achievement.unlocked ? t("achievements.unlocked") : t("achievements.locked")}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">{achievement.title}</h4>
                  <p className="text-sm text-slate-500">{achievement.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.15 }}>
          <Card>
            <CardHeader>
              <CardTitle>{t("summary.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500 mb-1">{t("summary.registered")}</p>
                <p className="text-2xl font-bold text-slate-900">{registrations.length}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500 mb-1">{t("summary.saved")}</p>
                <p className="text-2xl font-bold text-slate-900">{wishlistCount}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500 mb-1">{t("summary.identity")}</p>
                <p className="text-sm font-semibold text-slate-900 break-all">{profile.email}</p>
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" asChild>
                <Link href="/dashboard/pass">{t("summary.viewEventPasses")}</Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}