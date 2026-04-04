"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Edit2, Plus, Route, Search, Trash2 } from "lucide-react";
import { AdminSectionGuard } from "@/components/admin/admin-section-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type TrackCategory = "institution" | "economy" | "foundation" | "accelerator";

type ManagedTrack = {
  id: string;
  code: string;
  name: string;
  nameEn?: string | null;
  description: string;
  descriptionEn?: string | null;
  category: TrackCategory;
  color: string;
  icon: string;
  order: number;
  partners?: string[];
  partnersEn?: string[];
  eventCount: number;
};

type TrackFormState = {
  code: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  category: TrackCategory;
  color: string;
  icon: string;
  order: string;
  partners: string;
  partnersEn: string;
};

const TRACK_CATEGORIES: TrackCategory[] = ["institution", "economy", "foundation", "accelerator"];

const initialFormState: TrackFormState = {
  code: "",
  name: "",
  nameEn: "",
  description: "",
  descriptionEn: "",
  category: "institution",
  color: "#0284c7",
  icon: "Building2",
  order: "0",
  partners: "",
  partnersEn: "",
};

function parsePartners(value: string): string[] {
  return value
    .split(/\r?\n|,|，/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AdminTracksPage() {
  const t = useTranslations("adminTracksPage");
  const locale = useLocale();
  const [tracks, setTracks] = useState<ManagedTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTrack, setEditingTrack] = useState<ManagedTrack | null>(null);
  const [deletingTrack, setDeletingTrack] = useState<ManagedTrack | null>(null);
  const [formState, setFormState] = useState<TrackFormState>(initialFormState);

  const genericLoadError = t("loadError");

  const setMessage = (tone: "success" | "error", message: string) => {
    setStatusTone(tone);
    setStatusMessage(message);
  };

  const loadTracks = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/tracks?locale=${locale}`, { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || genericLoadError);
      }

      setTracks(payload.data || []);
      setStatusMessage("");
    } catch (error) {
      console.error("Load tracks failed:", error);
      setStatusTone("error");
      setStatusMessage(error instanceof Error ? error.message : genericLoadError);
      setTracks([]);
    } finally {
      setIsLoading(false);
    }
  }, [genericLoadError, locale]);

  useEffect(() => {
    void loadTracks();
  }, [loadTracks]);

  const filteredTracks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return tracks.filter((track) => {
      const haystack = [track.code, track.name, track.nameEn, track.description, track.descriptionEn]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      return normalizedQuery.length === 0 || haystack.some((value) => value.includes(normalizedQuery));
    });
  }, [searchQuery, tracks]);

  const resetForm = () => {
    setEditingTrack(null);
    setFormState(initialFormState);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsFormDialogOpen(true);
  };

  const openEditDialog = (track: ManagedTrack) => {
    setEditingTrack(track);
    setFormState({
      code: track.code,
      name: track.name,
      nameEn: track.nameEn || "",
      description: track.description,
      descriptionEn: track.descriptionEn || "",
      category: track.category,
      color: track.color,
      icon: track.icon,
      order: String(track.order),
      partners: (track.partners || []).join("\n"),
      partnersEn: (track.partnersEn || []).join("\n"),
    });
    setIsFormDialogOpen(true);
  };

  const upsertTrackInState = (track: ManagedTrack) => {
    setTracks((previous) => {
      const next = [...previous];
      const index = next.findIndex((item) => item.id === track.id);

      if (index >= 0) {
        next[index] = track;
      } else {
        next.push(track);
      }

      return next.sort((left, right) => left.order - right.order || left.code.localeCompare(right.code));
    });
  };

  const submitForm = async () => {
    if (!formState.code || !formState.name || !formState.description || !formState.color || !formState.icon) {
      setMessage("error", t("messages.requiredFields"));
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        locale,
        code: formState.code,
        name: formState.name,
        nameEn: formState.nameEn || null,
        description: formState.description,
        descriptionEn: formState.descriptionEn || null,
        category: formState.category,
        color: formState.color,
        icon: formState.icon,
        order: Number.parseInt(formState.order || "0", 10) || 0,
        partners: parsePartners(formState.partners),
        partnersEn: parsePartners(formState.partnersEn),
      };

      const response = await fetch(editingTrack ? `/api/tracks/${editingTrack.id}` : "/api/tracks", {
        method: editingTrack ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || (editingTrack ? t("messages.updateFailed") : t("messages.createFailed")));
      }

      upsertTrackInState(result.data);
      setMessage("success", result.message || (editingTrack ? t("messages.updateSuccess") : t("messages.createSuccess")));
      setIsFormDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Save track failed:", error);
      setMessage("error", error instanceof Error ? error.message : editingTrack ? t("messages.updateFailed") : t("messages.createFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitDelete = async () => {
    if (!deletingTrack) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tracks/${deletingTrack.id}`, {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || t("messages.deleteFailed"));
      }

      setTracks((previous) => previous.filter((track) => track.id !== deletingTrack.id));
      setMessage("success", payload.message || t("messages.deleteSuccess"));
      setDeletingTrack(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Delete track failed:", error);
      setMessage("error", error instanceof Error ? error.message : t("messages.deleteFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminSectionGuard section="tracks">
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
          <Card className={statusTone === "success" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}>
            <CardContent className="p-4 text-sm font-medium text-slate-700">{statusMessage}</CardContent>
          </Card>
        ) : null}

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

        <Card>
          <CardHeader>
            <CardTitle>{t("listTitle", { count: filteredTracks.length })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
                {t("loading")}
              </div>
            ) : filteredTracks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
                {t("empty")}
              </div>
            ) : (
              filteredTracks.map((track, index) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.03 }}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${track.color}1A` }}>
                          <Route className="h-5 w-5" style={{ color: track.color }} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">{track.code}</span>
                            <h2 className="text-lg font-semibold text-slate-900">{locale === "en" ? track.nameEn || track.name : track.name}</h2>
                          </div>
                          <p className="text-sm text-slate-500">{t(`categories.${track.category}`)}</p>
                        </div>
                      </div>

                      <p className="max-w-3xl text-sm leading-6 text-slate-600">
                        {locale === "en" ? track.descriptionEn || track.description : track.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <Badge variant="outline" style={{ borderColor: track.color, color: track.color }}>
                          {t("eventCount", { count: track.eventCount })}
                        </Badge>
                        <Badge variant="outline">{t("order", { value: track.order })}</Badge>
                        <Badge variant="outline">{track.icon}</Badge>
                        <Badge variant="outline">{track.color}</Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(track)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        {t("actions.edit")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          setDeletingTrack(track);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t("actions.delete")}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>

        <Dialog open={isFormDialogOpen} onOpenChange={(open) => {
          setIsFormDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTrack ? t("form.editTitle") : t("form.createTitle")}</DialogTitle>
              <DialogDescription>{editingTrack ? t("form.editDescription") : t("form.createDescription")}</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="track-code">{t("form.code")}</Label>
                <Input id="track-code" value={formState.code} onChange={(event) => setFormState((previous) => ({ ...previous, code: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="track-order">{t("form.order")}</Label>
                <Input id="track-order" value={formState.order} onChange={(event) => setFormState((previous) => ({ ...previous, order: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="track-name">{t("form.name")}</Label>
                <Input id="track-name" value={formState.name} onChange={(event) => setFormState((previous) => ({ ...previous, name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="track-name-en">{t("form.nameEn")}</Label>
                <Input id="track-name-en" value={formState.nameEn} onChange={(event) => setFormState((previous) => ({ ...previous, nameEn: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t("form.category")}</Label>
                <Select value={formState.category} onValueChange={(value) => setFormState((previous) => ({ ...previous, category: value as TrackCategory }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRACK_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>{t(`categories.${category}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="track-color">{t("form.color")}</Label>
                <Input id="track-color" value={formState.color} onChange={(event) => setFormState((previous) => ({ ...previous, color: event.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="track-icon">{t("form.icon")}</Label>
                <Input id="track-icon" value={formState.icon} onChange={(event) => setFormState((previous) => ({ ...previous, icon: event.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="track-description">{t("form.description")}</Label>
                <Textarea id="track-description" rows={4} value={formState.description} onChange={(event) => setFormState((previous) => ({ ...previous, description: event.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="track-description-en">{t("form.descriptionEn")}</Label>
                <Textarea id="track-description-en" rows={4} value={formState.descriptionEn} onChange={(event) => setFormState((previous) => ({ ...previous, descriptionEn: event.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="track-partners">{t("form.partners")}</Label>
                <Textarea id="track-partners" rows={4} value={formState.partners} onChange={(event) => setFormState((previous) => ({ ...previous, partners: event.target.value }))} placeholder={t("form.partnersPlaceholder")} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="track-partners-en">{t("form.partnersEn")}</Label>
                <Textarea id="track-partners-en" rows={4} value={formState.partnersEn} onChange={(event) => setFormState((previous) => ({ ...previous, partnersEn: event.target.value }))} placeholder={t("form.partnersPlaceholder")} />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsFormDialogOpen(false)}>{t("common.cancel")}</Button>
              <LoadingButton className="bg-emerald-600 hover:bg-emerald-700" onClick={() => void submitForm()} loading={isSubmitting} loadingText={locale === "en" ? (editingTrack ? "Saving..." : "Creating...") : (editingTrack ? "保存中..." : "创建中...")}>
                {editingTrack ? t("form.save") : t("form.create")}
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("delete.title")}</DialogTitle>
              <DialogDescription>{t("delete.description", { name: deletingTrack?.name || "" })}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>{t("common.cancel")}</Button>
              <LoadingButton variant="destructive" onClick={() => void submitDelete()} loading={isSubmitting} loadingText={locale === "en" ? "Deleting..." : "删除中..."}>{t("delete.confirm")}</LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminSectionGuard>
  );
}