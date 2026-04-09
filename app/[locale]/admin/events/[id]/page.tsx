"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Edit2,
  MapPin,
  Plus,
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

const AGENDA_TYPES = ["keynote", "panel", "workshop", "sharing", "launch", "break", "networking"] as const;

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
  const canManageSpeakersFlag = currentUserRole === "ADMIN" || (currentUserStaffPermissions?.includes("speakers") ?? false);

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
      const res = await fetch("/api/speakers?limit=200");
      const data = await res.json();
      if (res.ok && data.data) {
        setAllSpeakers(
          (data.data as AgendaSpeaker[]).map((s) => ({
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
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([loadEvent(), loadAgenda(), loadSpeakers()]).finally(() =>
      setIsLoading(false)
    );
  }, [loadEvent, loadAgenda, loadSpeakers]);

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

  const getAgendaTypeLabel = (type: string) => {
    const key = type as (typeof AGENDA_TYPES)[number];
    try {
      return t(`types.${key}`);
    } catch {
      return type;
    }
  };

  const agendaTypeColors: Record<string, string> = {
    keynote: "bg-purple-100 text-purple-700",
    panel: "bg-blue-100 text-blue-700",
    workshop: "bg-amber-100 text-amber-700",
    sharing: "bg-teal-100 text-teal-700",
    launch: "bg-rose-100 text-rose-700",
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
    setForm({
      ...initialAgendaForm,
      agendaDate: defaultDate,
      order: agendaItems.length,
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
      }));
    }
  };

  const removeSpeaker = (id: string) => {
    setForm((prev) => {
      const newTopics = { ...prev.speakerTopics };
      delete newTopics[id];
      return {
        ...prev,
        speakerIds: prev.speakerIds.filter((sid) => sid !== id),
        speakerTopics: newTopics,
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
                  {agendaItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 transition-all hover:border-emerald-200 hover:shadow-sm lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 text-sm font-medium">
                          {item.order + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900">
                              {item.title}
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
                          {item.description && (
                            <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                              {item.description}
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
                                    const topic = item.speakerMeta?.topics?.[speaker.id];
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
                    {selectedSpeakers.map((s) => (
                      <div
                        key={s.id}
                        className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2"
                      >
                        <div className="flex items-center gap-2">
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
                            <button
                              type="button"
                              className="ml-1 rounded-full p-0.5 hover:bg-red-50 text-slate-400 hover:text-red-500"
                              onClick={() => removeSpeaker(s.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                        {canManageSpeakersFlag ? (
                          <Input
                            value={form.speakerTopics[s.id] || ""}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                speakerTopics: {
                                  ...prev.speakerTopics,
                                  [s.id]: e.target.value,
                                },
                              }))
                            }
                            placeholder={t("speakerTopic")}
                            className="h-7 text-xs"
                          />
                        ) : (
                          form.speakerTopics[s.id] ? (
                            <p className="text-xs text-slate-500 italic pl-0.5">
                              {form.speakerTopics[s.id]}
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
