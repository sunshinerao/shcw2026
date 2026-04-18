"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import QRCode from "qrcode";
import {
  ArrowLeft,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Edit2,
  MapPin,
  Plus,
  QrCode,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdminSectionGuard } from "@/components/admin/admin-section-guard";
import { Link } from "@/i18n/routing";
import {
  doAgendaSlotsOverlap,
  isAgendaDateWithinEventRange,
  isAgendaTimeRangeValid,
  normalizeAgendaDateKey,
} from "@/lib/agenda";
import { getEventDateRangeLabel, getEventTimeSummaryLabel, type EventDateSlot } from "@/lib/data/events";

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
  eventId: string;
  agendaDate: string;
  title: string;
  titleEn?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
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

type EventInfo = {
  id: string;
  title: string;
  titleEn?: string | null;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  eventDateSlots?: EventDateSlot[];
  venue: string;
};

const AGENDA_TYPES = ["opening", "keynote", "panel", "workshop", "sharing", "launch", "ceremony", "summary", "break", "networking"] as const;

const EVENT_INSTITUTION_ROLES = [
  "organizer",
  "co_organizer",
  "supporter",
  "knowledge_partner",
  "media_partner",
] as const;

type EventInstitutionItem = {
  eventId: string;
  institutionId: string;
  role: string | null;
  order: number;
  institution: {
    id: string;
    slug: string;
    name: string;
    nameEn: string | null;
    logo: string | null;
    orgType: string | null;
  };
};

type InstitutionOption = {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  logo: string | null;
  orgType: string | null;
};

type VerifierAssignment = {
  userId: string;
  eventId: string;
  assignedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    role: string;
  };
};

type VerifierUserOption = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
};

type AgendaFormState = {
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  agendaDate: string;
  startTime: string;
  endTime: string;
  type: string;
  venue: string;
  order: number;
  speakerIds: string[];
  moderatorId: string;
  speakerTopics: Record<string, string>;
  speakerTopicsEn: Record<string, string>;
};

const initialAgendaForm: AgendaFormState = {
  title: "",
  titleEn: "",
  description: "",
  descriptionEn: "",
  agendaDate: "",
  startTime: "09:00",
  endTime: "09:30",
  type: "keynote",
  venue: "",
  order: 0,
  speakerIds: [],
  moderatorId: "",
  speakerTopics: {},
  speakerTopicsEn: {},
};

// New speaker inline form state
type NewSpeakerForm = {
  name: string;
  nameEn: string;
  title: string;
  titleEn: string;
  organization: string;
  organizationEn: string;
  isKeynote: boolean;
};

const initialNewSpeakerForm: NewSpeakerForm = {
  name: "",
  nameEn: "",
  title: "",
  titleEn: "",
  organization: "",
  organizationEn: "",
  isKeynote: false,
};

function formatAgendaDateLabel(dateValue: string, locale: string) {
  const normalized = normalizeAgendaDateKey(dateValue);
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${normalized}T12:00:00`));
}

export default function EventAgendaPage({
  params,
}: {
  params: { id: string };
}) {
  const t = useTranslations("adminEventsPage.agenda");
  const locale = useLocale();
  const eventId = params.id;

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [allSpeakers, setAllSpeakers] = useState<AgendaSpeaker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserStaffPermissions, setCurrentUserStaffPermissions] = useState<string | null>(null);

  // Dialog state
  const [isAgendaDialogOpen, setIsAgendaDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSpeakerPickerOpen, setIsSpeakerPickerOpen] = useState(false);
  const [isNewSpeakerDialogOpen, setIsNewSpeakerDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<AgendaItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<"speakers" | "moderator">("speakers");

  const [form, setForm] = useState<AgendaFormState>(initialAgendaForm);
  const [speakerSearch, setSpeakerSearch] = useState("");
  const [newSpeakerForm, setNewSpeakerForm] = useState<NewSpeakerForm>(initialNewSpeakerForm);
  const canManageSpeakersFlag = currentUserRole === "ADMIN" || currentUserRole === "EVENT_MANAGER" || (currentUserStaffPermissions?.includes("speakers") ?? false);
  const canViewHiddenSpeakers = currentUserRole === "ADMIN" || (currentUserStaffPermissions?.includes("speakers") ?? false);

  // Institution association state
  const [eventInstitutions, setEventInstitutions] = useState<EventInstitutionItem[]>([]);
  const [allInstitutions, setAllInstitutions] = useState<InstitutionOption[]>([]);
  const [isInstitutionPickerOpen, setIsInstitutionPickerOpen] = useState(false);
  const [institutionSearch, setInstitutionSearch] = useState("");
  const [institutionRoleMap, setInstitutionRoleMap] = useState<Record<string, string>>({});
  const [assignedVerifiers, setAssignedVerifiers] = useState<VerifierAssignment[]>([]);
  const [verifierOptions, setVerifierOptions] = useState<VerifierUserOption[]>([]);
  const [selectedVerifierId, setSelectedVerifierId] = useState("");
  const [venueCheckinSecret, setVenueCheckinSecret] = useState<string | null>(null);
  const [venueQrSvg, setVenueQrSvg] = useState("");
  const [siteOrigin, setSiteOrigin] = useState("");
  const [isVerifierSubmitting, setIsVerifierSubmitting] = useState(false);
  const [isVenueQrSubmitting, setIsVenueQrSubmitting] = useState(false);

  const setMessage = (tone: "success" | "error", msg: string) => {
    setStatusTone(tone);
    setStatusMessage(msg);
  };

  // Load event info
  const loadEvent = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setEvent(data.data);
      }
    } catch {
      // ignore
    }
  }, [eventId]);

  // Load agenda items
  const loadAgenda = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/agenda`);
      const data = await res.json();
      if (res.ok && data.success) {
        setAgendaItems(data.data);
      }
    } catch {
      // ignore
    }
  }, [eventId]);

  // Load all speakers from library
  const loadSpeakers = useCallback(async () => {
    try {
      const collected: AgendaSpeaker[] = [];
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const query = `/api/speakers?page=${page}&limit=200${canViewHiddenSpeakers ? "&includeHidden=true" : ""}`;
        const res = await fetch(query, { cache: "no-store" });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load speakers");
        }

        const pageItems = Array.isArray(data?.data) ? (data.data as AgendaSpeaker[]) : [];
        collected.push(
          ...pageItems.map((s) => ({
            id: s.id,
            name: s.name,
            nameEn: s.nameEn,
            avatar: s.avatar,
            title: s.title,
            titleEn: s.titleEn,
            organization: s.organization,
            organizationEn: s.organizationEn,
            isKeynote: s.isKeynote,
          }))
        );

        totalPages = Math.max(1, Number(data?.pagination?.totalPages || 1));
        page += 1;
      }

      const deduped = Array.from(new Map(collected.map((speaker) => [speaker.id, speaker])).values());
      setAllSpeakers(deduped);
    } catch {
      // ignore
    }
  }, [canViewHiddenSpeakers]);

  // Load institutions linked to this event
  const loadEventInstitutions = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/institutions`);
      const data = await res.json();
      if (res.ok && data.success) {
        setEventInstitutions(data.data as EventInstitutionItem[]);
      }
    } catch {
      // ignore
    }
  }, [eventId]);

  // Load full institution library for picker
  const loadAllInstitutions = useCallback(async () => {
    try {
      const res = await fetch("/api/institutions?limit=200&isActive=true");
      const data = await res.json();
      if (res.ok && data.data) {
        setAllInstitutions(data.data as InstitutionOption[]);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadVerifierAssignments = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/verifiers`);
      const data = await res.json();
      if (res.ok && data.success) {
        setAssignedVerifiers(data.data as VerifierAssignment[]);
      }
    } catch {
      // ignore
    }
  }, [eventId]);

  const loadVerifierOptions = useCallback(async () => {
    try {
      const res = await fetch("/api/users?pageSize=200&role=VERIFIER", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success) {
        setVerifierOptions((data.data?.users || []) as VerifierUserOption[]);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadVenueQr = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/venue-qr`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success) {
        setVenueCheckinSecret(data.data?.venueCheckinSecret || null);
      }
    } catch {
      // ignore
    }
  }, [eventId]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      loadEvent(),
      loadAgenda(),
      loadSpeakers(),
      loadEventInstitutions(),
      loadAllInstitutions(),
      loadVerifierAssignments(),
      loadVerifierOptions(),
      loadVenueQr(),
    ]).finally(() => setIsLoading(false));
  }, [
    loadEvent,
    loadAgenda,
    loadSpeakers,
    loadEventInstitutions,
    loadAllInstitutions,
    loadVerifierAssignments,
    loadVerifierOptions,
    loadVenueQr,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUserRole() {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) {
          setCurrentUserRole(data?.user?.role || null);
          setCurrentUserStaffPermissions(data?.user?.staffPermissions || null);
        }
      } catch {
        if (!cancelled) {
          setCurrentUserRole(null);
          setCurrentUserStaffPermissions(null);
        }
      }
    }

    if (typeof window !== "undefined") {
      setSiteOrigin(window.location.origin);
    }

    void loadCurrentUserRole();

    return () => {
      cancelled = true;
    };
  }, []);

  const getSpeakerName = (s: AgendaSpeaker) =>
    locale === "en" && s.nameEn ? s.nameEn : s.name;

  const getSpeakerTitle = (s: AgendaSpeaker) =>
    locale === "en" && s.titleEn ? s.titleEn : s.title;

  const getSpeakerOrg = (s: AgendaSpeaker) =>
    locale === "en" && s.organizationEn ? s.organizationEn : s.organization;

  const getAgendaTitle = (item: AgendaItem) =>
    locale === "en" && item.titleEn ? item.titleEn : item.title;

  const getAgendaDescription = (item: AgendaItem) => {
    if (locale === "en") {
      return item.descriptionEn || "";
    }

    return item.description || item.descriptionEn || "";
  };

  const getAgendaTopic = (item: AgendaItem, speakerId: string) => {
    if (locale === "en") {
      return item.speakerMeta?.topicsEn?.[speakerId] || "";
    }

    return item.speakerMeta?.topics?.[speakerId] || "";
  };

  const getAgendaTypeLabel = (type: string) => {
    const key = type as (typeof AGENDA_TYPES)[number];
    try {
      return t(`types.${key}`);
    } catch {
      return type;
    }
  };

  const agendaTypeColors: Record<string, string> = {
    opening: "bg-orange-100 text-orange-700",
    keynote: "bg-purple-100 text-purple-700",
    panel: "bg-blue-100 text-blue-700",
    workshop: "bg-amber-100 text-amber-700",
    sharing: "bg-teal-100 text-teal-700",
    launch: "bg-rose-100 text-rose-700",
    ceremony: "bg-pink-100 text-pink-700",
    summary: "bg-cyan-100 text-cyan-700",
    break: "bg-slate-100 text-slate-600",
    networking: "bg-emerald-100 text-emerald-700",
  };

  // Selected speakers in form — ordered by speakerIds array
  const selectedSpeakers = useMemo(() => {
    return form.speakerIds
      .map((id) => allSpeakers.find((s) => s.id === id))
      .filter((s): s is AgendaSpeaker => !!s);
  }, [allSpeakers, form.speakerIds]);

  // Selected moderator in form
  const selectedModerator = useMemo(() => {
    if (!form.moderatorId) return null;
    return allSpeakers.find((s) => s.id === form.moderatorId) || null;
  }, [allSpeakers, form.moderatorId]);

  // Filtered speakers for picker
  const filteredSpeakers = useMemo(() => {
    const query = speakerSearch.toLowerCase().trim();
    return allSpeakers.filter((s) => {
      if (pickerTarget === "speakers" && form.speakerIds.includes(s.id)) return false;
      if (pickerTarget === "moderator" && form.moderatorId === s.id) return false;
      if (!query) return true;
      return (
        s.name.toLowerCase().includes(query) ||
        (s.nameEn?.toLowerCase().includes(query) ?? false) ||
        s.organization.toLowerCase().includes(query) ||
        (s.organizationEn?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [allSpeakers, speakerSearch, form.speakerIds, form.moderatorId, pickerTarget]);

  // Filtered institutions for picker (exclude already-linked ones)
  const filteredInstitutions = useMemo(() => {
    const linkedIds = new Set(eventInstitutions.map((ei) => ei.institutionId));
    const query = institutionSearch.toLowerCase().trim();
    return allInstitutions.filter((inst) => {
      if (linkedIds.has(inst.id)) return false;
      if (!query) return true;
      return (
        inst.name.toLowerCase().includes(query) ||
        (inst.nameEn?.toLowerCase().includes(query) ?? false) ||
        (inst.slug.toLowerCase().includes(query) ?? false)
      );
    });
  }, [allInstitutions, eventInstitutions, institutionSearch]);

  const availableVerifierOptions = useMemo(() => {
    const assignedIds = new Set(assignedVerifiers.map((item) => item.userId));
    return verifierOptions.filter((user) => !assignedIds.has(user.id));
  }, [assignedVerifiers, verifierOptions]);

  const venueCheckinUrl = useMemo(() => {
    if (!siteOrigin || !venueCheckinSecret) return "";
    return `${siteOrigin}/${locale}/self-checkin?eventId=${encodeURIComponent(eventId)}&secret=${encodeURIComponent(venueCheckinSecret)}`;
  }, [siteOrigin, venueCheckinSecret, locale, eventId]);

  useEffect(() => {
    if (!venueCheckinUrl) {
      setVenueQrSvg("");
      return;
    }

    QRCode.toString(venueCheckinUrl, {
      type: "svg",
      width: 220,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((svg) => setVenueQrSvg(svg))
      .catch(() => setVenueQrSvg(""));
  }, [venueCheckinUrl]);

  const addEventInstitution = async (institutionId: string) => {
    const role = institutionRoleMap[institutionId] ?? null;
    try {
      const res = await fetch(`/api/events/${eventId}/institutions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId, role, order: eventInstitutions.length }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEventInstitutions((prev) => [...prev, data.data as EventInstitutionItem]);
        setInstitutionRoleMap((prev) => ({ ...prev, [institutionId]: "" }));
        setMessage("success", locale === "zh" ? "机构已关联" : "Institution linked");
      } else {
        setMessage("error", data.error || "Failed");
      }
    } catch {
      setMessage("error", "Failed to link institution");
    }
  };

  const removeEventInstitution = async (institutionId: string) => {
    try {
      const res = await fetch(`/api/events/${eventId}/institutions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId }),
      });
      if (res.ok) {
        setEventInstitutions((prev) => prev.filter((ei) => ei.institutionId !== institutionId));
        setMessage("success", locale === "zh" ? "机构已移除" : "Institution removed");
      }
    } catch {
      setMessage("error", "Failed to remove institution");
    }
  };

  const assignVerifierToEvent = async () => {
    if (!selectedVerifierId) return;

    setIsVerifierSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/verifiers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedVerifierId }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || (locale === "zh" ? "分配失败" : "Assignment failed"));
      }

      setSelectedVerifierId("");
      await loadVerifierAssignments();
      setMessage("success", locale === "zh" ? "验证人员已分配到本活动" : "Verifier assigned to this event");
    } catch (error) {
      setMessage("error", error instanceof Error ? error.message : "Failed");
    } finally {
      setIsVerifierSubmitting(false);
    }
  };

  const removeVerifierFromEvent = async (userId: string) => {
    setIsVerifierSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/verifiers?userId=${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (locale === "zh" ? "移除失败" : "Remove failed"));
      }
      await loadVerifierAssignments();
      setMessage("success", locale === "zh" ? "已移除该活动验证权限" : "Verifier removed from this event");
    } catch (error) {
      setMessage("error", error instanceof Error ? error.message : "Failed");
    } finally {
      setIsVerifierSubmitting(false);
    }
  };

  const generateVenueQr = async () => {
    setIsVenueQrSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/venue-qr`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (locale === "zh" ? "生成失败" : "Failed to generate"));
      }
      setVenueCheckinSecret(data.data?.venueCheckinSecret || null);
      setMessage("success", locale === "zh" ? "现场签到二维码已生成" : "Venue self-check-in QR generated");
    } catch (error) {
      setMessage("error", error instanceof Error ? error.message : "Failed");
    } finally {
      setIsVenueQrSubmitting(false);
    }
  };

  const copyVenueCheckinLink = async () => {
    if (!venueCheckinUrl) return;
    try {
      await navigator.clipboard.writeText(venueCheckinUrl);
      setMessage("success", locale === "zh" ? "签到链接已复制" : "Check-in link copied");
    } catch {
      setMessage("error", locale === "zh" ? "复制失败，请手动复制" : "Copy failed, please copy manually");
    }
  };

  const downloadVenueQr = () => {
    if (!venueQrSvg || !event) return;

    const eventTitle = (locale === "en" && event.titleEn ? event.titleEn : event.title)
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim();
    const fileBaseName = locale === "zh"
      ? `${eventTitle}-现场签到二维码`
      : `${eventTitle}-venue-checkin-qr`;

    const blob = new Blob([venueQrSvg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${fileBaseName}.svg`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadCheckinPoster = async () => {
    if (!venueCheckinUrl || !event) return;

    const W = 2480; // A4 300dpi
    const H = 3508;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#08111f");
    bg.addColorStop(0.45, "#0b172c");
    bg.addColorStop(1, "#091322");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Grid overlay
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx < W; gx += 56) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += 56) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }

    // Decorative orbs
    const drawOrb = (cx: number, cy: number, r: number, color: string) => {
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, color);
      grad.addColorStop(0.6, color.replace(/[\d.]+\)$/, "0.03)"));
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    };
    drawOrb(W * 0.85, H * 0.18, 700, "rgba(34,197,94,0.18)");
    drawOrb(W * 0.15, H * 0.82, 500, "rgba(56,189,248,0.16)");

    const px = 190; // left padding
    let y = 210;
    const font = (w: string, s: number) => `${w} ${s}px 'PingFang SC', 'Microsoft YaHei', 'Inter', sans-serif`;

    // Tag pill
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 2;
    const tagText = "Climate Check-in · Event Access";
    ctx.font = font("500", 28);
    const tagW = ctx.measureText(tagText).width + 70;
    const drawPill = (x: number, py: number, pw: number, ph: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, py); ctx.lineTo(x + pw - r, py);
      ctx.arcTo(x + pw, py, x + pw, py + r, r);
      ctx.lineTo(x + pw, py + ph - r);
      ctx.arcTo(x + pw, py + ph, x + pw - r, py + ph, r);
      ctx.lineTo(x + r, py + ph);
      ctx.arcTo(x, py + ph, x, py + ph - r, r);
      ctx.lineTo(x, py + r);
      ctx.arcTo(x, py, x + r, py, r);
      ctx.closePath();
    };
    drawPill(px, y, tagW, 56, 28);
    ctx.fill(); ctx.stroke();
    // Tag dot
    const gDot = ctx.createLinearGradient(px + 24, y + 20, px + 40, y + 36);
    gDot.addColorStop(0, "#4ade80"); gDot.addColorStop(1, "#38bdf8");
    ctx.fillStyle = gDot;
    ctx.beginPath(); ctx.arc(px + 32, y + 28, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.font = font("500", 28);
    ctx.fillText(tagText, px + 54, y + 38);
    y += 150;

    // Headline CN
    ctx.fillStyle = "#ffffff";
    ctx.font = font("700", 56);
    ctx.fillText("扫码签到，留下您的气候足迹", px, y);
    y += 80;
    // Big headline with gradient
    ctx.font = font("800", 86);
    const headGrad = ctx.createLinearGradient(px, y, px + 800, y);
    headGrad.addColorStop(0, "#ffffff");
    headGrad.addColorStop(0.38, "#c7f9d4");
    headGrad.addColorStop(1, "#a5f3fc");
    ctx.fillStyle = headGrad;
    ctx.fillText("开启您的气候之旅", px, y);
    y += 80;

    // Headline EN
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = font("500", 36);
    ctx.fillText("Scan to check in, leave your climate footprint,", px, y);
    y += 52;
    ctx.fillText("and begin your climate journey.", px, y);
    y += 120;

    // Subtext CN
    ctx.fillStyle = "rgba(255,255,255,0.84)";
    ctx.font = font("400", 32);
    const subCn = "欢迎来到本场活动。完成签到后，系统将为您记录本次参与行为，创建本场活动证书，并持续积累您的气候信用，沉淀成为您个人\u201C气候护照\u201D的重要行动记录。";
    const wrapText = (text: string, maxW: number, lineH: number) => {
      const chars = text.split("");
      let line = "";
      for (const ch of chars) {
        if (ctx.measureText(line + ch).width > maxW) {
          ctx.fillText(line, px, y); y += lineH; line = ch;
        } else { line += ch; }
      }
      if (line) { ctx.fillText(line, px, y); y += lineH; }
    };
    wrapText(subCn, W - px * 2, 60);
    y += 16;

    // Subtext EN
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = font("400", 30);
    const subEn = "Welcome to this event. After check-in, your participation will be recorded in the system, an event certificate will be created for you, and your climate credit will continue to accumulate as part of your personal Climate Passport journey.";
    wrapText(subEn, W - px * 2, 54);
    y += 80;

    // Feature cards
    const features = [
      { label: "Check-in", cn: "现场扫码签到", en: "Scan on-site for verified event check-in" },
      { label: "Certificate", cn: "自动生成活动证书", en: "Generate your event certificate automatically" },
      { label: "Climate Credit", cn: "积累个人气候信用", en: "Build your personal climate credit record" },
    ];
    const cardW = (W - px * 2 - 40) / 3;
    const cardH = 200;
    features.forEach((f, i) => {
      const cx = px + i * (cardW + 20);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 2;
      drawPill(cx, y, cardW, cardH, 36);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = font("500", 24);
      ctx.fillText(f.label.toUpperCase(), cx + 30, y + 44);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.font = font("600", 36);
      ctx.fillText(f.cn, cx + 30, y + 100);
      ctx.fillStyle = "rgba(255,255,255,0.66)";
      ctx.font = font("400", 24);
      ctx.fillText(f.en, cx + 30, y + 146);
      // Wrap en text if needed
      if (ctx.measureText(f.en).width > cardW - 60) {
        // Already handled by shorter text, OK
      }
    });
    y += cardH + 80;

    // Bottom section: Steps (left) + QR panel (right)
    const bottomY = y;
    const qrPanelW = 520;
    const qrPanelH = 680;
    const stepsW = W - px * 2 - qrPanelW - 120;
    const stepsX = px;
    const qrPanelX = W - px - qrPanelW;

    // Steps card
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    drawPill(stepsX, bottomY, stepsW, qrPanelH, 48);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.font = font("500", 28);
    ctx.fillText("How it works · 签到流程", stepsX + 40, bottomY + 56);

    const steps = [
      { cn: "使用手机扫描右侧二维码，进入活动签到页面。", en: "Use your phone to scan the QR code and enter the event check-in page." },
      { cn: "完成签到后，您的参与记录将与个人气候护照关联。", en: "Once completed, your participation record will be linked to your personal Climate Passport." },
      { cn: "活动结束后，您将获得本场活动证书，并沉淀可持续行动信用。", en: "After the event, you will receive an event certificate and accumulate verified sustainability action credit." },
    ];

    let sy = bottomY + 110;
    steps.forEach((s, i) => {
      // Number circle
      const numGrad = ctx.createLinearGradient(stepsX + 40, sy, stepsX + 100, sy + 20);
      numGrad.addColorStop(0, "#4ade80"); numGrad.addColorStop(1, "#38bdf8");
      ctx.fillStyle = numGrad;
      ctx.beginPath(); ctx.arc(stepsX + 62, sy + 6, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#04111d";
      ctx.font = font("700", 28);
      ctx.fillText(String(i + 1), stepsX + 53, sy + 16);

      // Step text
      const textX = stepsX + 110;
      const textMaxW = stepsW - 150;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = font("400", 30);
      // Wrap CN
      let line = "";
      let ty = sy;
      for (const ch of s.cn.split("")) {
        if (ctx.measureText(line + ch).width > textMaxW) {
          ctx.fillText(line, textX, ty); ty += 48; line = ch;
        } else { line += ch; }
      }
      if (line) { ctx.fillText(line, textX, ty); ty += 48; }

      ctx.fillStyle = "rgba(255,255,255,0.62)";
      ctx.font = font("400", 26);
      line = "";
      for (const ch of s.en.split("")) {
        if (ctx.measureText(line + ch).width > textMaxW) {
          ctx.fillText(line, textX, ty); ty += 42; line = ch;
        } else { line += ch; }
      }
      if (line) { ctx.fillText(line, textX, ty); ty += 42; }

      sy = ty + 24;
    });

    // QR panel (white card)
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 18;
    drawPill(qrPanelX, bottomY, qrPanelW, qrPanelH, 44);
    ctx.fill();
    ctx.restore();

    // QR code
    const qrSize = 340;
    const qrX = qrPanelX + (qrPanelW - qrSize) / 2;
    const qrY = bottomY + 30;
    // White border
    ctx.fillStyle = "#ffffff";
    drawPill(qrX - 16, qrY, qrSize + 32, qrSize + 32, 32);
    ctx.fill();
    ctx.strokeStyle = "rgba(15,23,42,0.08)";
    ctx.lineWidth = 2;
    drawPill(qrX - 16, qrY, qrSize + 32, qrSize + 32, 32);
    ctx.stroke();

    const qrDataUrl = await QRCode.toDataURL(venueCheckinUrl, {
      width: qrSize,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    });
    const qrImg = await new Promise<HTMLImageElement>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = qrDataUrl;
    });
    ctx.drawImage(qrImg, qrX, qrY + 16, qrSize, qrSize);

    // QR panel text
    const qrTextY = qrY + qrSize + 60;
    ctx.fillStyle = "#0f172a";
    ctx.font = font("700", 40);
    ctx.textAlign = "center";
    ctx.fillText("请扫码签到", qrPanelX + qrPanelW / 2, qrTextY);
    ctx.fillStyle = "#1e293b";
    ctx.font = font("400", 28);
    ctx.fillText("完成签到，留下您可信的气候行动记录", qrPanelX + qrPanelW / 2, qrTextY + 52);
    ctx.fillStyle = "#475569";
    ctx.font = font("400", 24);
    ctx.fillText("Scan to check in and start building", qrPanelX + qrPanelW / 2, qrTextY + 104);
    ctx.fillText("your verified climate footprint.", qrPanelX + qrPanelW / 2, qrTextY + 138);
    ctx.textAlign = "start";

    // Footer
    const footY = H - 100;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = font("600", 24);
    ctx.fillText("Climate Passport · Event Check-in Poster", px, footY);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = font("400", 22);
    ctx.textAlign = "right";
    ctx.fillText("请将此海报打印后张贴在会场入口", W - px, footY - 12);
    ctx.fillText("Print this poster and place it at the venue entrance.", W - px, footY + 20);
    ctx.textAlign = "start";

    // Download
    const eventTitle = (locale === "en" && event.titleEn ? event.titleEn : event.title)
      .replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
    const fileName = locale === "zh"
      ? `${eventTitle}-现场签到海报.png`
      : `${eventTitle}-checkin-poster.png`;
    const dataUrl = canvas.toDataURL("image/png");
    const anchor = document.createElement("a");
    anchor.href = dataUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const openCreateDialog = () => {
    setEditingItem(null);
    const defaultDate = event ? normalizeAgendaDateKey(event.startDate) : "";
    const sameDay = agendaItems.filter(
      (a) => normalizeAgendaDateKey(a.agendaDate) === defaultDate
    );
    const lastEndTime = sameDay.length
      ? sameDay.reduce(
          (latest, a) => (a.endTime > latest ? a.endTime : latest),
          "00:00"
        )
      : "09:00";
    const [h, m] = lastEndTime.split(":").map(Number);
    const endMinutes = h * 60 + m + 30;
    const autoEnd = `${String(Math.floor(endMinutes / 60) % 24).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
    const nextOrder = agendaItems.reduce((max, item) => Math.max(max, item.order), -1) + 1;
    setForm({
      ...initialAgendaForm,
      agendaDate: defaultDate,
      order: nextOrder,
      startTime: lastEndTime,
      endTime: autoEnd,
    });
    setIsAgendaDialogOpen(true);
  };

  const openEditDialog = (item: AgendaItem) => {
    setEditingItem(item);
    const orderedIds = item.speakerMeta?.orderedIds?.length
      ? item.speakerMeta.orderedIds.filter((id) => item.speakers.some((s) => s.id === id))
      : item.speakers.map((s) => s.id);
    setForm({
      title: item.title,
      titleEn: item.titleEn || "",
      description: item.description || "",
      descriptionEn: item.descriptionEn || "",
      agendaDate: normalizeAgendaDateKey(item.agendaDate),
      startTime: item.startTime,
      endTime: item.endTime,
      type: item.type,
      venue: item.venue || "",
      order: item.order,
      speakerIds: orderedIds,
      moderatorId: item.moderatorId || "",
      speakerTopics: item.speakerMeta?.topics || {},
      speakerTopicsEn: item.speakerMeta?.topicsEn || {},
    });
    setIsAgendaDialogOpen(true);
  };

  const toggleSpeaker = (id: string) => {
    if (pickerTarget === "moderator") {
      setForm((prev) => ({ ...prev, moderatorId: id }));
      setIsSpeakerPickerOpen(false);
    } else {
      setForm((prev) => ({
        ...prev,
        speakerIds: [...prev.speakerIds, id],
        speakerTopics: { ...prev.speakerTopics, [id]: "" },
        speakerTopicsEn: { ...prev.speakerTopicsEn, [id]: "" },
      }));
    }
  };

  const removeSpeaker = (id: string) => {
    setForm((prev) => {
      const newTopics = { ...prev.speakerTopics };
      const newTopicsEn = { ...prev.speakerTopicsEn };
      delete newTopics[id];
      delete newTopicsEn[id];
      return {
        ...prev,
        speakerIds: prev.speakerIds.filter((sid) => sid !== id),
        speakerTopics: newTopics,
        speakerTopicsEn: newTopicsEn,
      };
    });
  };

  const moveSpeaker = (id: string, direction: "up" | "down") => {
    setForm((prev) => {
      const currentIndex = prev.speakerIds.indexOf(id);
      if (currentIndex === -1) return prev;

      const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (nextIndex < 0 || nextIndex >= prev.speakerIds.length) return prev;

      const nextSpeakerIds = [...prev.speakerIds];
      [nextSpeakerIds[currentIndex], nextSpeakerIds[nextIndex]] = [nextSpeakerIds[nextIndex], nextSpeakerIds[currentIndex]];

      return {
        ...prev,
        speakerIds: nextSpeakerIds,
      };
    });
  };

  // Submit agenda item (create or update)
  const submitAgendaItem = async () => {
    if (!form.title || !form.agendaDate || !form.startTime || !form.endTime) {
      setMessage("error", t("requiredFields"));
      return;
    }

    if (!isAgendaTimeRangeValid(form.startTime, form.endTime)) {
      setMessage("error", t("timeOrderInvalid"));
      return;
    }

    if (
      event &&
      !isAgendaDateWithinEventRange(form.agendaDate, event.startDate, event.endDate)
    ) {
      setMessage("error", t("dateOutOfRange"));
      return;
    }

    const overlapItem = agendaItems.find(
      (item) =>
        item.id !== editingItem?.id &&
        normalizeAgendaDateKey(item.agendaDate) === form.agendaDate &&
        doAgendaSlotsOverlap(
          {
            agendaDate: form.agendaDate,
            startTime: form.startTime,
            endTime: form.endTime,
          },
          {
            agendaDate: normalizeAgendaDateKey(item.agendaDate),
            startTime: item.startTime,
            endTime: item.endTime,
          }
        )
    );

    if (overlapItem) {
      setMessage(
        "error",
        t("timeOverlap", {
          title: overlapItem.title,
          time: `${overlapItem.startTime}-${overlapItem.endTime}`,
        })
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: form.title,
        titleEn: form.titleEn || null,
        description: form.description || null,
        descriptionEn: form.descriptionEn || null,
        agendaDate: form.agendaDate,
        startTime: form.startTime,
        endTime: form.endTime,
        type: form.type,
        venue: form.venue || null,
        order: form.order,
        ...(canManageSpeakersFlag ? {
          speakerIds: form.speakerIds,
          moderatorId: form.moderatorId || null,
          speakerMeta: {
            orderedIds: form.speakerIds,
            topics: form.speakerTopics,
            topicsEn: form.speakerTopicsEn,
          },
        } : {}),
      };

      const url = editingItem
        ? `/api/events/${eventId}/agenda/${editingItem.id}`
        : `/api/events/${eventId}/agenda`;

      const res = await fetch(url, {
        method: editingItem ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("saveFailed"));
      }

      setMessage("success", data.message || (editingItem ? t("updateSuccess") : t("createSuccess")));
      setIsAgendaDialogOpen(false);
      setEditingItem(null);
      const saved = data.data as AgendaItem | undefined;
      if (saved?.id) {
        setAgendaItems((prev) => {
          const idx = prev.findIndex((a) => a.id === saved.id);
          if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
          return [...prev, saved];
        });
      }
    } catch (error) {
      setMessage("error", error instanceof Error ? error.message : t("saveFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete agenda item
  const submitDeleteItem = async () => {
    if (!deletingItem) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/events/${eventId}/agenda/${deletingItem.id}`,
        { method: "DELETE" }
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("deleteFailed"));
      }

      setMessage("success", data.message || t("deleteSuccess"));
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
      setAgendaItems((prev) => prev.filter((a) => a.id !== deletingItem.id));
    } catch (error) {
      setMessage("error", error instanceof Error ? error.message : t("deleteFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  function normalizeName(n: string) {
    return n.toLowerCase().replace(/[\s\-.]/g, "");
  }
  function isSimilarName(a: string, b: string): boolean {
    if (normalizeName(a) === normalizeName(b)) return true;
    const ta = a.toLowerCase().split(/\s+/).sort().join("");
    const tb = b.toLowerCase().split(/\s+/).sort().join("");
    return ta === tb;
  }

  // Create new speaker and add to form
  const submitNewSpeaker = async () => {
    if (!newSpeakerForm.name || !newSpeakerForm.title || !newSpeakerForm.organization) {
      return;
    }

    // Fuzzy duplicate check
    const names = [newSpeakerForm.name, newSpeakerForm.nameEn].filter(Boolean);
    const duplicates = allSpeakers.filter((s) =>
      names.some(
        (n) => isSimilarName(n, s.name) || (s.nameEn ? isSimilarName(n, s.nameEn) : false)
      )
    );
    if (duplicates.length > 0) {
      const dupNames = duplicates.map((d) => d.name).join(", ");
      const confirmed = window.confirm(
        locale === "zh"
          ? `发现相似嘉宾：${dupNames}，确定要创建新嘉宾吗？`
          : `Similar speaker(s) found: ${dupNames}. Continue to create new?`
      );
      if (!confirmed) return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/speakers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newSpeakerForm,
          sourceEventId: eventId,
          locale,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create speaker");
      }

      const newSpeaker = data.data as AgendaSpeaker;
      // Add to speakers library and select it
      setAllSpeakers((prev) => [...prev, newSpeaker]);
      if (pickerTarget === "moderator") {
        setForm((prev) => ({ ...prev, moderatorId: newSpeaker.id }));
      } else {
        setForm((prev) => ({
          ...prev,
          speakerIds: [...prev.speakerIds, newSpeaker.id],
          speakerTopics: { ...prev.speakerTopics, [newSpeaker.id]: "" },
        }));
      }
      setIsNewSpeakerDialogOpen(false);
      setNewSpeakerForm(initialNewSpeakerForm);
      setMessage("success", locale === "zh" ? "嘉宾已创建并添加" : "Speaker created and added");
    } catch (error) {
      setMessage("error", error instanceof Error ? error.message : "Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const eventTitle = event
    ? locale === "en" && event.titleEn
      ? event.titleEn
      : event.title
    : "";

  return (
    <AdminSectionGuard section="events">
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/admin/events">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("backToList")}
            </Button>
          </Link>

          {event && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                {eventTitle}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center">
                  <Calendar className="mr-1 h-4 w-4" />
                  {getEventDateRangeLabel(event, locale)}
                </span>
                <span className="inline-flex items-center">
                  <Clock className="mr-1 h-4 w-4" />
                  {getEventTimeSummaryLabel(event, locale)}
                </span>
                <span className="inline-flex items-center">
                  <MapPin className="mr-1 h-4 w-4" />
                  {event.venue}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {t("title")}
              </h2>
              <p className="text-sm text-slate-600">{t("subtitle")}</p>
            </div>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={openCreateDialog}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("addItem")}
            </Button>
          </div>
        </motion.div>

        {/* Status message */}
        {statusMessage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card
              className={
                statusTone === "success"
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-red-200 bg-red-50"
              }
            >
              <CardContent className="p-4 text-sm font-medium text-slate-700">
                {statusMessage}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {(currentUserRole === "ADMIN" || currentUserRole === "STAFF") && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="grid gap-6 lg:grid-cols-2"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-slate-500" />
                  {locale === "zh" ? "活动验证人员" : "Event verifiers"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-500">
                  {locale === "zh"
                    ? "先在用户管理中把工作人员设为验证人员，再在这里绑定到本场活动。"
                    : "First set a staff member as a verifier in user management, then bind them to this event here."}
                </p>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select value={selectedVerifierId || undefined} onValueChange={setSelectedVerifierId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={locale === "zh" ? "选择验证人员" : "Select verifier"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVerifierOptions.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} · {user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => void assignVerifierToEvent()}
                    disabled={!selectedVerifierId || isVerifierSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    {locale === "zh" ? "分配" : "Assign"}
                  </Button>
                </div>

                {assignedVerifiers.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-400">
                    {locale === "zh" ? "当前活动还没有分配验证人员。" : "No verifiers assigned to this event yet."}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assignedVerifiers.map((assignment) => (
                      <div
                        key={assignment.userId}
                        className="flex items-center gap-3 rounded-lg border border-slate-100 p-3"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={assignment.user.avatar || undefined} />
                          <AvatarFallback>{assignment.user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-slate-900">{assignment.user.name}</div>
                          <div className="truncate text-xs text-slate-500">{assignment.user.email}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => void removeVerifierFromEvent(assignment.userId)}
                          disabled={isVerifierSubmitting}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-slate-500" />
                  {locale === "zh" ? "参会者现场扫码二维码" : "Attendee venue QR"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-500">
                  {locale === "zh"
                    ? "这个二维码就是参会者到现场后扫码自助签到用的二维码。生成后可直接下载、打印或张贴在会场入口。"
                    : "This is the QR attendees scan on site for self check-in. Generate it and place it at the venue entrance."}
                </p>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => void generateVenueQr()}
                    disabled={isVenueQrSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    {venueCheckinSecret
                      ? (locale === "zh" ? "重新生成二维码" : "Regenerate QR")
                      : (locale === "zh" ? "生成二维码" : "Generate QR")}
                  </Button>
                  {venueCheckinUrl && (
                    <>
                      <Button variant="outline" onClick={() => void copyVenueCheckinLink()}>
                        <Copy className="mr-2 h-4 w-4" />
                        {locale === "zh" ? "复制签到链接" : "Copy check-in link"}
                      </Button>
                      <Button variant="outline" onClick={downloadVenueQr}>
                        <ArrowLeft className="mr-2 h-4 w-4 rotate-[270deg]" />
                        {locale === "zh" ? "下载二维码" : "Download QR"}
                      </Button>
                      <Button variant="outline" onClick={() => void downloadCheckinPoster()}>
                        <ArrowLeft className="mr-2 h-4 w-4 rotate-[270deg]" />
                        {locale === "zh" ? "下载签到海报" : "Download Check-in Poster"}
                      </Button>
                    </>
                  )}
                </div>

                {venueQrSvg ? (
                  <div className="space-y-3">
                    <div className="flex justify-center rounded-xl border border-slate-200 bg-white p-4">
                      <div
                        className="h-[220px] w-[220px]"
                        dangerouslySetInnerHTML={{ __html: venueQrSvg }}
                      />
                    </div>
                    <Input value={venueCheckinUrl} readOnly className="text-xs" />
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-400">
                    {locale === "zh" ? "点击上方按钮生成本场活动的现场签到二维码。" : "Generate the venue QR for this event using the button above."}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Agenda Items List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>
                {t("title")} ({agendaItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-12 text-center text-slate-500">
                  {locale === "zh" ? "加载中..." : "Loading..."}
                </div>
              ) : agendaItems.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  {t("empty")}
                </div>
              ) : (
                <div className="space-y-3">
                  {agendaItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 transition-all hover:border-emerald-200 hover:shadow-sm lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900">
                              {getAgendaTitle(item)}
                            </h3>
                            <Badge
                              className={
                                agendaTypeColors[item.type] ||
                                "bg-slate-100 text-slate-600"
                              }
                            >
                              {getAgendaTypeLabel(item.type)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{formatAgendaDateLabel(item.agendaDate, locale)}</span>
                            <span>·</span>
                            <Clock className="h-3.5 w-3.5" />
                            <span>
                              {item.startTime} - {item.endTime}
                            </span>
                            {item.venue && (
                              <>
                                <span>·</span>
                                <MapPin className="h-3.5 w-3.5" />
                                <span>{item.venue}</span>
                              </>
                            )}
                          </div>
                          {getAgendaDescription(item) && (
                            <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                              {getAgendaDescription(item)}
                            </p>
                          )}
                          {/* Speakers */}
                          {item.speakers.length > 0 && (
                            <div className="mt-1 flex gap-1.5">
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
                                    const topic = getAgendaTopic(item, speaker.id);
                                    return (
                                      <div
                                        key={speaker.id}
                                        className="flex items-start gap-2"
                                      >
                                        <Avatar className="h-5 w-5 shrink-0 mt-0.5">
                                          <AvatarImage src={speaker.avatar || undefined} />
                                          <AvatarFallback className="text-[10px]">
                                            {getSpeakerName(speaker).charAt(0)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-medium text-slate-700">
                                              {getSpeakerName(speaker)}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                              {getSpeakerTitle(speaker)} · {getSpeakerOrg(speaker)}
                                            </span>
                                          </div>
                                          {topic && (
                                            <div className="text-xs font-bold text-slate-600 mt-0.5">{topic}</div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                          {/* Moderator */}
                          {item.moderator && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-xs text-slate-400 shrink-0">
                                {locale === "zh" ? "主持：" : "Host:"}
                              </span>
                              <div className="flex items-center gap-1.5 rounded-full bg-amber-50 pl-1 pr-2.5 py-0.5">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={item.moderator.avatar || undefined} />
                                  <AvatarFallback className="text-[10px]">
                                    {getSpeakerName(item.moderator).charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-medium text-amber-700">
                                  {getSpeakerName(item.moderator)}
                                </span>
                              </div>
                            </div>
                          )}
                          {item.speakers.length === 0 &&
                            !item.moderator &&
                            item.type !== "break" && (
                              <span className="text-xs text-slate-400">
                                {t("noSpeakers")}
                              </span>
                            )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(item)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => {
                            setDeletingItem(item);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ====== Institution Associations Card ====== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-slate-500" />
                  {locale === "zh" ? `关联机构 (${eventInstitutions.length})` : `Institutions (${eventInstitutions.length})`}
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setInstitutionSearch("");
                    setIsInstitutionPickerOpen(true);
                  }}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {locale === "zh" ? "添加机构" : "Add Institution"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {eventInstitutions.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  {locale === "zh" ? "暂无关联机构" : "No institutions linked yet"}
                </p>
              ) : (
                <div className="space-y-2">
                  {eventInstitutions.map((ei) => (
                    <div
                      key={ei.institutionId}
                      className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 hover:border-emerald-200 transition-colors"
                    >
                      {ei.institution.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ei.institution.logo}
                          alt={ei.institution.name}
                          className="h-9 w-9 rounded object-contain border border-slate-100"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded bg-slate-100 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-slate-900 truncate">
                          {locale === "en" && ei.institution.nameEn
                            ? ei.institution.nameEn
                            : ei.institution.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {ei.role && (
                            <Badge className="bg-emerald-50 text-emerald-700 text-[10px] px-1.5 py-0">
                              {ei.role}
                            </Badge>
                          )}
                          {ei.institution.orgType && (
                            <span className="text-xs text-slate-400">{ei.institution.orgType}</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="rounded-full p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                        onClick={() => void removeEventInstitution(ei.institutionId)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ====== Institution Picker Dialog ====== */}
        <Dialog open={isInstitutionPickerOpen} onOpenChange={setIsInstitutionPickerOpen}>
          <DialogContent className="flex flex-col max-h-[80vh] max-w-lg">
            <DialogHeader className="shrink-0">
              <DialogTitle>
                {locale === "zh" ? "选择关联机构" : "Select Institution"}
              </DialogTitle>
              <DialogDescription>
                {locale === "zh" ? "从机构库中选择并关联到此活动" : "Link an institution from the library to this event"}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col min-h-0 flex-1 gap-3 overflow-hidden">
              <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={institutionSearch}
                  onChange={(e) => setInstitutionSearch(e.target.value)}
                  placeholder={locale === "zh" ? "搜索机构名称..." : "Search institutions..."}
                  className="pl-9 w-full"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1">
                {filteredInstitutions.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">
                    {locale === "zh" ? "无可用机构" : "No institutions available"}
                  </p>
                ) : (
                  filteredInstitutions.map((inst) => (
                    <div
                      key={inst.id}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-emerald-50 transition-colors"
                    >
                      {inst.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={inst.logo}
                          alt={inst.name}
                          className="h-8 w-8 rounded object-contain border border-slate-100 shrink-0"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center shrink-0">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-slate-900 truncate">
                          {locale === "en" && inst.nameEn ? inst.nameEn : inst.name}
                        </div>
                        {inst.orgType && (
                          <div className="text-xs text-slate-400">{inst.orgType}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Select
                          value={institutionRoleMap[inst.id] ?? ""}
                          onValueChange={(v) =>
                            setInstitutionRoleMap((prev) => ({ ...prev, [inst.id]: v }))
                          }
                        >
                          <SelectTrigger className="h-7 text-xs w-36">
                            <SelectValue placeholder={locale === "zh" ? "选择角色" : "Role"} />
                          </SelectTrigger>
                          <SelectContent>
                            {EVENT_INSTITUTION_ROLES.map((r) => (
                              <SelectItem key={r} value={r} className="text-xs">
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => {
                            void addEventInstitution(inst.id);
                            setIsInstitutionPickerOpen(false);
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <DialogFooter className="shrink-0">
              <Button variant="outline" onClick={() => setIsInstitutionPickerOpen(false)}>
                {locale === "zh" ? "关闭" : "Close"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ====== Agenda Item Create/Edit Dialog ====== */}
        <Dialog
          open={isAgendaDialogOpen}
          onOpenChange={(open) => {
            setIsAgendaDialogOpen(open);
            if (!open) setEditingItem(null);
          }}
        >
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? t("editItem") : t("addItem")}
              </DialogTitle>
              <DialogDescription>
                {editingItem ? t("editItem") : t("addItem")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="agenda-title">
                  {t("itemTitle")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="agenda-title"
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder={t("itemTitlePlaceholder")}
                />
              </div>

              {/* Title EN */}
              <div className="space-y-2">
                <Label htmlFor="agenda-title-en">
                  {locale === "zh" ? "英文标题" : "English Title"}
                  <span className="ml-2 text-xs text-slate-400 font-normal">
                    {locale === "zh" ? "（留空则自动翻译）" : "(auto-translated if blank)"}
                  </span>
                </Label>
                <Input
                  id="agenda-title-en"
                  value={form.titleEn}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, titleEn: e.target.value }))
                  }
                  placeholder={locale === "zh" ? "English title..." : "English title..."}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="agenda-desc">{t("description")}</Label>
                <Textarea
                  id="agenda-desc"
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder={t("descriptionPlaceholder")}
                />
              </div>

              {/* Description EN */}
              <div className="space-y-2">
                <Label htmlFor="agenda-desc-en">
                  {locale === "zh" ? "英文描述" : "English Description"}
                  <span className="ml-2 text-xs text-slate-400 font-normal">
                    {locale === "zh" ? "（留空则自动翻译）" : "(auto-translated if blank)"}
                  </span>
                </Label>
                <Textarea
                  id="agenda-desc-en"
                  rows={2}
                  value={form.descriptionEn}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      descriptionEn: e.target.value,
                    }))
                  }
                  placeholder="English description..."
                />
              </div>

              {/* Date and time fields */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="agenda-date">
                    {t("date")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="agenda-date"
                    type="date"
                    min={event ? normalizeAgendaDateKey(event.startDate) : undefined}
                    max={event ? normalizeAgendaDateKey(event.endDate || event.startDate) : undefined}
                    value={form.agendaDate}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        agendaDate: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agenda-start">
                    {t("startTime")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="agenda-start"
                    type="time"
                    value={form.startTime}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        startTime: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agenda-end">
                    {t("endTime")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="agenda-end"
                    type="time"
                    value={form.endTime}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        endTime: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {event ? (
                <p className="text-xs text-slate-500">
                  {formatAgendaDateLabel(event.startDate, locale)} - {formatAgendaDateLabel(event.endDate || event.startDate, locale)}
                </p>
              ) : null}

              {/* Type & Order */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agenda-type">{t("type")}</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) =>
                      setForm((prev) => ({ ...prev, type: v }))
                    }
                  >
                    <SelectTrigger id="agenda-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AGENDA_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {getAgendaTypeLabel(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agenda-order">{t("order")}</Label>
                  <Input
                    id="agenda-order"
                    type="number"
                    min="0"
                    value={form.order}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        order: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Venue */}
              <div className="space-y-2">
                <Label htmlFor="agenda-venue">{t("venue")}</Label>
                <Input
                  id="agenda-venue"
                  value={form.venue}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, venue: e.target.value }))
                  }
                  placeholder={t("venuePlaceholder")}
                />
              </div>

              {/* ====== Speakers Section ====== */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">
                    {t("speakers")}
                  </Label>
                  {canManageSpeakersFlag ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPickerTarget("speakers");
                        setSpeakerSearch("");
                        setIsSpeakerPickerOpen(true);
                      }}
                    >
                      <Users className="mr-1.5 h-3.5 w-3.5" />
                      {t("selectFromLibrary")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPickerTarget("speakers");
                        setNewSpeakerForm(initialNewSpeakerForm);
                        setIsNewSpeakerDialogOpen(true);
                      }}
                    >
                      <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                      {t("createNewSpeaker")}
                    </Button>
                  </div>
                  ) : null}
                </div>

                {!canManageSpeakersFlag ? (
                  <p className="text-sm text-slate-500">
                    {locale === "zh" ? "活动管理员仅可查看议程嘉宾，不能设置或新增嘉宾。" : "Event managers can view agenda speakers but cannot assign or create speakers."}
                  </p>
                ) : null}

                {/* Selected speakers as cards with topic input */}
                {selectedSpeakers.length > 0 ? (
                  <div className="space-y-2">
                    {selectedSpeakers.map((s, index) => (
                      <div
                        key={s.id}
                        className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                            {index + 1}
                          </div>
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage src={s.avatar || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {getSpeakerName(s).charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-slate-700">
                              {getSpeakerName(s)}
                            </span>
                            <span className="text-xs text-slate-400 ml-1.5">
                              {getSpeakerOrg(s)}
                            </span>
                          </div>
                          {canManageSpeakersFlag ? (
                            <div className="ml-1 flex items-center gap-1">
                              <button
                                type="button"
                                className="rounded-full p-0.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-40"
                                onClick={() => moveSpeaker(s.id, "up")}
                                disabled={index === 0}
                                title={locale === "en" ? "Move up" : "上移"}
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                className="rounded-full p-0.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-40"
                                onClick={() => moveSpeaker(s.id, "down")}
                                disabled={index === selectedSpeakers.length - 1}
                                title={locale === "en" ? "Move down" : "下移"}
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                className="rounded-full p-0.5 hover:bg-red-50 text-slate-400 hover:text-red-500"
                                onClick={() => removeSpeaker(s.id)}
                                title={locale === "en" ? "Remove" : "移除"}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : null}
                        </div>
                        {canManageSpeakersFlag ? (
                          <Input
                            value={locale === "en" ? (form.speakerTopicsEn[s.id] || "") : (form.speakerTopics[s.id] || "")}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                ...(locale === "en"
                                  ? {
                                      speakerTopicsEn: {
                                        ...prev.speakerTopicsEn,
                                        [s.id]: e.target.value,
                                      },
                                    }
                                  : {
                                      speakerTopics: {
                                        ...prev.speakerTopics,
                                        [s.id]: e.target.value,
                                      },
                                    }),
                              }))
                            }
                            placeholder={t("speakerTopic")}
                            className="h-7 text-xs"
                          />
                        ) : (
                          (locale === "en" ? form.speakerTopicsEn[s.id] : form.speakerTopics[s.id]) ? (
                            <p className="text-xs text-slate-500 italic pl-0.5">
                              {locale === "en" ? form.speakerTopicsEn[s.id] : form.speakerTopics[s.id]}
                            </p>
                          ) : null
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">{t("noSpeakers")}</p>
                )}
              </div>

              {/* ====== Moderator Section ====== */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">
                    {t("moderator")}
                  </Label>
                  {canManageSpeakersFlag ? (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPickerTarget("moderator");
                          setSpeakerSearch("");
                          setIsSpeakerPickerOpen(true);
                        }}
                      >
                        <Users className="mr-1.5 h-3.5 w-3.5" />
                        {t("selectModerator")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPickerTarget("moderator");
                          setNewSpeakerForm(initialNewSpeakerForm);
                          setIsNewSpeakerDialogOpen(true);
                        }}
                      >
                        <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                        {t("createModerator")}
                      </Button>
                    </div>
                  ) : null}
                </div>

                {selectedModerator ? (
                  <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white pl-1 pr-2 py-1 w-fit">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={selectedModerator.avatar || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {getSpeakerName(selectedModerator).charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-slate-700">
                      {getSpeakerName(selectedModerator)}
                    </span>
                    <span className="text-xs text-slate-400">
                      {getSpeakerOrg(selectedModerator)}
                    </span>
                    {canManageSpeakersFlag ? (
                      <button
                        type="button"
                        className="ml-1 rounded-full p-0.5 hover:bg-red-50 text-slate-400 hover:text-red-500"
                        onClick={() =>
                          setForm((prev) => ({ ...prev, moderatorId: "" }))
                        }
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">{t("noModerator")}</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAgendaDialogOpen(false)}
              >
                {t("cancel")}
              </Button>
              <LoadingButton
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => void submitAgendaItem()}
                loading={isSubmitting}
                loadingText={locale === "en" ? "Saving..." : "保存中..."}
              >
                {t("save")}
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ====== Speaker Picker Dialog ====== */}
        <Dialog open={isSpeakerPickerOpen} onOpenChange={setIsSpeakerPickerOpen}>
          <DialogContent className="flex flex-col max-h-[80vh] max-w-lg">
            <DialogHeader className="shrink-0">
              <DialogTitle>{t("selectFromLibrary")}</DialogTitle>
              <DialogDescription>{t("assignSpeakers")}</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col min-h-0 flex-1 gap-4 overflow-hidden">
              <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={speakerSearch}
                  onChange={(e) => setSpeakerSearch(e.target.value)}
                  placeholder={t("searchSpeakers")}
                  className="pl-9 w-full"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1">
                {filteredSpeakers.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">
                    {t("noSpeakers")}
                  </p>
                ) : (
                  filteredSpeakers.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-emerald-50"
                      onClick={() => toggleSpeaker(s.id)}
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={s.avatar || undefined} />
                        <AvatarFallback className="text-xs">
                          {getSpeakerName(s).charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 truncate">
                            {getSpeakerName(s)}
                          </span>
                          {s.isKeynote && (
                            <Badge className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0">
                              Keynote
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 truncate block">
                          {getSpeakerTitle(s)} · {getSpeakerOrg(s)}
                        </span>
                      </div>
                      <Plus className="h-4 w-4 shrink-0 text-emerald-600" />
                    </button>
                  ))
                )}
              </div>
            </div>

            <DialogFooter className="shrink-0">
              <Button
                variant="outline"
                onClick={() => setIsSpeakerPickerOpen(false)}
              >
                {t("cancel")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ====== New Speaker Dialog ====== */}
        <Dialog
          open={isNewSpeakerDialogOpen}
          onOpenChange={setIsNewSpeakerDialogOpen}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("createNewSpeaker")}</DialogTitle>
              <DialogDescription>{t("createNewSpeaker")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    {locale === "zh" ? "姓名" : "Name"}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={newSpeakerForm.name}
                    onChange={(e) =>
                      setNewSpeakerForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{locale === "zh" ? "英文名" : "English Name"}</Label>
                  <Input
                    value={newSpeakerForm.nameEn}
                    onChange={(e) =>
                      setNewSpeakerForm((prev) => ({
                        ...prev,
                        nameEn: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    {locale === "zh" ? "职位" : "Title"}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={newSpeakerForm.title}
                    onChange={(e) =>
                      setNewSpeakerForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {locale === "zh" ? "英文职位" : "English Title"}
                  </Label>
                  <Input
                    value={newSpeakerForm.titleEn}
                    onChange={(e) =>
                      setNewSpeakerForm((prev) => ({
                        ...prev,
                        titleEn: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    {locale === "zh" ? "机构" : "Organization"}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={newSpeakerForm.organization}
                    onChange={(e) =>
                      setNewSpeakerForm((prev) => ({
                        ...prev,
                        organization: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {locale === "zh" ? "英文机构名" : "English Organization"}
                  </Label>
                  <Input
                    value={newSpeakerForm.organizationEn}
                    onChange={(e) =>
                      setNewSpeakerForm((prev) => ({
                        ...prev,
                        organizationEn: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsNewSpeakerDialogOpen(false)}
              >
                {t("cancel")}
              </Button>
              <LoadingButton
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => void submitNewSpeaker()}
                disabled={
                  !newSpeakerForm.name ||
                  !newSpeakerForm.title ||
                  !newSpeakerForm.organization
                }
                loading={isSubmitting}
                loadingText={locale === "en" ? "Saving..." : "保存中..."}
              >
                {t("save")}
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ====== Delete Confirmation Dialog ====== */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("deleteItem")}</DialogTitle>
              <DialogDescription>{t("confirmDelete")}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                {t("cancel")}
              </Button>
              <LoadingButton
                variant="destructive"
                onClick={() => void submitDeleteItem()}
                loading={isSubmitting}
                loadingText={locale === "en" ? "Deleting..." : "删除中..."}
              >
                {t("deleteItem")}
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminSectionGuard>
  );
}
