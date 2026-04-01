"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Calendar, Edit2, Eye, Mic, Plus, Search, Sparkles, Star, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdminSectionGuard } from "@/components/admin/admin-section-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getEventTypeLabel, typeColors, getEventLayerLabel, getEventHostTypeLabel, eventLayerColors, eventHostTypeColors } from "@/lib/data/events";
import { Link } from "@/i18n/routing";

type EventType = "forum" | "workshop" | "ceremony" | "conference" | "networking";

type ManagedEvent = {
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
  venue: string;
  venueEn?: string | null;
  city?: string | null;
  cityEn?: string | null;
  address?: string | null;
  image?: string | null;
  type: EventType;
  eventLayer?: string | null;
  hostType?: string | null;
  trackId?: string | null;
  track?: {
    id: string;
    code: string;
    name: string;
    nameEn?: string | null;
    category: string;
  } | null;
  maxAttendees?: number | null;
  isPublished: boolean;
  isFeatured: boolean;
  isPinned?: boolean;
  requireApproval: boolean;
  managerUserId?: string | null;
  manager?: {
    id: string;
    name: string;
    email: string;
  } | null;
  _count?: {
    registrations: number;
    checkins: number;
    agendaItems: number;
  };
};

type ManagedTrack = {
  id: string;
  code: string;
  name: string;
  nameEn?: string | null;
  category: string;
};

type EventFormState = {
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  shortDesc: string;
  shortDescEn: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  venue: string;
  venueEn: string;
  city: string;
  cityEn: string;
  address: string;
  image: string;
  type: EventType;
  eventLayer: string;
  hostType: string;
  trackId: string;
  maxAttendees: string;
  isPublished: boolean;
  isFeatured: boolean;
  isPinned: boolean;
  requireApproval: boolean;
  managerUserId: string;
};

type ManagerOption = {
  id: string;
  name: string;
  email: string;
};

const EVENT_TYPES: EventType[] = ["forum", "workshop", "ceremony", "conference", "networking"];

const initialFormState: EventFormState = {
  title: "",
  titleEn: "",
  description: "",
  descriptionEn: "",
  shortDesc: "",
  shortDescEn: "",
  startDate: "",
  endDate: "",
  startTime: "09:00",
  endTime: "17:00",
  venue: "",
  venueEn: "",
  city: "Shanghai",
  cityEn: "",
  address: "",
  image: "",
  type: "forum",
  eventLayer: "",
  hostType: "",
  trackId: "",
  maxAttendees: "",
  isPublished: false,
  isFeatured: false,
  isPinned: false,
  requireApproval: false,
  managerUserId: "",
};

export default function AdminEventsPage() {
  const t = useTranslations("adminEventsPage");
  const locale = useLocale();
  const [events, setEvents] = useState<ManagedEvent[]>([]);
  const [tracks, setTracks] = useState<ManagedTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ManagedEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<ManagedEvent | null>(null);
  const [formState, setFormState] = useState<EventFormState>(initialFormState);
  const [generatingHighlightsId, setGeneratingHighlightsId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [managerOptions, setManagerOptions] = useState<ManagerOption[]>([]);
  const [managerSearch, setManagerSearch] = useState("");

  const loadingLabel = t("loading");
  const genericLoadError = t("loadError");

  const setMessage = (tone: "success" | "error", message: string) => {
    setStatusTone(tone);
    setStatusMessage(message);
  };

  const loadEvents = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/events?page=1&pageSize=100");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || genericLoadError);
      }

      setEvents(payload.data.events || []);
      setStatusMessage("");
    } catch (error) {
      console.error("Load events failed:", error);
      setStatusTone("error");
      setStatusMessage(error instanceof Error ? error.message : genericLoadError);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [genericLoadError]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    let cancelled = false;

    async function loadTracks() {
      try {
        const response = await fetch(`/api/tracks?locale=${locale}`, { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || genericLoadError);
        }

        if (!cancelled) {
          setTracks(payload.data || []);
        }
      } catch (error) {
        console.error("Load tracks failed:", error);
        if (!cancelled) {
          setTracks([]);
        }
      }
    }

    void loadTracks();

    return () => {
      cancelled = true;
    };
  }, [genericLoadError, locale]);

  useEffect(() => {
    let cancelled = false;

    async function loadManagerOptions() {
      try {
        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
        const sessionPayload = await sessionResponse.json();
        const role = sessionPayload?.user?.role || null;
        if (!cancelled) {
          setCurrentUserRole(role);
        }

        if (role !== "ADMIN") {
          if (!cancelled) {
            setManagerOptions([]);
          }
          return;
        }

        const response = await fetch("/api/users?page=1&pageSize=100", {
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.error || "Failed to load manager options");
        }

        const users = Array.isArray(payload?.data?.users) ? payload.data.users : [];
        if (!cancelled) {
          setManagerOptions(
            users.map((user: { id: string; name: string; email: string }) => ({
              id: user.id,
              name: user.name,
              email: user.email,
            }))
          );
        }
      } catch (error) {
        console.error("Load manager options failed:", error);
        if (!cancelled) {
          setManagerOptions([]);
        }
      }
    }

    void loadManagerOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return events.filter((event) => {
      const title = locale === "en" ? event.titleEn || event.title : event.title;
      const haystack = [title, event.venue, event.address, event.shortDesc]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      return normalizedQuery.length === 0 || haystack.some((value) => value.includes(normalizedQuery));
    });
  }, [events, locale, searchQuery]);

  const formatDate = (startDate: string, endDate?: string) => {
    const opts: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    const loc = locale === "en" ? "en-US" : "zh-CN";
    const start = new Date(startDate).toLocaleDateString(loc, opts);
    if (endDate && endDate.slice(0, 10) !== startDate.slice(0, 10)) {
      const end = new Date(endDate).toLocaleDateString(loc, opts);
      return `${start} - ${end}`;
    }
    return start;
  };

  const resetForm = () => {
    setEditingEvent(null);
    setFormState(initialFormState);
    setManagerSearch("");
  };

  const openCreateDialog = () => {
    resetForm();
    setIsFormDialogOpen(true);
  };

  const openEditDialog = (event: ManagedEvent) => {
    setEditingEvent(event);
    setFormState({
      title: event.title,
      titleEn: event.titleEn || "",
      description: event.description,
      descriptionEn: event.descriptionEn || "",
      shortDesc: event.shortDesc || "",
      shortDescEn: event.shortDescEn || "",
      startDate: new Date(event.startDate).toISOString().slice(0, 10),
      endDate: new Date(event.endDate).toISOString().slice(0, 10),
      startTime: event.startTime,
      endTime: event.endTime,
      venue: event.venue,
      venueEn: event.venueEn || "",
      city: event.city || "Shanghai",
      cityEn: event.cityEn || "",
      address: event.address || "",
      image: event.image || "",
      type: event.type,
      eventLayer: event.eventLayer || "",
      hostType: event.hostType || "",
      trackId: event.trackId || "",
      maxAttendees: event.maxAttendees ? String(event.maxAttendees) : "",
      isPublished: event.isPublished,
      isFeatured: event.isFeatured,
      isPinned: event.isPinned ?? false,
      requireApproval: event.requireApproval ?? false,
      managerUserId: event.managerUserId || "",
    });
    setIsFormDialogOpen(true);
  };

  const upsertEventInState = (event: ManagedEvent) => {
    setEvents((previous) => {
      const next = [...previous];
      const index = next.findIndex((item) => item.id === event.id);

      if (index >= 0) {
        next[index] = event;
      } else {
        next.unshift(event);
      }

      return next;
    });
  };

  const tryGenerateHighlightsAfterSave = async (eventId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/generate-highlights`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: "save" }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        console.error("[generate-highlights] failed:", response.status, payload);
        setMessage("success", `${t("messages.saveSuccessWithHighlightWarning")}`);
        return;
      }

      if (!payload.skipped) {
        await loadEvents();
      }
    } catch (err) {
      console.error("[generate-highlights] fetch error:", err);
      setMessage("success", `${t("messages.saveSuccessWithHighlightWarning")}`);
    }
  };

  const retryGenerateHighlights = async (eventId: string) => {
    setGeneratingHighlightsId(eventId);
    try {
      const response = await fetch(`/api/events/${eventId}/generate-highlights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "manual" }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        console.error("[retry-highlights] failed:", response.status, payload);
        setMessage("error", payload.error || t("messages.highlightsRetryFailed"));
      } else if (payload.skipped) {
        setMessage("success", t("messages.highlightsSkipped"));
      } else {
        await loadEvents();
        setMessage("success", t("messages.highlightsSuccess"));
      }
    } catch (err) {
      console.error("[retry-highlights] fetch error:", err);
      setMessage("error", t("messages.highlightsRetryFailed"));
    } finally {
      setGeneratingHighlightsId(null);
    }
  };

  const submitForm = async () => {
    if (
      !formState.title ||
      !formState.description ||
      !formState.startDate ||
      !formState.startTime ||
      !formState.endTime ||
      !formState.venue
    ) {
      setMessage("error", t("messages.requiredFields"));
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        locale,
        title: formState.title,
        titleEn: formState.titleEn || null,
        description: formState.description,
        descriptionEn: formState.descriptionEn || null,
        shortDesc: formState.shortDesc || null,
        shortDescEn: formState.shortDescEn || null,
        startDate: formState.startDate,
        endDate: formState.endDate || formState.startDate,
        startTime: formState.startTime,
        endTime: formState.endTime,
        venue: formState.venue,
        venueEn: formState.venueEn || null,
        city: formState.city,
        cityEn: formState.cityEn || null,
        address: formState.address || null,
        image: formState.image || null,
        type: formState.type,
        eventLayer: formState.eventLayer || null,
        hostType: formState.hostType || null,
        trackId: formState.trackId || null,
        maxAttendees: formState.maxAttendees ? Number(formState.maxAttendees) : null,
        isPublished: formState.isPublished,
        isFeatured: formState.isFeatured,
        isPinned: formState.isPinned,
        requireApproval: formState.requireApproval,
        ...(currentUserRole === "ADMIN"
          ? { managerUserId: formState.managerUserId || null }
          : {}),
      };

      const response = await fetch(editingEvent ? `/api/events/${editingEvent.id}` : "/api/events", {
        method: editingEvent ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || (editingEvent ? t("messages.updateFailed") : t("messages.createFailed")));
      }

      upsertEventInState(result.data);
      setMessage("success", result.message || (editingEvent ? t("messages.updateSuccess") : t("messages.createSuccess")));
      setIsFormDialogOpen(false);
      resetForm();

      if (result.data?.id) {
        void tryGenerateHighlightsAfterSave(result.data.id);
      }
    } catch (error) {
      console.error("Save event failed:", error);
      setMessage("error", error instanceof Error ? error.message : editingEvent ? t("messages.updateFailed") : t("messages.createFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateEventFlags = async (
    event: ManagedEvent,
    updates: Partial<Pick<ManagedEvent, "isPublished" | "isFeatured">>
  ) => {
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ locale, ...updates }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || t("messages.statusUpdateFailed"));
      }

      upsertEventInState(payload.data);
      setMessage("success", payload.message || t("messages.statusUpdateSuccess"));
    } catch (error) {
      console.error("Update event flags failed:", error);
      setMessage("error", error instanceof Error ? error.message : t("messages.statusUpdateFailed"));
    }
  };

  const submitDelete = async () => {
    if (!deletingEvent) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/events/${deletingEvent.id}`, {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || t("messages.deleteFailed"));
      }

      setEvents((previous) => previous.filter((event) => event.id !== deletingEvent.id));
      setMessage("success", payload.message || t("messages.deleteSuccess"));
      setDeletingEvent(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Delete event failed:", error);
      setMessage("error", error instanceof Error ? error.message : t("messages.deleteFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminSectionGuard section="events">
      <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-slate-600">{t("subtitle")}</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          {t("create")}
        </Button>
      </motion.div>

      {statusMessage ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className={statusTone === "success" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}>
            <CardContent className="p-4 text-sm font-medium text-slate-700">{statusMessage}</CardContent>
          </Card>
        </motion.div>
      ) : null}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle>{t("listTitle", { count: filteredEvents.length })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="py-12 text-center text-slate-500">{loadingLabel}</div>
              ) : filteredEvents.length === 0 ? (
                <div className="py-12 text-center text-slate-500">{t("empty")}</div>
              ) : (
                filteredEvents.map((event) => {
                  const localizedTitle = locale === "en" ? event.titleEn || event.title : event.title;

                  return (
                    <div
                      key={event.id}
                      className="flex flex-col justify-between rounded-xl border border-slate-100 p-4 transition-all hover:border-emerald-200 hover:shadow-sm lg:flex-row lg:items-center"
                    >
                      <div className="mb-4 flex items-start gap-4 lg:mb-0">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                          <Calendar className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-900">{localizedTitle}</h3>
                            <Badge className={typeColors[event.type]}>{getEventTypeLabel(event.type, locale)}</Badge>
                            {event.eventLayer ? (
                              <Badge className={eventLayerColors[event.eventLayer] || "bg-slate-100 text-slate-700"}>
                                {getEventLayerLabel(event.eventLayer, locale)}
                              </Badge>
                            ) : null}
                            {event.hostType ? (
                              <Badge className={eventHostTypeColors[event.hostType] || "bg-slate-100 text-slate-700"}>
                                {getEventHostTypeLabel(event.hostType, locale)}
                              </Badge>
                            ) : null}
                            {event.track ? (
                              <Badge className="bg-slate-100 text-slate-700">
                                {(locale === "en" ? event.track.nameEn || event.track.name : event.track.name)}
                              </Badge>
                            ) : null}
                            <Badge className={event.isPublished ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>
                              {event.isPublished ? t("published") : t("draft")}
                            </Badge>
                            {event.isPinned ? (
                              <Badge className="bg-rose-100 text-rose-700">{locale === "en" ? "Pinned" : "置顶"}</Badge>
                            ) : null}
                            {event.isFeatured ? <Badge className="bg-amber-100 text-amber-700">{t("featured")}</Badge> : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                            <span>{formatDate(event.startDate, event.endDate)}</span>
                            <span>·</span>
                            <span>{event.startTime} - {event.endTime}</span>
                            <span>·</span>
                            <span>{event.city || "Shanghai"}</span>
                            <span>·</span>
                            <span>{event.venue}</span>
                          </div>
                          <p className="mt-2 max-w-2xl text-sm text-slate-600">{event.shortDesc || event.description}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div className="text-sm text-slate-500">
                          <span className="inline-flex items-center">
                            <Users className="mr-1 h-4 w-4" />
                            {t("capacity", {
                              count: event._count?.registrations ?? 0,
                              max: event.maxAttendees ?? "∞",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link href={`/events/${event.id}`}>
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/admin/events/${event.id}`}>
                            <Button size="sm" variant="outline" title={t("agenda.title")}>
                              <Mic className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/admin/events/${event.id}/registrations`}>
                            <Button size="sm" variant="outline" title={t("registrations.title")}>
                              <Users className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(event)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              void updateEventFlags(event, { isPublished: !event.isPublished })
                            }
                          >
                            {event.isPublished ? t("actions.unpublish") : t("actions.publish")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              void updateEventFlags(event, { isFeatured: !event.isFeatured })
                            }
                          >
                            <Star className={`h-4 w-4 ${event.isFeatured ? "fill-current text-amber-500" : ""}`} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => {
                              setDeletingEvent(event);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              title={t("actions.regenerateHighlights")}
                              disabled={generatingHighlightsId === event.id}
                              onClick={() => void retryGenerateHighlights(event.id)}
                            >
                              <Sparkles className={`h-4 w-4 ${generatingHighlightsId === event.id ? "animate-pulse text-emerald-500" : "text-slate-400"}`} />
                            </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={isFormDialogOpen} onOpenChange={(open) => {
        setIsFormDialogOpen(open);
        if (!open) {
          resetForm();
        }
      }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? t("form.editTitle") : t("form.createTitle")}</DialogTitle>
            <DialogDescription>
              {editingEvent ? t("form.editDescription") : t("form.createDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="event-title">{t("form.title")}</Label>
              <Input id="event-title" value={formState.title} onChange={(event) => setFormState((previous) => ({ ...previous, title: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="event-title-en">{t("form.titleEn")}</Label>
              <Input id="event-title-en" value={formState.titleEn} onChange={(event) => setFormState((previous) => ({ ...previous, titleEn: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="event-description">{t("form.description")}</Label>
              <Textarea id="event-description" rows={4} value={formState.description} onChange={(event) => setFormState((previous) => ({ ...previous, description: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="event-description-en">{t("form.descriptionEn")}</Label>
              <Textarea id="event-description-en" rows={4} placeholder={locale === "zh" ? "留空则使用系统自动翻译" : "Leave empty to use auto-translation"} value={formState.descriptionEn} onChange={(event) => setFormState((previous) => ({ ...previous, descriptionEn: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="event-short-desc">{t("form.shortDesc")}</Label>
              <Textarea id="event-short-desc" rows={2} value={formState.shortDesc} onChange={(event) => setFormState((previous) => ({ ...previous, shortDesc: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="event-short-desc-en">{t("form.shortDescEn")}</Label>
              <Textarea id="event-short-desc-en" rows={2} placeholder={locale === "zh" ? "留空则使用系统自动翻译" : "Leave empty to use auto-translation"} value={formState.shortDescEn} onChange={(event) => setFormState((previous) => ({ ...previous, shortDescEn: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-start-date">{t("form.startDate")}</Label>
              <Input id="event-start-date" type="date" value={formState.startDate} onChange={(event) => setFormState((previous) => ({ ...previous, startDate: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-end-date">{t("form.endDate")}</Label>
              <Input id="event-end-date" type="date" value={formState.endDate} onChange={(event) => setFormState((previous) => ({ ...previous, endDate: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-type">{t("form.type")}</Label>
              <Input id="event-type" value={getEventTypeLabel(formState.type, locale)} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-start">{t("form.startTime")}</Label>
              <Input id="event-start" type="time" value={formState.startTime} onChange={(event) => setFormState((previous) => ({ ...previous, startTime: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-end">{t("form.endTime")}</Label>
              <Input id="event-end" type="time" value={formState.endTime} onChange={(event) => setFormState((previous) => ({ ...previous, endTime: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-venue">{t("form.venue")}</Label>
              <Input id="event-venue" value={formState.venue} onChange={(event) => setFormState((previous) => ({ ...previous, venue: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-venue-en">{t("form.venueEn")}</Label>
              <Input id="event-venue-en" placeholder={locale === "zh" ? "留空则使用系统自动翻译" : "Leave empty to use auto-translation"} value={formState.venueEn} onChange={(event) => setFormState((previous) => ({ ...previous, venueEn: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-city">{t("form.city")}</Label>
              <Input id="event-city" value={formState.city} onChange={(event) => setFormState((previous) => ({ ...previous, city: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-city-en">{t("form.cityEn")}</Label>
              <Input id="event-city-en" placeholder={locale === "zh" ? "留空则使用系统自动翻译" : "Leave empty to use auto-translation"} value={formState.cityEn} onChange={(event) => setFormState((previous) => ({ ...previous, cityEn: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-track">{t("form.track")}</Label>
              <Select value={formState.trackId || "none"} onValueChange={(value) => setFormState((previous) => ({ ...previous, trackId: value === "none" ? "" : value }))}>
                <SelectTrigger id="event-track">
                  <SelectValue placeholder={t("form.trackPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("form.trackPlaceholder")}</SelectItem>
                  {tracks.map((track) => (
                    <SelectItem key={track.id} value={track.id}>
                      {track.code} · {locale === "en" ? track.nameEn || track.name : track.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="event-address">{t("form.address")}</Label>
              <Input id="event-address" value={formState.address} onChange={(event) => setFormState((previous) => ({ ...previous, address: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="event-image">{t("form.image")}</Label>
              <Input id="event-image" value={formState.image} onChange={(event) => setFormState((previous) => ({ ...previous, image: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-capacity">{t("form.maxAttendees")}</Label>
              <Input id="event-capacity" type="number" min="0" value={formState.maxAttendees} onChange={(event) => setFormState((previous) => ({ ...previous, maxAttendees: event.target.value }))} />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <Label htmlFor="event-published">{t("form.isPublished")}</Label>
                <Switch id="event-published" checked={formState.isPublished} onCheckedChange={(checked) => setFormState((previous) => ({ ...previous, isPublished: checked }))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <Label htmlFor="event-featured">{t("form.isFeatured")}</Label>
                <Switch id="event-featured" checked={formState.isFeatured} onCheckedChange={(checked) => setFormState((previous) => ({ ...previous, isFeatured: checked }))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <Label htmlFor="event-pinned">{locale === "en" ? "Pin event" : "活动置顶"}</Label>
                <Switch id="event-pinned" checked={formState.isPinned} onCheckedChange={(checked) => setFormState((previous) => ({ ...previous, isPinned: checked }))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <Label htmlFor="event-require-approval">{t("form.requireApproval")}</Label>
                <Switch id="event-require-approval" checked={formState.requireApproval} onCheckedChange={(checked) => setFormState((previous) => ({ ...previous, requireApproval: checked }))} />
              </div>
            </div>
            {currentUserRole === "ADMIN" ? (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="event-manager-select">{locale === "en" ? "Event manager" : "活动管理员"}</Label>
                <Input
                  placeholder={locale === "en" ? "Search by name or email..." : "按姓名或邮箱搜索..."}
                  value={managerSearch}
                  onChange={(e) => setManagerSearch(e.target.value)}
                  className="mb-1"
                />
                <Select
                  value={formState.managerUserId || "none"}
                  onValueChange={(value) => {
                    setFormState((previous) => ({
                      ...previous,
                      managerUserId: value === "none" ? "" : value,
                    }));
                    setManagerSearch("");
                  }}
                >
                  <SelectTrigger id="event-manager-select">
                    <SelectValue placeholder={locale === "en" ? "Unassigned" : "未指定"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{locale === "en" ? "Unassigned" : "未指定"}</SelectItem>
                    {managerOptions
                      .filter((manager) => {
                        if (manager.id === formState.managerUserId) return true;
                        if (!managerSearch.trim()) return true;
                        const q = managerSearch.toLowerCase();
                        return (
                          (manager.name || "").toLowerCase().includes(q) ||
                          manager.email.toLowerCase().includes(q)
                        );
                      })
                      .map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.name} ({manager.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="event-type-select">{t("form.type")}</Label>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                {EVENT_TYPES.map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant={formState.type === type ? "default" : "outline"}
                    className={formState.type === type ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                    onClick={() => setFormState((previous) => ({ ...previous, type }))}
                  >
                    {getEventTypeLabel(type, locale)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-layer">{t("form.eventLayer")}</Label>
              <Select value={formState.eventLayer || "none"} onValueChange={(value) => setFormState((previous) => ({ ...previous, eventLayer: value === "none" ? "" : value }))}>
                <SelectTrigger id="event-layer">
                  <SelectValue placeholder={t("form.eventLayerPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("form.eventLayerPlaceholder")}</SelectItem>
                  <SelectItem value="INSTITUTION">{t("form.layers.institution")}</SelectItem>
                  <SelectItem value="ECONOMY">{t("form.layers.economy")}</SelectItem>
                  <SelectItem value="ROOT">{t("form.layers.root")}</SelectItem>
                  <SelectItem value="ACCELERATOR">{t("form.layers.accelerator")}</SelectItem>
                  <SelectItem value="COMPREHENSIVE">{t("form.layers.comprehensive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-host-type">{t("form.hostType")}</Label>
              <Select value={formState.hostType || "none"} onValueChange={(value) => setFormState((previous) => ({ ...previous, hostType: value === "none" ? "" : value }))}>
                <SelectTrigger id="event-host-type">
                  <SelectValue placeholder={t("form.hostTypePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("form.hostTypePlaceholder")}</SelectItem>
                  <SelectItem value="OFFICIAL">{t("form.hostTypes.official")}</SelectItem>
                  <SelectItem value="CO_HOSTED">{t("form.hostTypes.coHosted")}</SelectItem>
                  <SelectItem value="REGISTERED">{t("form.hostTypes.registered")}</SelectItem>
                  <SelectItem value="SIDE_EVENT">{t("form.hostTypes.sideEvent")}</SelectItem>
                  <SelectItem value="COMMUNITY">{t("form.hostTypes.community")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsFormDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => void submitForm()} disabled={isSubmitting}>
              {editingEvent ? t("form.save") : t("form.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("delete.title")}</DialogTitle>
            <DialogDescription>{t("delete.description", { name: deletingEvent?.title || "" })}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={() => void submitDelete()} disabled={isSubmitting}>
              {t("delete.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </AdminSectionGuard>
  );
}
