"use client";

import Image from "next/image";
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import QRCode from "qrcode";
import { Download, Share2, QrCode, Ticket, CheckCircle, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "@/i18n/routing";
import { EVENT_PASS_ENTRY_WINDOW_MS, combineEventDateTime, getEventPassState, type EventPassState } from "@/lib/climate-passport";
import { getEventDateRangeLabel, getEventScheduleLabel, getEventTimeSummaryLabel, normalizeEventDateSlots, type EventDateSlot } from "@/lib/data/events";
import { toast } from "sonner";

interface PassData {
  id: string;
  eventId: string;
  eventTitle: string;
  eventTitleEn: string;
  startDate: string;
  endDate: string;
  venue: string;
  venueEn: string;
  type: string;
  qrCodeSvg: string;
  checkedIn: boolean;
  pointsEarned: number;
  startTime: string;
  endTime: string;
  eventDateSlots: EventDateSlot[];
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
  pendingApproval: "bg-orange-100 text-orange-700 border-0",
  rejected: "bg-red-100 text-red-700 border-0",
};

export default function PassPage() {
  const t = useTranslations("dashboardPassPage");
  const detailT = useTranslations("eventDetailPage");
  const locale = useLocale();
  const [passes, setPasses] = useState<PassData[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedPassId, setSelectedPassId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [passportQrCode, setPassportQrCode] = useState<string | null>(null);
  const [sharePreviewOpen, setSharePreviewOpen] = useState(false);
  const [sharePreviewImage, setSharePreviewImage] = useState("");
  const [sharePreviewTitle, setSharePreviewTitle] = useState("");
  const [sharePreviewFileName, setSharePreviewFileName] = useState("event-share.png");

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
            let passState: EventPassState;
            if (registration.status === "PENDING_APPROVAL") {
              passState = "pendingApproval";
            } else if (registration.status === "REJECTED") {
              passState = "rejected";
            } else {
              passState = getEventPassState({
                startDate: event.startDate,
                endDate: event.endDate,
                startTime: event.startTime,
                endTime: event.endTime,
                eventDateSlots: event.eventDateSlots,
                checkedInAt: registration.checkedInAt,
              });
            }

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
              endDate: event.endDate,
              venue: event.venue,
              venueEn: event.venueEn || event.venue,
              type: "STANDARD",
              qrCodeSvg,
              checkedIn: Boolean(registration.checkedInAt),
              pointsEarned: registration.pointsEarned,
              startDate: event.startDate,
              startTime: event.startTime,
              endTime: event.endTime,
              eventDateSlots: Array.isArray(event.eventDateSlots) ? event.eventDateSlots : [],
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
    if (typeof window === "undefined") {
      return;
    }

    const handleFocusRefresh = () => {
      void fetchPasses();
    };

    const handleVisibilityRefresh = () => {
      if (!document.hidden) {
        void fetchPasses();
      }
    };

    window.addEventListener("focus", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, [fetchPasses]);

  useEffect(() => {
    if (typeof window === "undefined" || passes.length === 0) {
      return;
    }

    const now = Date.now();
    const upcomingTransitions = passes.flatMap((pass) => {
      if (pass.passState === "checkedIn" || pass.passState === "expired" || pass.passState === "rejected") {
        return [] as number[];
      }

      const slots = normalizeEventDateSlots({
        startDate: pass.startDate,
        endDate: pass.endDate,
        startTime: pass.startTime,
        endTime: pass.endTime,
        eventDateSlots: pass.eventDateSlots,
      });

      return slots.flatMap((slot) => {
        const startAt = combineEventDateTime(slot.scheduleDate, slot.startTime).getTime();
        const endAt = combineEventDateTime(slot.scheduleDate, slot.endTime).getTime();
        const entryOpenAt = startAt - EVENT_PASS_ENTRY_WINDOW_MS;
        return [entryOpenAt, endAt].filter((point) => point > now);
      });
    });

    if (upcomingTransitions.length === 0) {
      return;
    }

    const nextTransitionAt = Math.min(...upcomingTransitions);
    const timeoutMs = Math.max(1000, Math.min(nextTransitionAt - now + 1000, 2147483647));
    const refreshTimer = window.setTimeout(() => {
      void fetchPasses();
    }, timeoutMs);

    return () => {
      window.clearTimeout(refreshTimer);
    };
  }, [passes, fetchPasses]);


  const downloadPass = () => {
    toast.success(t("messages.passDownloaded"));
  };

  const getShareUrl = () => `${window.location.origin}/${locale}/events/${selectedPass?.eventId || ""}`;

  const openShareWindow = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const downloadDataUrl = (dataUrl: string, fileName: string) => {
    const anchor = document.createElement("a");
    anchor.href = dataUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const loadImageElement = async (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = document.createElement("img");
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Image loading failed"));
      image.src = src;
    });

  const drawWrappedText = (
    context: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number
  ) => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";

    words.forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (context.measureText(testLine).width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    lines.slice(0, maxLines).forEach((line, index) => {
      context.fillText(line, x, y + index * lineHeight);
    });
  };

  const buildPosterImage = async (pass: PassData, shareUrl: string) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1520;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas context unavailable");
    }

    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#052e2b");
    gradient.addColorStop(0.6, "#0b4f46");
    gradient.addColorStop(1, "#052f6d");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "rgba(255,255,255,0.14)";
    context.fillRect(80, 80, canvas.width - 160, canvas.height - 160);

    const title = locale === "en" ? pass.eventTitleEn : pass.eventTitle;
    const schedule = getEventScheduleLabel(pass, locale);
    const venue = locale === "en" ? pass.venueEn || pass.venue : pass.venue;

    context.fillStyle = "#ffffff";
    context.font = "700 62px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    drawWrappedText(context, title, 130, 220, canvas.width - 260, 78, 2);

    context.fillStyle = "rgba(255,255,255,0.9)";
    context.font = "400 34px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    drawWrappedText(context, schedule, 130, 410, canvas.width - 260, 48, 3);

    context.fillStyle = "#d1fae5";
    context.font = "600 34px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    drawWrappedText(context, venue, 130, 620, canvas.width - 260, 44, 2);

    context.fillStyle = "#ffffff";
    context.fillRect(300, 760, 480, 560);

    const qrDataUrl = await QRCode.toDataURL(shareUrl, {
      width: 380,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    });
    const qrImage = await loadImageElement(qrDataUrl);
    context.drawImage(qrImage, 350, 810, 380, 380);

    context.fillStyle = "#0f172a";
    context.font = "600 30px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    context.textAlign = "center";
    context.fillText(detailT("register.sharePosterScan"), canvas.width / 2, 1260);
    context.textAlign = "start";

    return canvas.toDataURL("image/png");
  };

  const handleGenerateQr = async (mode: "poster" | "qr") => {
    if (!selectedPass) {
      return;
    }

    try {
      const shareUrl = getShareUrl();
      const baseName = `event-${selectedPass.eventId}-${mode}`;

      if (mode === "poster") {
        const poster = await buildPosterImage(selectedPass, shareUrl);
        setSharePreviewImage(poster);
        setSharePreviewTitle(detailT("register.sharePoster"));
        setSharePreviewFileName(`${baseName}.png`);
        setSharePreviewOpen(true);
        toast.success(detailT("register.sharePosterReady"));
        return;
      }

      const qr = await QRCode.toDataURL(shareUrl, {
        width: 520,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      setSharePreviewImage(qr);
      setSharePreviewTitle(detailT("register.shareQrOnly"));
      setSharePreviewFileName(`${baseName}.png`);
      setSharePreviewOpen(true);
      toast.success(detailT("register.shareQrReady"));
    } catch (shareError) {
      toast.error(shareError instanceof Error ? shareError.message : detailT("register.shareGenerateFailed"));
    }
  };

  const handleShareLink = async (platform: "wechat" | "xiaohongshu") => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      if (platform === "wechat") {
        toast.success(detailT("register.shareWechatCopied"));
      } else {
        toast.success(detailT("register.shareXiaohongshuCopied"));
      }
    } catch {
      toast.error(detailT("register.shareGenerateFailed"));
    }
  };

  const handleShareLinkedIn = () => {
    const url = encodeURIComponent(getShareUrl());
    openShareWindow(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`);
  };

  const handleShareX = () => {
    if (!selectedPass) {
      return;
    }

    const url = encodeURIComponent(getShareUrl());
    const text = encodeURIComponent(locale === "en" ? selectedPass.eventTitleEn : selectedPass.eventTitle);
    openShareWindow(`https://x.com/intent/tweet?url=${url}&text=${text}`);
  };

  const handleSystemShare = async () => {
    if (!selectedPass) {
      return;
    }

    const shareData = {
      title: t("share.title"),
      text: t("share.text", {
        eventTitle: locale === "en" ? selectedPass.eventTitleEn : selectedPass.eventTitle,
      }),
      url: getShareUrl(),
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        return;
      }
    } else {
      await navigator.clipboard.writeText(getShareUrl());
      toast.success(detailT("register.shareSystemCopied"));
    }
  };

  const getPassBadgeLabel = (passState: EventPassState) => {
    if (passState === "checkedIn") return t("badges.checkedIn");
    if (passState === "upcoming") return t("badges.upcoming");
    if (passState === "expired") return t("badges.expired");
    if (passState === "pendingApproval") return t("badges.pendingApproval");
    if (passState === "rejected") return t("badges.rejected");
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
    if (passState === "pendingApproval") {
      return {
        title: t("status.pendingApprovalTitle"),
        description: t("status.pendingApprovalDescription"),
        className: "bg-orange-50 text-orange-900 border-orange-200",
      };
    }
    if (passState === "rejected") {
      return {
        title: t("status.rejectedTitle"),
        description: t("status.rejectedDescription"),
        className: "bg-red-50 text-red-900 border-red-200",
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
                  </div>
                  <p className="text-sm text-slate-500 mt-4 text-center">{t("showQr")}</p>
                  <p className="text-xs text-slate-400 mt-1 text-center">{t("messages.qrAvailability")}</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">{locale === "en" ? selectedPass.eventTitleEn : selectedPass.eventTitle}</h3>
                    <div className="grid grid-cols-[72px_1fr] gap-x-4 gap-y-3 text-slate-600">
                      <span className="text-slate-400">{t("fields.date")}</span>
                      <span className="min-w-0 leading-6">{getEventDateRangeLabel(selectedPass, locale)}</span>

                      <span className="text-slate-400">{t("fields.time")}</span>
                      <span className="min-w-0 leading-6">{getEventTimeSummaryLabel(selectedPass, locale)}</span>

                      <span className="text-slate-400">{t("fields.venue")}</span>
                      <span className="min-w-0 leading-6">{locale === "en" ? selectedPass.venueEn : selectedPass.venue}</span>

                      <span className="text-slate-400">{t("fields.ticket")}</span>
                      <span className="font-mono leading-6">{selectedPass.id.slice(0, 12).toUpperCase()}</span>

                      {selectedPass.checkedIn && selectedPass.pointsEarned > 0 && (
                        <>
                          <span className="text-emerald-500">{t("fields.pointsEarned")}</span>
                          <span className="font-bold text-emerald-600 leading-6">+{selectedPass.pointsEarned}</span>
                        </>
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="flex-1">
                            <Share2 className="w-4 h-4 mr-2" />
                            {t("actions.share")}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>{detailT("register.shareQr")}</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-48">
                              <DropdownMenuItem onClick={() => void handleGenerateQr("poster")}>
                                {detailT("register.sharePoster")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void handleGenerateQr("qr")}>
                                {detailT("register.shareQrOnly")}
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuItem onClick={() => void handleShareLink("wechat")}>
                            {detailT("register.shareWechat")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleShareLinkedIn}>
                            {detailT("register.shareLinkedIn")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleShareX}>{detailT("register.shareX")}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void handleShareLink("xiaohongshu")}>
                            {detailT("register.shareXiaohongshu")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void handleSystemShare()}>
                            {detailT("register.shareSystem")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Dialog open={sharePreviewOpen} onOpenChange={setSharePreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{sharePreviewTitle}</DialogTitle>
            <DialogDescription>{detailT("register.sharePreviewDescription")}</DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            {sharePreviewImage ? (
              <Image src={sharePreviewImage} alt={sharePreviewTitle} width={720} height={960} unoptimized className="mx-auto w-full h-auto rounded-xl" />
            ) : null}
          </div>
          <Button onClick={() => downloadDataUrl(sharePreviewImage, sharePreviewFileName)}>
            {detailT("register.shareDownload")}
          </Button>
        </DialogContent>
      </Dialog>

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
