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
  Mic,
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
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  type: string;
  venue?: string | null;
  order: number;
  speakers: AgendaSpeaker[];
};

type EventInfo = {
  id: string;
  title: string;
  titleEn?: string | null;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  venue: string;
};

const AGENDA_TYPES = ["keynote", "panel", "workshop", "break", "networking"] as const;

type AgendaFormState = {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  type: string;
  venue: string;
  order: number;
  speakerIds: string[];
};

const initialAgendaForm: AgendaFormState = {
  title: "",
  description: "",
  startTime: "09:00",
  endTime: "09:30",
  type: "keynote",
  venue: "",
  order: 0,
  speakerIds: [],
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

  // Dialog state
  const [isAgendaDialogOpen, setIsAgendaDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSpeakerPickerOpen, setIsSpeakerPickerOpen] = useState(false);
  const [isNewSpeakerDialogOpen, setIsNewSpeakerDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<AgendaItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState<AgendaFormState>(initialAgendaForm);
  const [speakerSearch, setSpeakerSearch] = useState("");
  const [newSpeakerForm, setNewSpeakerForm] = useState<NewSpeakerForm>(initialNewSpeakerForm);

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
    break: "bg-slate-100 text-slate-600",
    networking: "bg-emerald-100 text-emerald-700",
  };

  // Selected speakers in form
  const selectedSpeakers = useMemo(() => {
    return allSpeakers.filter((s) => form.speakerIds.includes(s.id));
  }, [allSpeakers, form.speakerIds]);

  // Filtered speakers for picker
  const filteredSpeakers = useMemo(() => {
    const query = speakerSearch.toLowerCase().trim();
    return allSpeakers.filter((s) => {
      if (form.speakerIds.includes(s.id)) return false; // already selected
      if (!query) return true;
      return (
        s.name.toLowerCase().includes(query) ||
        (s.nameEn?.toLowerCase().includes(query) ?? false) ||
        s.organization.toLowerCase().includes(query) ||
        (s.organizationEn?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [allSpeakers, speakerSearch, form.speakerIds]);

  const openCreateDialog = () => {
    setEditingItem(null);
    setForm({ ...initialAgendaForm, order: agendaItems.length });
    setIsAgendaDialogOpen(true);
  };

  const openEditDialog = (item: AgendaItem) => {
    setEditingItem(item);
    setForm({
      title: item.title,
      description: item.description || "",
      startTime: item.startTime,
      endTime: item.endTime,
      type: item.type,
      venue: item.venue || "",
      order: item.order,
      speakerIds: item.speakers.map((s) => s.id),
    });
    setIsAgendaDialogOpen(true);
  };

  const toggleSpeaker = (id: string) => {
    setForm((prev) => ({
      ...prev,
      speakerIds: prev.speakerIds.includes(id)
        ? prev.speakerIds.filter((sid) => sid !== id)
        : [...prev.speakerIds, id],
    }));
  };

  const removeSpeaker = (id: string) => {
    setForm((prev) => ({
      ...prev,
      speakerIds: prev.speakerIds.filter((sid) => sid !== id),
    }));
  };

  // Submit agenda item (create or update)
  const submitAgendaItem = async () => {
    if (!form.title || !form.startTime || !form.endTime) {
      setMessage("error", locale === "zh" ? "请填写必填字段" : "Please fill required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        startTime: form.startTime,
        endTime: form.endTime,
        type: form.type,
        venue: form.venue || null,
        order: form.order,
        speakerIds: form.speakerIds,
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
      await loadAgenda();
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
      await loadAgenda();
    } catch (error) {
      setMessage("error", error instanceof Error ? error.message : t("deleteFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create new speaker and add to form
  const submitNewSpeaker = async () => {
    if (!newSpeakerForm.name || !newSpeakerForm.title || !newSpeakerForm.organization) {
      return;
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
      setForm((prev) => ({
        ...prev,
        speakerIds: [...prev.speakerIds, newSpeaker.id],
      }));
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
                  {new Date(event.startDate).toLocaleDateString(
                    locale === "en" ? "en-US" : "zh-CN"
                  )}
                  {event.endDate && event.endDate.slice(0, 10) !== event.startDate.slice(0, 10) && (
                    <> - {new Date(event.endDate).toLocaleDateString(
                      locale === "en" ? "en-US" : "zh-CN"
                    )}</>
                  )}
                </span>
                <span className="inline-flex items-center">
                  <Clock className="mr-1 h-4 w-4" />
                  {event.startTime} - {event.endTime}
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
                            <div className="flex flex-wrap items-center gap-2">
                              <Mic className="h-3.5 w-3.5 text-slate-400" />
                              {item.speakers.map((speaker) => (
                                <div
                                  key={speaker.id}
                                  className="flex items-center gap-1.5 rounded-full bg-slate-50 pl-1 pr-2.5 py-0.5"
                                >
                                  <Avatar className="h-5 w-5">
                                    <AvatarImage src={speaker.avatar || undefined} />
                                    <AvatarFallback className="text-[10px]">
                                      {getSpeakerName(speaker).charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs font-medium text-slate-700">
                                    {getSpeakerName(speaker)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {item.speakers.length === 0 &&
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

              {/* Time fields */}
              <div className="grid grid-cols-2 gap-4">
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
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
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
                        setNewSpeakerForm(initialNewSpeakerForm);
                        setIsNewSpeakerDialogOpen(true);
                      }}
                    >
                      <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                      {t("createNewSpeaker")}
                    </Button>
                  </div>
                </div>

                {/* Selected speakers chips */}
                {selectedSpeakers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedSpeakers.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white pl-1 pr-2 py-1"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={s.avatar || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {getSpeakerName(s).charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-slate-700">
                          {getSpeakerName(s)}
                        </span>
                        <span className="text-xs text-slate-400">
                          {getSpeakerOrg(s)}
                        </span>
                        <button
                          type="button"
                          className="ml-1 rounded-full p-0.5 hover:bg-red-50 text-slate-400 hover:text-red-500"
                          onClick={() => removeSpeaker(s.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">{t("noSpeakers")}</p>
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
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => void submitAgendaItem()}
                disabled={isSubmitting}
              >
                {t("save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ====== Speaker Picker Dialog ====== */}
        <Dialog open={isSpeakerPickerOpen} onOpenChange={setIsSpeakerPickerOpen}>
          <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("selectFromLibrary")}</DialogTitle>
              <DialogDescription>{t("assignSpeakers")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={speakerSearch}
                  onChange={(e) => setSpeakerSearch(e.target.value)}
                  placeholder={t("searchSpeakers")}
                  className="pl-9"
                />
              </div>

              <div className="max-h-[50vh] space-y-1 overflow-y-auto">
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

            <DialogFooter>
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
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => void submitNewSpeaker()}
                disabled={
                  isSubmitting ||
                  !newSpeakerForm.name ||
                  !newSpeakerForm.title ||
                  !newSpeakerForm.organization
                }
              >
                {t("save")}
              </Button>
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
              <Button
                variant="destructive"
                onClick={() => void submitDeleteItem()}
                disabled={isSubmitting}
              >
                {t("deleteItem")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminSectionGuard>
  );
}
