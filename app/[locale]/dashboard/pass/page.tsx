"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Download, Share2, QrCode, Ticket, CheckCircle, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { EVENT_PASS_QR_TTL_MS, getEventPassState, type EventPassState } from "@/lib/climate-passport";
import { toast } from "sonner";

interface PassData {
  id: string;
  eventId: string;
  eventTitle: string;
  eventTitleEn: string;
  eventDate: string;
  eventDateEn: string;
  eventTime: string;
  venue: string;
  venueEn: string;
  type: string;
  qrCodeSvg: string;
  checkedIn: boolean;
  pointsEarned: number;
  date: string;
  startTime: string;
  endTime: string;
  passState: EventPassState;
}

interface UserProfile {
  climatePassportId: string | null;
  points: number;
}

const badgeClasses: Record<EventPassState, string> = {
  active: "bg-emerald-500 text-white border-0",
  upcoming: "bg-amber-100 text-amber-700 border-0",
  checkedIn: "bg-green-500 text-white border-0",
  expired: "bg-slate-200 text-slate-700 border-0",
};

export default function PassPage() {
  const t = useTranslations("dashboardPassPage");
  const locale = useLocale();
  const [passes, setPasses] = useState<PassData[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedPassId, setSelectedPassId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [passportQrCode, setPassportQrCode] = useState<string | null>(null);

  const selectedPass = useMemo(
    () => passes.find((pass) => pass.id === selectedPassId) || passes[0] || null,
    [passes, selectedPassId]
  );

  const fetchPasses = useCallback(async () => {
    try {
      const [registrationResponse, profileResponse] = await Promise.all([
        fetch(`/api/user/registrations?locale=${locale}`),
        fetch(`/api/user/profile?locale=${locale}`),
      ]);
      const registrationData = await registrationResponse.json();
      const profileData = await profileResponse.json();

      if (profileData.success) {
        setUserProfile({
          climatePassportId: profileData.data.climatePassportId,
          points: profileData.data.points,
        });
      }

      if (registrationData.success) {
        const registrations = registrationData.data.registrations || [];
        const nextPasses = await Promise.all(
          registrations.map(async (registration: any) => {
            const event = registration.event;
            const eventDate = new Date(event.date);
            const passState = getEventPassState({
              date: event.date,
              startTime: event.startTime,
              endTime: event.endTime,
              checkedInAt: registration.checkedInAt,
            });

            let qrCodeSvg = "";
            if (passState === "active") {
              const qrResponse = await fetch(`/api/qrcode?type=event&eventId=${event.id}&locale=${locale}`);
              const qrData = await qrResponse.json();
              if (qrData.success) {
                qrCodeSvg = qrData.data.qrCode;
              }
            }

            return {
              id: registration.id,
              eventId: event.id,
              eventTitle: event.title,
              eventTitleEn: event.titleEn || event.title,
              eventDate: eventDate.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" }),
              eventDateEn: eventDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
              eventTime: `${event.startTime} - ${event.endTime}`,
              venue: event.venue,
              venueEn: event.venue,
              type: "STANDARD",
              qrCodeSvg,
              checkedIn: Boolean(registration.checkedInAt),
              pointsEarned: registration.pointsEarned,
              date: event.date,
              startTime: event.startTime,
              endTime: event.endTime,
              passState,
            } satisfies PassData;
          })
        );

        setPasses(nextPasses);
        setSelectedPassId((current) =>
          current && nextPasses.some((pass) => pass.id === current) ? current : nextPasses[0]?.id || null
        );
      }
    } catch {
      toast.error(t("messages.loadError"));
    } finally {
      setLoading(false);
    }
  }, [locale, t]);

  const fetchPassportQrCode = useCallback(async () => {
    try {
      const response = await fetch(`/api/qrcode?type=passport&locale=${locale}`);
      const data = await response.json();
      if (data.success) {
        setPassportQrCode(data.data.qrCode);
      }
    } catch (error) {
      console.error(t("messages.passportQrError"), error);
    }
  }, [locale, t]);

  useEffect(() => {
    fetchPasses();
    fetchPassportQrCode();
  }, [fetchPasses, fetchPassportQrCode]);

  useEffect(() => {
    if (!selectedPass || selectedPass.passState !== "active") {
      return;
    }

    const intervalId = window.setInterval(() => {
      fetchPasses();
    }, EVENT_PASS_QR_TTL_MS);

    return () => window.clearInterval(intervalId);
  }, [fetchPasses, selectedPass]);

  const refreshQrCode = async () => {
    setRefreshing(true);
    await fetchPasses();
    setRefreshing(false);
    toast.success(t("messages.qrRefreshed"));
  };

  const downloadPass = () => {
    toast.success(t("messages.passDownloaded"));
  };

  const sharePass = async () => {
    if (!selectedPass) {
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: t("share.title"),
          text: t("share.text", {
            eventTitle: locale === "en" ? selectedPass.eventTitleEn : selectedPass.eventTitle,
          }),
        });
      } catch {}
    } else {
      toast.info(t("messages.shareUnavailable"));
    }
  };

  const getPassBadgeLabel = (passState: EventPassState) => {
    if (passState === "checkedIn") return t("badges.checkedIn");
    if (passState === "upcoming") return t("badges.upcoming");
    if (passState === "expired") return t("badges.expired");
    return t("badges.active");
  };

  const getStatusText = (passState: EventPassState) => {
    if (passState === "checkedIn") {
      return {
        title: t("status.checkedInTitle"),
        description: t("status.checkedInDescription"),
        className: "bg-green-50 text-green-900 border-green-200",
      };
    }
    if (passState === "upcoming") {
      return {
        title: t("status.upcomingTitle"),
        description: t("status.upcomingDescription"),
        className: "bg-amber-50 text-amber-900 border-amber-200",
      };
    }
    if (passState === "expired") {
      return {
        title: t("status.expiredTitle"),
        description: t("status.expiredDescription"),
        className: "bg-slate-100 text-slate-700 border-slate-200",
      };
    }
    return {
      title: t("status.title"),
      description: t("status.description"),
      className: "bg-emerald-50 text-emerald-900 border-emerald-200",
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{t("title")}</h1>
        <p className="text-slate-600">{t("subtitle")}</p>

        {userProfile?.climatePassportId && (
          <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">{t("passport.label")}</p>
                <p className="text-xl font-bold text-emerald-900">{userProfile.climatePassportId}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-emerald-600 font-medium">{t("passport.points")}</p>
                <p className="text-2xl font-bold text-emerald-900">{userProfile.points}</p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {passportQrCode && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>{t("passportQr.title")}</span>
                <Badge variant="outline" className="text-emerald-600 border-emerald-200">{t("passportQr.badge")}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center">
                <div className="w-40 h-40 bg-white p-3 rounded-xl shadow-sm border-2 border-slate-100 [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: passportQrCode }} />
                <p className="text-xs text-slate-400 mt-2 text-center">{t("passportQr.description")}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {passes.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("selectEvent")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {passes.map((pass) => (
                  <button
                    key={pass.id}
                    onClick={() => setSelectedPassId(pass.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedPass?.id === pass.id ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {locale === "en" ? pass.eventTitleEn : pass.eventTitle}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {passes.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <Card className="p-8 text-center">
            <Ticket className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">{t("empty.title")}</h3>
            <p className="text-slate-500 mb-4">{t("empty.description")}</p>
            <Link href="/events">
              <Button className="bg-emerald-600 hover:bg-emerald-700">{t("empty.action")}</Button>
            </Link>
          </Card>
        </motion.div>
      )}

      {selectedPass && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Ticket className="w-8 h-8" />
                  <div>
                    <h2 className="text-xl font-bold">{t("brand")}</h2>
                    <p className="text-emerald-100">{locale === "en" ? selectedPass.eventTitleEn : selectedPass.eventTitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={badgeClasses[selectedPass.passState]}>{getPassBadgeLabel(selectedPass.passState)}</Badge>
                  <Badge className="bg-white/20 text-white border-0">
                    {selectedPass.type === "VIP" ? t("passTypes.vip") : t("passTypes.standard")}
                  </Badge>
                </div>
              </div>
            </div>

            <CardContent className="p-6">
              <div className="grid md:grid-cols-[0.95fr_1.05fr] gap-8 items-start">
                <div className="flex flex-col items-center">
                  <div className="bg-white p-4 rounded-2xl shadow-lg border-2 border-slate-100 relative">
                    {selectedPass.qrCodeSvg ? (
                      <div className="w-36 h-36 [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: selectedPass.qrCodeSvg }} />
                    ) : (
                      <div className="w-36 h-36 bg-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-400 px-4 text-center">
                        <QrCode className="w-12 h-12 mb-2" />
                        <p className="text-xs leading-5">{t("messages.inactiveQr")}</p>
                      </div>
                    )}
                    {selectedPass.passState === "active" && (
                      <button
                        onClick={refreshQrCode}
                        disabled={refreshing}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-4 text-center">{t("showQr")}</p>
                  <p className="text-xs text-slate-400 mt-1 text-center">{t("messages.qrRefreshWindow")}</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">{locale === "en" ? selectedPass.eventTitleEn : selectedPass.eventTitle}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center text-slate-600">
                        <span className="w-20 text-slate-400">{t("fields.date")}</span>
                        <span>{locale === "en" ? selectedPass.eventDateEn : selectedPass.eventDate}</span>
                      </div>
                      <div className="flex items-center text-slate-600">
                        <span className="w-20 text-slate-400">{t("fields.time")}</span>
                        <span>{selectedPass.eventTime}</span>
                      </div>
                      <div className="flex items-center text-slate-600">
                        <span className="w-20 text-slate-400">{t("fields.venue")}</span>
                        <span>{locale === "en" ? selectedPass.venueEn : selectedPass.venue}</span>
                      </div>
                      <div className="flex items-center text-slate-600">
                        <span className="w-20 text-slate-400">{t("fields.ticket")}</span>
                        <span className="font-mono">{selectedPass.id.slice(0, 12).toUpperCase()}</span>
                      </div>
                      {selectedPass.checkedIn && selectedPass.pointsEarned > 0 && (
                        <div className="flex items-center text-emerald-600">
                          <span className="w-20 text-emerald-500">{t("fields.pointsEarned")}</span>
                          <span className="font-bold">+{selectedPass.pointsEarned}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {(() => {
                    const status = getStatusText(selectedPass.passState);
                    return (
                      <div className={`flex items-center p-4 rounded-xl border ${status.className}`}>
                        <CheckCircle className="w-5 h-5 mr-3" />
                        <div>
                          <p className="font-medium">{status.title}</p>
                          <p className="text-sm opacity-90">{status.description}</p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                    <div className="flex items-start gap-3 text-sm text-slate-600">
                      <ShieldCheck className="w-4 h-4 mt-0.5 text-emerald-600" />
                      <span>{t("messages.antiShare")}</span>
                    </div>
                    <div className="flex gap-3">
                      <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={downloadPass}>
                        <Download className="w-4 h-4 mr-2" />
                        {t("actions.download")}
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={sharePass}>
                        <Share2 className="w-4 h-4 mr-2" />
                        {t("actions.share")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
        <Card>
          <CardHeader>
            <CardTitle>{t("instructions.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              {[0, 1, 2].map((index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-emerald-600 font-bold text-sm">{index + 1}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">{t(`instructions.items.${index}.title`)}</h4>
                    <p className="text-sm text-slate-500">{t(`instructions.items.${index}.description`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
