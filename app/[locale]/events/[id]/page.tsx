"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import QRCode from "qrcode";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
  Share2,
  Heart,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { getEventDateRangeLabel, getEventScheduleLabel, getEventTimeSummaryLabel, getEventTypeLabel, typeColors, getEventLayerLabel, getEventHostTypeLabel, eventLayerColors, eventHostTypeColors, type EventDateSlot } from "@/lib/data/events";
import { Link } from "@/i18n/routing";
import { normalizeAgendaDateKey } from "@/lib/agenda";
import { toast } from "sonner";

type EventType = "forum" | "workshop" | "ceremony" | "conference" | "networking";

type AgendaSpeaker = {
  id: string;
  name: string;
  nameEn?: string | null;
  avatar?: string | null;
  title: string;
  titleEn?: string | null;
  organization: string;
  organizationEn?: string | null;
  isKeynote: boolean;
};

type AgendaItem = {
  id: string;
  title: string;
  description?: string | null;
  agendaDate: string;
  startTime: string;
  endTime: string;
  type: string;
  venue?: string | null;
  order: number;
  speakers: AgendaSpeaker[];
  moderatorId?: string | null;
  moderator?: AgendaSpeaker | null;
  speakerMeta?: {
    orderedIds?: string[];
    topics?: Record<string, string>;
  } | null;
};

type PublicEvent = {
  id: string;
  title: string;
  titleEn?: string | null;
  description: string;
  descriptionEn?: string | null;
  shortDesc?: string | null;
  shortDescEn?: string | null;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  eventDateSlots?: EventDateSlot[];
  venue: string;
  venueEn?: string | null;
  address?: string | null;
  addressEn?: string | null;
  city?: string | null;
  cityEn?: string | null;
  type: EventType;
  eventLayer?: string | null;
  hostType?: string | null;
  maxAttendees?: number | null;
  isClosed?: boolean;
  isFeatured: boolean;
  highlights?: string[] | null;
  highlightsEn?: string[] | null;
  agendaItems?: AgendaItem[];
};

function parseHighlights(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function formatEventDateLabel(dateValue: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(dateValue));
}

function formatAgendaDateLabel(dateValue: string, locale: string) {
  const normalized = normalizeAgendaDateKey(dateValue);
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(`${normalized}T12:00:00`));
}

function getLocalizedTitle(event: PublicEvent, locale: string) {
  return locale === "en" ? event.titleEn || event.title : event.title;
}

function getLocalizedDescription(event: PublicEvent, locale: string) {
  if (locale === "en") {
    return event.shortDescEn || event.descriptionEn || event.shortDesc || event.description;
  }

  return event.shortDesc || event.description;
}

function getFullDescription(event: PublicEvent, locale: string) {
  if (locale === "en") {
    return event.descriptionEn || event.description;
  }

  return event.description;
}

export default function EventDetailPage() {
  const t = useTranslations("eventDetailPage");
  const eventListT = useTranslations("eventsPage");
  const locale = useLocale() as "zh" | "en";
  const params = useParams();
  const { status } = useSession();
  const eventId = params.id as string;
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sharePreviewOpen, setSharePreviewOpen] = useState(false);
  const [sharePreviewImage, setSharePreviewImage] = useState("");
  const [sharePreviewTitle, setSharePreviewTitle] = useState("");
  const [sharePreviewFileName, setSharePreviewFileName] = useState("event-qr.png");

  const highlights = useMemo(() => {
    if (event) {
      const dynamicHighlights =
        locale === "en" ? parseHighlights(event.highlightsEn) : parseHighlights(event.highlights);

      if (dynamicHighlights.length > 0) {
        return dynamicHighlights;
      }
    }

    return t.raw("about.highlights") as string[];
  }, [event, locale, t]);

  useEffect(() => {
    let cancelled = false;

    async function loadEvent() {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch(`/api/events/${eventId}?locale=${locale}`, {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || t("loadError"));
        }

        if (!cancelled) {
          setEvent(payload.data);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : t("loadError"));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadEvent();

    return () => {
      cancelled = true;
    };
  }, [eventId, locale, t]);

  useEffect(() => {
    let cancelled = false;

    async function loadUserActivity() {
      if (status !== "authenticated") {
        if (!cancelled) {
          setIsSaved(false);
          setIsRegistered(false);
        }
        return;
      }

      try {
        const response = await fetch(`/api/user/registrations?locale=${locale}`, {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          return;
        }

        if (!cancelled) {
          const wishlist = Array.isArray(payload.data?.wishlist) ? payload.data.wishlist : [];
          const registrations = Array.isArray(payload.data?.registrations)
            ? payload.data.registrations
            : [];

          setIsSaved(wishlist.some((item: { event?: { id?: string } }) => item.event?.id === eventId));
          setIsRegistered(
            registrations.some((item: { event?: { id?: string } }) => item.event?.id === eventId)
          );
        }
      } catch {
        if (!cancelled) {
          setIsSaved(false);
          setIsRegistered(false);
        }
      }
    }

    void loadUserActivity();

    return () => {
      cancelled = true;
    };
  }, [eventId, locale, status]);

  const groupedAgendaItems = useMemo(() => {
    if (!event?.agendaItems?.length) {
      return [] as Array<{ date: string; items: AgendaItem[] }>;
    }

    const groups = new Map<string, AgendaItem[]>();
    event.agendaItems.forEach((item) => {
      const key = normalizeAgendaDateKey(item.agendaDate);
      groups.set(key, [...(groups.get(key) || []), item]);
    });

    return Array.from(groups.entries()).map(([date, items]) => ({ date, items }));
  }, [event]);

  const handleSave = async () => {
    if (!event || isSaving || isRegistered) {
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch("/api/user/registrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          locale,
          action: isSaved ? "remove_wishlist" : "add_wishlist",
          eventId: event.id,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || t("loadError"));
      }

      setIsSaved(!isSaved);
      toast.success(isSaved ? t("register.unsaveSuccess") : t("register.saveSuccess"));
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : t("loadError"));
    } finally {
      setIsSaving(false);
    }
  };

  const getShareUrl = () => window.location.href;

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
    // Split into tokens: Chinese chars are split individually, Latin words kept together
    const tokens = text.match(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]|[^\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\s]+|\s+/g) || [text];
    const lines: string[] = [];
    let currentLine = "";

    tokens.forEach((token) => {
      if (/^\s+$/.test(token)) return; // skip pure whitespace tokens
      const separator = currentLine && !/[\u4e00-\u9fff]/.test(token) && !/[\u4e00-\u9fff]/.test(currentLine.slice(-1)) ? " " : "";
      const testLine = currentLine ? `${currentLine}${separator}${token}` : token;
      if (context.measureText(testLine).width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = token;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    lines.slice(0, maxLines).forEach((line, index) => {
      context.fillText(line, x, y + index * lineHeight);
    });
  };

  // Returns estimated line count for text at current font settings
  const estimateLineCount = (
    context: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ) => {
    const tokens = text.match(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]|[^\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\s]+|\s+/g) || [text];
    let lines = 1;
    let currentLine = "";
    tokens.forEach((token) => {
      if (/^\s+$/.test(token)) return;
      const separator = currentLine && !/[\u4e00-\u9fff]/.test(token) && !/[\u4e00-\u9fff]/.test(currentLine.slice(-1)) ? " " : "";
      const testLine = currentLine ? `${currentLine}${separator}${token}` : token;
      if (context.measureText(testLine).width <= maxWidth) {
        currentLine = testLine;
      } else {
        lines++;
        currentLine = token;
      }
    });
    return lines;
  };

  const buildPosterImage = async (shareUrl: string) => {
    if (!event) {
      throw new Error("Event not found");
    }

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

    const title = getLocalizedTitle(event, locale);
    const description = getLocalizedDescription(event, locale);
    const venue = locale === "en" ? event.venueEn || event.venue : event.venue;
    const scheduleLabel = getEventScheduleLabel(event, locale);

    context.fillStyle = "#ffffff";
    // Adaptive font size: reduce if title is long, allow more lines accordingly
    const titleMaxWidth = canvas.width - 260;
    let titleFontSize = 62;
    let titleLineHeight = 78;
    let titleMaxLines = 2;
    context.font = `700 ${titleFontSize}px 'PingFang SC', 'Microsoft YaHei', sans-serif`;
    const titleLineCount = estimateLineCount(context, title, titleMaxWidth);
    if (titleLineCount > 2) {
      titleFontSize = 48;
      titleLineHeight = 62;
      titleMaxLines = 3;
      context.font = `700 ${titleFontSize}px 'PingFang SC', 'Microsoft YaHei', sans-serif`;
    }
    drawWrappedText(context, title, 130, 220, titleMaxWidth, titleLineHeight, titleMaxLines);

    // Shift remaining content down if title takes extra lines
    const titleBottomY = 220 + Math.min(titleMaxLines, titleLineCount) * titleLineHeight;
    const descY = Math.max(400, titleBottomY + 40);
    const scheduleY = descY + 48 * 3 + 40;
    const venueY = scheduleY + 50;
    const qrBoxY = venueY + 60;

    context.fillStyle = "rgba(255,255,255,0.9)";
    context.font = "400 36px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    drawWrappedText(context, description, 130, descY, canvas.width - 260, 48, 3);

    context.fillStyle = "#d1fae5";
    context.font = "600 34px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    drawWrappedText(context, scheduleLabel, 130, scheduleY, canvas.width - 260, 44, 4);
    context.fillText(venue, 130, venueY);

    context.fillStyle = "#ffffff";
    context.fillRect(300, qrBoxY, 480, 560);

    const qrDataUrl = await QRCode.toDataURL(shareUrl, {
      width: 380,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    });
    const qrImage = await loadImageElement(qrDataUrl);
    context.drawImage(qrImage, 350, qrBoxY + 50, 380, 380);

    context.fillStyle = "#0f172a";
    context.font = "600 30px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    context.textAlign = "center";
    context.fillText(t("register.sharePosterScan"), canvas.width / 2, qrBoxY + 500);
    context.textAlign = "start";

    return canvas.toDataURL("image/png");
  };

  const handleGenerateQr = async (mode: "poster" | "qr") => {
    if (!event) {
      return;
    }

    try {
      const shareUrl = getShareUrl();
      const baseName = `event-${event.id}-${mode}`;

      if (mode === "poster") {
        const poster = await buildPosterImage(shareUrl);
        setSharePreviewImage(poster);
        setSharePreviewTitle(t("register.sharePoster"));
        setSharePreviewFileName(`${baseName}.png`);
        setSharePreviewOpen(true);
        toast.success(t("register.sharePosterReady"));
        return;
      }

      const qr = await QRCode.toDataURL(shareUrl, {
        width: 520,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      setSharePreviewImage(qr);
      setSharePreviewTitle(t("register.shareQrOnly"));
      setSharePreviewFileName(`${baseName}.png`);
      setSharePreviewOpen(true);
      toast.success(t("register.shareQrReady"));
    } catch (shareError) {
      toast.error(shareError instanceof Error ? shareError.message : t("register.shareGenerateFailed"));
    }
  };

  const handleShareLink = async (platform: "wechat" | "xiaohongshu") => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      if (platform === "wechat") {
        toast.success(t("register.shareWechatCopied"));
      } else {
        toast.success(t("register.shareXiaohongshuCopied"));
      }
    } catch {
      toast.error(t("register.shareGenerateFailed"));
    }
  };

  const handleShareLinkedIn = () => {
    if (!event) {
      return;
    }

    const url = encodeURIComponent(getShareUrl());
    openShareWindow(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`);
  };

  const handleShareX = () => {
    if (!event) {
      return;
    }

    const url = encodeURIComponent(getShareUrl());
    const text = encodeURIComponent(`${getLocalizedTitle(event, locale)}\n${getLocalizedDescription(event, locale)}`);
    openShareWindow(`https://x.com/intent/tweet?url=${url}&text=${text}`);
  };

  const handleSystemShare = async () => {
    if (!event) {
      return;
    }

    const shareData = {
      title: getLocalizedTitle(event, locale),
      text: getLocalizedDescription(event, locale),
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        return;
      }
    } else {
      await navigator.clipboard.writeText(getShareUrl());
      toast.success(t("register.shareSystemCopied"));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 pt-20">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p>{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (!event) {
    const hasError = Boolean(error);

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 pt-20">
        <div className="text-center max-w-md px-6">
          <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {hasError ? t("loadError") : t("notFound.title")}
          </h1>
          <p className="text-slate-500 mb-6">{hasError ? error : t("notFound.description")}</p>
          {hasError ? (
            <Button onClick={() => window.location.reload()}>{t("retry")}</Button>
          ) : (
            <Link href="/events">
              <Button>{t("notFound.back")}</Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  const localizedTitle = getLocalizedTitle(event, locale);
  const localizedDescription = getLocalizedDescription(event, locale);
  const fullDescription = getFullDescription(event, locale);
  const localizedVenue = locale === "en" ? event.venueEn || event.venue : event.venue;
  const localizedAddress = locale === "en" ? event.addressEn || event.address || "" : event.address || "";
  const localizedCity = locale === "en"
    ? (event.cityEn || event.city || "Shanghai")
    : (event.city || "上海");
  const mapsQuery = encodeURIComponent(
    [localizedVenue, localizedAddress, localizedCity].filter(Boolean).join(", ")
  );
  const googleMapsEmbed = `https://maps.google.com/maps?q=${mapsQuery}&output=embed&hl=${locale === "zh" ? "zh-CN" : "en"}`;
  const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
  const gaodeQuery = encodeURIComponent(
    [event.venue, event.address, event.city || "上海"].filter(Boolean).join(" ")
  );
  const gaodeLink = `https://www.amap.com/search?query=${gaodeQuery}`;
  const baiduLink = `https://map.baidu.com/?wd=${encodeURIComponent([event.venue, event.address].filter(Boolean).join(" "))}`;

  return (
    <div className="min-h-screen bg-slate-50 pt-16 lg:pt-20">
      <section className="bg-slate-900 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link href="/events" className="inline-flex items-center text-slate-400 hover:text-white mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("backToEvents")}
            </Link>

            <div className="flex flex-wrap gap-2 mb-4">
              {event.hostType ? (
                <span className={`inline-flex items-center px-4 py-1.5 rounded-md text-sm font-bold tracking-wide ${eventHostTypeColors[event.hostType] || "bg-slate-100 text-slate-700"}`}>
                  {getEventHostTypeLabel(event.hostType, locale)}
                </span>
              ) : null}
              <Badge className={typeColors[event.type]}>{getEventTypeLabel(event.type, locale)}</Badge>
              {event.eventLayer ? (
                <Badge className={eventLayerColors[event.eventLayer] || "bg-slate-100 text-slate-700"}>
                  {getEventLayerLabel(event.eventLayer, locale)}
                </Badge>
              ) : null}
              {event.isFeatured ? (
                <Badge className="bg-amber-100 text-amber-700">{t("featured")}</Badge>
              ) : null}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              {localizedTitle}
            </h1>

            <p className="text-lg text-slate-300 max-w-3xl">{localizedDescription}</p>
          </motion.div>
        </div>
      </section>

      <section className="bg-white border-b border-slate-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center text-slate-600">
              <Calendar className="w-4 h-4 mr-2 text-emerald-600" />
              {getEventDateRangeLabel(event, locale)}
            </div>
            <div className="flex items-center text-slate-600">
              <Clock className="w-4 h-4 mr-2 text-emerald-600" />
              {getEventTimeSummaryLabel(event, locale)}
            </div>
            <div className="flex items-center text-slate-600">
              <MapPin className="w-4 h-4 mr-2 text-emerald-600" />
              {locale === "en" ? event.venueEn || event.venue : event.venue}
            </div>
            {event.maxAttendees ? (
              <div className="flex items-center text-slate-600">
                <Users className="w-4 h-4 mr-2 text-emerald-600" />
                {eventListT("capacity", { count: event.maxAttendees })}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Tabs defaultValue="about" className="w-full">
                <TabsList className="w-full justify-start bg-white border border-slate-200 p-1 mb-6">
                  <TabsTrigger value="about" className="flex-1">{t("tabs.about")}</TabsTrigger>
                  <TabsTrigger value="agenda" className="flex-1">{t("tabs.agenda")}</TabsTrigger>
                  <TabsTrigger value="speakers" className="flex-1">{t("tabs.speakers")}</TabsTrigger>
                </TabsList>

                <TabsContent value="about" className="mt-0">
                  <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">{t("about.title")}</h2>
                    <div className="prose prose-slate max-w-none">
                      <p className="text-slate-600 leading-relaxed mb-4">{fullDescription}</p>
                      <h3 className="text-lg font-bold text-slate-900 mt-6 mb-3">{t("about.highlightsTitle")}</h3>
                      <ul className="space-y-2 text-slate-600">
                        {highlights.map((highlight) => (
                          <li key={highlight} className="flex items-start">
                            <CheckCircle className="w-5 h-5 text-emerald-600 mr-2 mt-0.5 shrink-0" />
                            {highlight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="agenda" className="mt-0">
                  <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">{t("agenda.title")}</h2>
                    <div className="space-y-4">
                      {groupedAgendaItems.length > 0 ? (
                        groupedAgendaItems.map((group) => (
                          <div key={group.date} className="space-y-3">
                            <div className="sticky top-20 z-10 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
                              {formatAgendaDateLabel(group.date, locale)}
                            </div>
                            {group.items.map((item) => (
                              <div key={item.id} className="flex gap-4 p-4 rounded-xl bg-slate-50">
                                <div className="w-32 shrink-0 text-sm font-medium text-slate-500">
                                  {item.startTime} - {item.endTime}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <h4 className="font-semibold text-slate-900">{item.title}</h4>
                                    <Badge variant="outline" className="shrink-0 text-xs">
                                      {t.has(`agenda.types.${item.type}`) ? t(`agenda.types.${item.type}` as Parameters<typeof t>[0]) : item.type}
                                    </Badge>
                                  </div>
                                  {item.description && (
                                    <p className="text-sm text-slate-600 mb-2">{item.description}</p>
                                  )}
                                  {item.venue && (
                                    <p className="text-xs text-slate-400 mb-2">
                                      <MapPin className="inline w-3 h-3 mr-1" />
                                      {item.venue}
                                    </p>
                                  )}
                                  {item.speakers.length > 0 && (
                                    <div className="mt-2 flex gap-1.5">
                                      <span className="text-xs text-slate-400 shrink-0 pt-0.5">
                                        {locale === "zh" ? "嘉宾：" : "Speakers:"}
                                      </span>
                                      <div className="space-y-1">
                                        {item.speakers
                                          .slice()
                                          .sort((a, b) => {
                                            const ids = item.speakerMeta?.orderedIds;
                                            if (!ids) return 0;
                                            const ia = ids.indexOf(a.id);
                                            const ib = ids.indexOf(b.id);
                                            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                                          })
                                          .map((speaker) => {
                                            const name = locale === "en" && speaker.nameEn ? speaker.nameEn : speaker.name;
                                            const title = locale === "en" && speaker.titleEn ? speaker.titleEn : speaker.title;
                                            const org = locale === "en" && speaker.organizationEn ? speaker.organizationEn : speaker.organization;
                                            const topic = item.speakerMeta?.topics?.[speaker.id];
                                            return (
                                              <div key={speaker.id} className="flex items-center gap-2">
                                                <Avatar className="h-5 w-5 shrink-0">
                                                  <AvatarImage src={speaker.avatar || undefined} />
                                                  <AvatarFallback className="text-[10px]">
                                                    {name.charAt(0)}
                                                  </AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs font-medium text-slate-700 shrink-0">
                                                  {name}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                  {title} · {org}
                                                </span>
                                                {topic && (
                                                  <span className="text-xs font-bold text-slate-600">{topic}</span>
                                                )}
                                              </div>
                                            );
                                          })}
                                      </div>
                                    </div>
                                  )}
                                  {item.moderator && (
                                    <div className="flex items-center gap-2 mt-1 pl-0">
                                      <span className="text-xs text-slate-400 shrink-0">
                                        {locale === "zh" ? "主持：" : "Host:"}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-5 w-5 shrink-0">
                                          <AvatarImage src={item.moderator.avatar || undefined} />
                                          <AvatarFallback className="text-[10px]">
                                            {(locale === "en" && item.moderator.nameEn ? item.moderator.nameEn : item.moderator.name).charAt(0)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs font-medium text-amber-700">
                                          {locale === "en" && item.moderator.nameEn ? item.moderator.nameEn : item.moderator.name}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                          {locale === "en" && item.moderator.titleEn ? item.moderator.titleEn : item.moderator.title} · {locale === "en" && item.moderator.organizationEn ? item.moderator.organizationEn : item.moderator.organization}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-8">{t("agenda.empty")}</p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="speakers" className="mt-0">
                  <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">{t("speakersTitle")}</h2>
                    {(() => {
                      const allSpeakers = new Map<string, AgendaSpeaker>();
                      event.agendaItems?.forEach((item) =>
                        item.speakers.forEach((s) => allSpeakers.set(s.id, s))
                      );
                      const speakers = Array.from(allSpeakers.values());

                      if (speakers.length === 0) {
                        return (
                          <p className="text-sm text-slate-500 text-center py-8">{t("speakersEmpty")}</p>
                        );
                      }

                      return (
                        <div className="grid sm:grid-cols-2 gap-4">
                          {speakers.map((speaker) => {
                            const name = locale === "en" && speaker.nameEn ? speaker.nameEn : speaker.name;
                            const title = locale === "en" && speaker.titleEn ? speaker.titleEn : speaker.title;
                            const org = locale === "en" && speaker.organizationEn ? speaker.organizationEn : speaker.organization;

                            return (
                              <div key={speaker.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-emerald-200 transition-colors">
                                <Avatar className="w-14 h-14 shrink-0">
                                  <AvatarImage src={speaker.avatar || undefined} />
                                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-lg font-semibold">
                                    {name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-slate-900 truncate">{name}</h4>
                                    {speaker.isKeynote && (
                                      <Badge className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0">Keynote</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-slate-600 truncate">{title}</p>
                                  <p className="text-xs text-slate-400 truncate">{org}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-36 space-y-4">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">{t("register.title")}</h3>
                  <p className="text-sm text-slate-500 mb-4">{t("register.description")}</p>
                  {isRegistered ? (
                    <Button className="w-full mb-3" disabled>
                      {t("register.registered")}
                    </Button>
                  ) : event.isClosed ? (
                    <Link href={`/events/${eventId}/register`} className="block">
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 mb-3">
                        {t("register.applyAttend")}
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/events/${eventId}/register`} className="block">
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 mb-3">
                        {eventListT("register")}
                      </Button>
                    </Link>
                  )}
                  <div className="flex gap-2">
                    <LoadingButton
                      variant="outline"
                      className={`flex-1 ${isSaved ? "text-red-500 border-red-200 bg-red-50" : ""}`}
                      onClick={handleSave}
                      disabled={isRegistered}
                      loading={isSaving}
                      loadingText={locale === "en" ? "Saving..." : "保存中..."}
                    >
                      <Heart className={`w-4 h-4 mr-2 ${isSaved ? "fill-current" : ""}`} />
                      {isSaved ? t("register.saved") : t("register.save")}
                    </LoadingButton>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex-1">
                          <Share2 className="w-4 h-4 mr-2" />
                          {t("register.share")}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>{t("register.shareQr")}</DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="w-48">
                            <DropdownMenuItem onClick={() => void handleGenerateQr("poster")}>
                              {t("register.sharePoster")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void handleGenerateQr("qr")}>
                              {t("register.shareQrOnly")}
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuItem onClick={() => void handleShareLink("wechat")}>
                          {t("register.shareWechat")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleShareLinkedIn}>
                          {t("register.shareLinkedIn")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleShareX}>{t("register.shareX")}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void handleShareLink("xiaohongshu")}>
                          {t("register.shareXiaohongshu")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void handleSystemShare()}>
                          {t("register.shareSystem")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">{t("locationTitle")}</h3>
                  <div className="rounded-xl mb-4 overflow-hidden border border-slate-200" style={{ aspectRatio: "16/9" }}>
                    {locale === "en" ? (
                      <iframe
                        src={googleMapsEmbed}
                        className="w-full h-full"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Event location map"
                      />
                    ) : (
                      <a
                        href={gaodeLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-full bg-gradient-to-br from-emerald-50 to-blue-50 flex flex-col items-center justify-center relative overflow-hidden"
                        style={{ minHeight: "160px" }}
                      >
                        <div className="absolute inset-0 opacity-10">
                          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" />
                            </pattern>
                            <rect width="100" height="100" fill="url(#grid)" />
                          </svg>
                        </div>
                        <MapPin className="w-10 h-10 text-emerald-500 mb-2" />
                        <p className="text-sm text-slate-500 text-center px-4">{localizedVenue}</p>
                        <p className="text-xs text-emerald-600 mt-1">{t("clickToViewMap")}</p>
                      </a>
                    )}
                  </div>
                  <p className="font-medium text-slate-900 mb-1">{localizedVenue}</p>
                  {localizedAddress ? <p className="text-sm text-slate-500 mb-3">{localizedAddress}</p> : null}
                  <div className="flex gap-2">
                    {locale === "en" ? (
                      <>
                        <a href={googleMapsLink} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <Button variant="outline" className="w-full" size="sm">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Google Maps
                          </Button>
                        </a>
                        <a href={gaodeLink} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <Button variant="outline" className="w-full" size="sm">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Gaode Maps
                          </Button>
                        </a>
                      </>
                    ) : (
                      <>
                        <a href={gaodeLink} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <Button variant="outline" className="w-full" size="sm">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            高德地图
                          </Button>
                        </a>
                        <a href={baiduLink} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <Button variant="outline" className="w-full" size="sm">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            百度地图
                          </Button>
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Dialog open={sharePreviewOpen} onOpenChange={setSharePreviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{sharePreviewTitle}</DialogTitle>
            <DialogDescription>{t("register.sharePreviewDescription")}</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            {sharePreviewImage ? (
              <Image
                src={sharePreviewImage}
                alt={sharePreviewTitle}
                width={720}
                height={720}
                className="w-full h-auto rounded-lg"
                unoptimized
              />
            ) : null}
          </div>
          <Button onClick={() => downloadDataUrl(sharePreviewImage, sharePreviewFileName)}>
            {t("register.shareDownload")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
