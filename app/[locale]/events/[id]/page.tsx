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
  FileText,
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
import { buildEventMapLinks } from "@/lib/map-links";
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
  titleEn?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
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
    topicsEn?: Record<string, string>;
  } | null;
};

type EventInstitution = {
  institutionId: string;
  role?: string | null;
  institution: {
    id: string;
    slug: string;
    name: string;
    nameEn?: string | null;
    logo?: string | null;
    orgType?: string | null;
  };
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
  institutions?: EventInstitution[];
};

type RelatedInsight = {
  id: string;
  slug: string;
  title: string;
  titleEn?: string | null;
  type: string;
  publishDate?: string | null;
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

function wrapCanvasTextLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = Number.MAX_SAFE_INTEGER
) {
  const safeText = text.trim();
  if (!safeText) {
    return [] as string[];
  }

  const tokens = safeText.match(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]|[^\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\s]+|\s+/g) || [safeText];
  const lines: string[] = [];
  let currentLine = "";

  tokens.forEach((token) => {
    if (/^\s+$/.test(token)) {
      return;
    }

    const separator = currentLine && !/[\u4e00-\u9fff]/.test(token) && !/[\u4e00-\u9fff]/.test(currentLine.slice(-1))
      ? " "
      : "";
    const testLine = currentLine ? `${currentLine}${separator}${token}` : token;

    if (context.measureText(testLine).width <= maxWidth) {
      currentLine = testLine;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
    }
    currentLine = token;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length <= maxLines) {
    return lines;
  }

  const clipped = lines.slice(0, maxLines);
  if (clipped.length > 0) {
    const lastIndex = clipped.length - 1;
    clipped[lastIndex] = `${clipped[lastIndex].replace(/[，。；、,:;·\s]+$/u, "")}…`;
  }
  return clipped;
}

function humanizeInstitutionRole(role: string | null | undefined, locale: string) {
  if (!role) {
    return "";
  }

  const normalized = role.replace(/_/g, " ").trim();
  if (!normalized) {
    return "";
  }

  if (locale !== "en") {
    return normalized;
  }

  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
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
  const [relatedInsights, setRelatedInsights] = useState<RelatedInsight[]>([]);

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

    async function loadRelatedInsights() {
      try {
        const response = await fetch(`/api/public/insights?relatedEventId=${eventId}&pageSize=6`, {
          cache: "no-store",
        });
        const payload = await response.json();
        if (!cancelled && response.ok && payload.success) {
          setRelatedInsights(payload.data?.items ?? []);
        }
      } catch {
        if (!cancelled) {
          setRelatedInsights([]);
        }
      }
    }

    void loadRelatedInsights();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

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

  const getAgendaTitle = (item: AgendaItem) =>
    locale === "en" && item.titleEn ? item.titleEn : item.title;

  const getAgendaDescription = (item: AgendaItem) => {
    if (locale === "en") {
      return item.descriptionEn || "";
    }

    return item.description || item.descriptionEn || "";
  };

  const getAgendaSpeakerName = (speaker: AgendaSpeaker) =>
    locale === "en" && speaker.nameEn ? speaker.nameEn : speaker.name;

  const getAgendaSpeakerMeta = (speaker: AgendaSpeaker) => {
    const parts = locale === "en"
      ? [speaker.titleEn?.trim(), speaker.organizationEn?.trim()].filter(Boolean)
      : [speaker.title?.trim(), speaker.organization?.trim()].filter(Boolean);

    return parts.join(" · ");
  };

  const getAgendaTopic = (item: AgendaItem, speakerId: string) => {
    if (locale === "en") {
      return item.speakerMeta?.topicsEn?.[speakerId] || "";
    }

    return item.speakerMeta?.topics?.[speakerId] || "";
  };

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
    wrapCanvasTextLines(context, text, maxWidth, maxLines).forEach((line, index) => {
      context.fillText(line, x, y + index * lineHeight);
    });
  };

  const estimateLineCount = (
    context: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ) => wrapCanvasTextLines(context, text, maxWidth).length;

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

    context.fillStyle = "rgba(255,255,255,0.9)";
    context.font = "400 36px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    drawWrappedText(context, description, 130, descY, canvas.width - 260, 48, 3);

    context.fillStyle = "#d1fae5";
    context.font = "600 34px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    drawWrappedText(context, scheduleLabel, 130, scheduleY, canvas.width - 260, 44, 4);

    context.fillStyle = "rgba(255,255,255,0.85)";
    context.font = "400 32px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    const venueLineHeight = 42;
    const venueActualLines = Math.min(2, estimateLineCount(context, venue, canvas.width - 260));
    drawWrappedText(context, venue, 130, venueY, canvas.width - 260, venueLineHeight, 2);
    const qrBoxY = venueY + venueActualLines * venueLineHeight + 30;

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

  const buildEventPosterImage = async (shareUrl: string) => {
    if (!event) {
      throw new Error("Event not found");
    }

    const canvas = document.createElement("canvas");
    canvas.width = 1240;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas context unavailable");
    }

    const title = getLocalizedTitle(event, locale);
    const description = (getFullDescription(event, locale) || getLocalizedDescription(event, locale)).trim();
    const venue = locale === "en" ? event.venueEn || event.venue : event.venue;
    const address = locale === "en"
      ? event.addressEn || event.address || venue
      : event.address || venue;
    const scheduleLabel = getEventScheduleLabel(event, locale);
    const posterTitle = locale === "en" ? "Event Poster" : "活动海报";
    const overviewTitle = locale === "en" ? "Event Overview" : "活动信息";
    const agendaTitle = locale === "en" ? "Agenda" : "活动议程";
    const speakersTitle = locale === "en" ? "Featured Speakers" : "主要嘉宾";
    const institutionsTitle = locale === "en" ? "Partner Institutions" : "合作机构";
    const registerTitle = locale === "en" ? "Registration" : "报名方式";
    const defaultAgendaText = locale === "en" ? "Detailed agenda will be announced soon." : "详细议程将于近期公布。";
    const defaultSpeakerText = locale === "en" ? "Speaker lineup is being updated." : "嘉宾信息持续更新中。";
    const defaultInstitutionText = locale === "en" ? "Partner institutions are being updated." : "合作机构持续更新中。";

    context.font = "700 68px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    const titleLines = wrapCanvasTextLines(context, title, 960, 4);

    context.font = "400 30px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    const descriptionLines = wrapCanvasTextLines(context, description, 960, 16);

    context.font = "600 28px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    const scheduleLines = wrapCanvasTextLines(context, scheduleLabel, 880, 3);

    context.font = "400 25px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    const venueLines = wrapCanvasTextLines(context, address, 880, 3);

    const agendaEntries: Array<{ text: string; tone: "heading" | "body" }> = [];
    context.font = "500 24px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    if (groupedAgendaItems.length > 0) {
      groupedAgendaItems.forEach((group) => {
        agendaEntries.push({ text: formatAgendaDateLabel(group.date, locale), tone: "heading" });
        group.items.forEach((item) => {
          wrapCanvasTextLines(
            context,
            `${item.startTime}-${item.endTime} ${getAgendaTitle(item)}`,
            900,
            3
          ).forEach((line) => {
            agendaEntries.push({ text: line, tone: "body" });
          });
        });
      });
    } else {
      agendaEntries.push({ text: defaultAgendaText, tone: "body" });
    }

    const speakerMap = new Map<string, AgendaSpeaker>();
    (event.agendaItems ?? []).forEach((item) => {
      item.speakers.forEach((speaker) => {
        speakerMap.set(speaker.id, speaker);
      });
      if (item.moderator) {
        speakerMap.set(item.moderator.id, item.moderator);
      }
    });

    context.font = "500 24px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    const speakerEntries = Array.from(speakerMap.values())
      .sort((left, right) => Number(right.isKeynote) - Number(left.isKeynote))
      .slice(0, 12)
      .flatMap((speaker) => {
        const meta = getAgendaSpeakerMeta(speaker) || (locale === "en" ? "Guest speaker" : "嘉宾");
        return wrapCanvasTextLines(
          context,
          `${getAgendaSpeakerName(speaker)} · ${meta}`,
          900,
          2
        );
      });

    context.font = "500 24px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    const institutionEntries = (event.institutions ?? []).flatMap((item) => {
      const institutionName = locale === "en"
        ? item.institution.nameEn || item.institution.name
        : item.institution.name;
      const relation = humanizeInstitutionRole(item.role, locale);
      return wrapCanvasTextLines(
        context,
        relation ? `${institutionName} · ${relation}` : institutionName,
        900,
        2
      );
    });

    const agendaHeight = agendaEntries.reduce((total, entry) => total + (entry.tone === "heading" ? 42 : 34), 0);
    const speakerHeight = (speakerEntries.length > 0 ? speakerEntries.length : 1) * 34;
    const institutionHeight = (institutionEntries.length > 0 ? institutionEntries.length : 1) * 34;
    const infoBlockHeight = 140 + scheduleLines.length * 36 + venueLines.length * 32;
    const estimatedHeight = 260 + titleLines.length * 78 + descriptionLines.length * 42 + infoBlockHeight + agendaHeight + speakerHeight + institutionHeight + 520;

    canvas.height = Math.max(2200, Math.min(7600, estimatedHeight));

    const background = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    background.addColorStop(0, "#052e2b");
    background.addColorStop(0.45, "#0b4f46");
    background.addColorStop(1, "#e6fffb");
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "#ffffff";
    context.fillRect(52, 52, canvas.width - 104, canvas.height - 104);

    let y = 128;

    context.fillStyle = "#0f766e";
    context.font = "600 28px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    context.fillText(`Shanghai Climate Week 2026 · ${posterTitle}`, 110, y);
    y += 62;

    context.fillStyle = "#0f172a";
    context.font = "700 68px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    titleLines.forEach((line) => {
      context.fillText(line, 110, y);
      y += 78;
    });

    context.fillStyle = "#334155";
    context.font = "400 30px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    descriptionLines.forEach((line) => {
      context.fillText(line, 110, y);
      y += 42;
    });

    y += 18;
    context.fillStyle = "#ecfdf5";
    context.fillRect(110, y, 1020, infoBlockHeight);

    const metaText = [
      getEventTypeLabel(event.type, locale),
      getEventLayerLabel(event.eventLayer as any, locale),
      getEventHostTypeLabel(event.hostType as any, locale),
    ].filter(Boolean).join(" · ");

    context.fillStyle = "#0f172a";
    context.font = "700 32px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    context.fillText(overviewTitle, 140, y + 48);

    context.fillStyle = "#0f766e";
    context.font = "600 28px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    scheduleLines.forEach((line, index) => {
      context.fillText(line, 140, y + 92 + index * 36);
    });

    context.fillStyle = "#475569";
    context.font = "400 25px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    venueLines.forEach((line, index) => {
      context.fillText(line, 140, y + 92 + scheduleLines.length * 36 + 18 + index * 32);
    });

    if (metaText) {
      context.fillStyle = "#64748b";
      context.font = "500 22px 'PingFang SC', 'Microsoft YaHei', sans-serif";
      context.fillText(metaText, 140, y + infoBlockHeight - 18);
    }

    y += infoBlockHeight + 48;

    const drawSectionHeader = (label: string) => {
      context.fillStyle = "#0f172a";
      context.font = "700 34px 'PingFang SC', 'Microsoft YaHei', sans-serif";
      context.fillText(label, 110, y);
      context.strokeStyle = "#99f6e4";
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(330, y - 10);
      context.lineTo(1130, y - 10);
      context.stroke();
      y += 38;
    };

    drawSectionHeader(agendaTitle);
    agendaEntries.forEach((entry) => {
      if (entry.tone === "heading") {
        context.fillStyle = "#047857";
        context.font = "600 26px 'PingFang SC', 'Microsoft YaHei', sans-serif";
        context.fillText(entry.text, 120, y);
        y += 40;
        return;
      }

      context.fillStyle = "#334155";
      context.font = "400 24px 'PingFang SC', 'Microsoft YaHei', sans-serif";
      context.fillText(entry.text, 140, y);
      y += 34;
    });

    y += 20;
    drawSectionHeader(speakersTitle);
    const speakerLinesToDraw = speakerEntries.length > 0 ? speakerEntries : [defaultSpeakerText];
    context.fillStyle = "#334155";
    context.font = "400 24px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    speakerLinesToDraw.forEach((line) => {
      context.fillText(line, 140, y);
      y += 34;
    });

    y += 20;
    drawSectionHeader(institutionsTitle);
    const institutionLinesToDraw = institutionEntries.length > 0 ? institutionEntries : [defaultInstitutionText];
    context.fillStyle = "#334155";
    context.font = "400 24px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    institutionLinesToDraw.forEach((line) => {
      context.fillText(line, 140, y);
      y += 34;
    });

    y += 24;

    const qrBlockY = y;
    context.fillStyle = "#0f766e";
    context.fillRect(110, qrBlockY, 1020, 320);

    context.fillStyle = "#ffffff";
    context.font = "700 34px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    context.fillText(registerTitle, 150, qrBlockY + 58);

    context.font = "400 24px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    drawWrappedText(
      context,
      locale === "en"
        ? "Scan the QR code to register and view the full event details."
        : "扫描二维码即可报名并查看完整活动详情。",
      150,
      qrBlockY + 106,
      560,
      32,
      3
    );

    drawWrappedText(
      context,
      `${locale === "en" ? "Event link" : "活动链接"}: ${shareUrl}`,
      150,
      qrBlockY + 186,
      560,
      30,
      4
    );

    context.fillStyle = "#ffffff";
    context.fillRect(842, qrBlockY + 35, 220, 220);

    const qrDataUrl = await QRCode.toDataURL(shareUrl, {
      width: 220,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    });
    const qrImage = await loadImageElement(qrDataUrl);
    context.drawImage(qrImage, 842, qrBlockY + 35, 220, 220);

    context.fillStyle = "#ffffff";
    context.font = "600 24px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    context.textAlign = "center";
    context.fillText(t("register.sharePosterScan"), 952, qrBlockY + 286);
    context.textAlign = "start";

    return canvas.toDataURL("image/png");
  };

  const handleGenerateQr = async (mode: "poster" | "qr" | "event-poster") => {
    if (!event) {
      return;
    }

    try {
      const shareUrl = getShareUrl();
      const dateSlug = event.startDate
        ? event.startDate.slice(0, 10).replace(/-/g, "")
        : "nodate";
      const titleSlug = (locale === "en" ? event.titleEn || event.title : event.title)
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fff]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40);
      const baseName = `event-${dateSlug}-${titleSlug}-${mode}`;

      if (mode === "event-poster") {
        const poster = await buildEventPosterImage(shareUrl);
        setSharePreviewImage(poster);
        setSharePreviewTitle(t("register.shareEventPoster"));
        setSharePreviewFileName(`${baseName}.png`);
        setSharePreviewOpen(true);
        downloadDataUrl(poster, `${baseName}.png`);
        toast.success(t("register.shareEventPosterReady"));
        return;
      }

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
  const {
    googleMapsEmbed,
    googleMapsLink,
    appleMapsLink,
    osmLink,
    tencentMapsLink,
    primaryActionLink,
  } = buildEventMapLinks({
    locale,
    venue: localizedVenue,
    address: localizedAddress,
    city: localizedCity,
  });

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(
        [localizedVenue, localizedAddress, localizedCity].filter(Boolean).join(", ")
      );
      toast.success(t("locationCopied"));
    } catch {
      toast.error(t("loadError"));
    }
  };

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

                      {relatedInsights.length > 0 && (
                        <div className="mt-8 rounded-xl border border-emerald-100 bg-emerald-50/40 p-5">
                          <h3 className="text-lg font-bold text-slate-900 mb-3">
                            {locale === "en" ? "Related Knowledge Outputs" : "相关知识成果"}
                          </h3>
                          <div className="space-y-2">
                            {relatedInsights.map((insight) => (
                              <Link key={insight.id} href={`/insights/${insight.slug}`}>
                                <div className="flex items-center justify-between rounded-lg border border-emerald-100 bg-white px-4 py-3 transition-colors hover:border-emerald-300">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-900">
                                      {locale === "en" && insight.titleEn ? insight.titleEn : insight.title}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {insight.type}
                                      {insight.publishDate
                                        ? ` · ${new Date(insight.publishDate).toLocaleDateString(locale === "en" ? "en-US" : "zh-CN")}`
                                        : ""}
                                    </p>
                                  </div>
                                  <FileText className="ml-3 h-4 w-4 shrink-0 text-emerald-600" />
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
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
                                    <h4 className="font-semibold text-slate-900">
                                      {getAgendaTitle(item)}
                                    </h4>
                                    <Badge variant="outline" className="shrink-0 text-xs">
                                      {t.has(`agenda.types.${item.type}`) ? t(`agenda.types.${item.type}` as Parameters<typeof t>[0]) : item.type}
                                    </Badge>
                                  </div>
                                  {getAgendaDescription(item) && (
                                    <p className="text-sm text-slate-600 mb-2">
                                      {getAgendaDescription(item)}
                                    </p>
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
                                            const name = getAgendaSpeakerName(speaker);
                                            const meta = getAgendaSpeakerMeta(speaker);
                                            const topic = getAgendaTopic(item, speaker.id);
                                            return (
                                              <div key={speaker.id} className="flex items-start gap-2">
                                                <Avatar className="mt-0.5 h-5 w-5 shrink-0">
                                                  <AvatarImage src={speaker.avatar || undefined} />
                                                  <AvatarFallback className="text-[10px]">
                                                    {name.charAt(0)}
                                                  </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1">
                                                  <div className="flex min-h-5 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                                    <span className="text-xs font-medium leading-5 text-slate-700">
                                                      {name}
                                                    </span>
                                                    {meta ? (
                                                      <span className="text-xs leading-5 text-slate-400">
                                                        {meta}
                                                      </span>
                                                    ) : null}
                                                  </div>
                                                  {topic && (
                                                    <div className="mt-0.5 text-xs font-bold leading-5 text-slate-600">{topic}</div>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                      </div>
                                    </div>
                                  )}
                                  {item.moderator && (
                                    <div className="mt-1 flex items-start gap-2 pl-0">
                                      <span className="shrink-0 pt-0.5 text-xs text-slate-400">
                                        {locale === "zh" ? "主持：" : "Host:"}
                                      </span>
                                      <div className="flex min-w-0 flex-1 items-start gap-2">
                                        <Avatar className="mt-0.5 h-5 w-5 shrink-0">
                                          <AvatarImage src={item.moderator.avatar || undefined} />
                                          <AvatarFallback className="text-[10px]">
                                            {getAgendaSpeakerName(item.moderator).charAt(0)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex min-h-5 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                          <span className="text-xs font-medium leading-5 text-amber-700">
                                            {getAgendaSpeakerName(item.moderator)}
                                          </span>
                                          {getAgendaSpeakerMeta(item.moderator) ? (
                                            <span className="text-xs leading-5 text-slate-400">
                                              {getAgendaSpeakerMeta(item.moderator)}
                                            </span>
                                          ) : null}
                                        </div>
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
                      <DropdownMenuContent align="end" className="w-60">
                        <DropdownMenuItem onClick={() => void handleGenerateQr("event-poster")}>
                          {t("register.shareEventPoster")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void handleGenerateQr("poster")}>
                          {t("register.sharePoster")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void handleGenerateQr("qr")}>
                          {t("register.shareQrOnly")}
                        </DropdownMenuItem>
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
                        href={primaryActionLink}
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
                  <div className="flex flex-wrap gap-2">
                    {locale === "en" ? (
                      <>
                        <a href={googleMapsLink} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[120px]">
                          <Button variant="outline" className="w-full" size="sm">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Google Maps
                          </Button>
                        </a>
                        <a href={appleMapsLink} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[120px]">
                          <Button variant="outline" className="w-full" size="sm">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Apple Maps
                          </Button>
                        </a>
                        <a href={osmLink} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[120px]">
                          <Button variant="outline" className="w-full" size="sm">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            OpenStreetMap
                          </Button>
                        </a>
                      </>
                    ) : (
                      <>
                        <a href={tencentMapsLink} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[120px]">
                          <Button variant="outline" className="w-full" size="sm">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            腾讯地图
                          </Button>
                        </a>
                        <a href={appleMapsLink} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[120px]">
                          <Button variant="outline" className="w-full" size="sm">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Apple 地图
                          </Button>
                        </a>
                        <Button variant="outline" className="flex-1 min-w-[120px]" size="sm" onClick={() => void handleCopyAddress()}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          {t("copyAddress")}
                        </Button>
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
