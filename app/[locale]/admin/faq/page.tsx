"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  DatabaseZap,
  Edit2,
  FileText,
  Loader2,
  Paperclip,
  Pin,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AdminSectionGuard } from "@/components/admin/admin-section-guard";
import { Badge } from "@/components/ui/badge";
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

type FaqItem = {
  id: string;
  category: string;
  categoryEn?: string | null;
  question: string;
  questionEn?: string | null;
  summary?: string | null;
  summaryEn?: string | null;
  answer: string;
  answerEn?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  isPinned: boolean;
  isPublished: boolean;
  sortOrder: number;
  updatedAt: string;
};

type FaqForm = {
  category: string;
  categoryEn: string;
  question: string;
  questionEn: string;
  summary: string;
  summaryEn: string;
  answer: string;
  answerEn: string;
  attachmentUrl: string;
  attachmentName: string;
  isPinned: boolean;
  isPublished: boolean;
  sortOrder: number;
};

const emptyForm: FaqForm = {
  category: "",
  categoryEn: "",
  question: "",
  questionEn: "",
  summary: "",
  summaryEn: "",
  answer: "",
  answerEn: "",
  attachmentUrl: "",
  attachmentName: "",
  isPinned: false,
  isPublished: true,
  sortOrder: 0,
};

function toForm(item: FaqItem): FaqForm {
  return {
    category: item.category,
    categoryEn: item.categoryEn || "",
    question: item.question,
    questionEn: item.questionEn || "",
    summary: item.summary || "",
    summaryEn: item.summaryEn || "",
    answer: item.answer,
    answerEn: item.answerEn || "",
    attachmentUrl: item.attachmentUrl || "",
    attachmentName: item.attachmentName || "",
    isPinned: item.isPinned,
    isPublished: item.isPublished,
    sortOrder: item.sortOrder,
  };
}

export default function AdminFaqPage() {
  const t = useTranslations("adminFaq");
  const locale = useLocale();
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importingDefaults, setImportingDefaults] = useState(false);
  const [editingItem, setEditingItem] = useState<FaqItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<FaqItem | null>(null);
  const [form, setForm] = useState<FaqForm>(emptyForm);
  const [statusMessage, setStatusMessage] = useState("");

  const loadFaqs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/faqs", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || t("loadError"));
      }
      setItems(data.data as FaqItem[]);
      setStatusMessage("");
    } catch (error) {
      const message = error instanceof Error ? error.message : t("loadError");
      setStatusMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadFaqs();
  }, [loadFaqs]);

  function upsertItem(item: FaqItem) {
    setItems((previous) => {
      const idx = previous.findIndex((entry) => entry.id === item.id);
      if (idx >= 0) {
        const next = [...previous];
        next[idx] = item;
        return next;
      }
      return [...previous, item];
    });
  }

  function openCreate() {
    setEditingItem(null);
    setForm({
      ...emptyForm,
      category: locale === "en" ? "Registration & Participation" : "注册与参会",
      categoryEn: "Registration & Participation",
      sortOrder: items.length + 1,
    });
    setDialogOpen(true);
  }

  function openEdit(item: FaqItem) {
    setEditingItem(item);
    setForm(toForm(item));
    setDialogOpen(true);
  }

  async function handleAttachmentUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || t("uploadError"));
      }
      setForm((previous) => ({
        ...previous,
        attachmentUrl: data.data.url,
        attachmentName: data.data.filename || file.name,
      }));
      toast.success(t("attachmentUploaded"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("uploadError"));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleSave() {
    if (!form.category.trim() || !form.question.trim() || !form.summary.trim() || !form.answer.trim()) {
      toast.error(t("saveError"));
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(editingItem ? `/api/faqs/${editingItem.id}` : "/api/faqs", {
        method: editingItem ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || t("saveError"));
      }

      upsertItem(data.data as FaqItem);
      setDialogOpen(false);
      setEditingItem(null);
      setForm(emptyForm);
      toast.success(editingItem ? t("updateSuccess") : t("createSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function handleImportDefaults() {
    try {
      setImportingDefaults(true);
      const res = await fetch("/api/faqs/import-defaults", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || t("importError"));
      }
      await loadFaqs();
      toast.success(t("importSuccess", { created: data.data.created, skipped: data.data.skipped }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("importError"));
    } finally {
      setImportingDefaults(false);
    }
  }

  async function handleDelete() {
    if (!deletingItem) {
      return;
    }

    try {
      const res = await fetch(`/api/faqs/${deletingItem.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || t("deleteError"));
      }
      setItems((previous) => previous.filter((item) => item.id !== deletingItem.id));
      setDeleteOpen(false);
      setDeletingItem(null);
      toast.success(t("deleteSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("deleteError"));
    }
  }

  const sortedItems = [...items].sort((left, right) => {
    if (left.isPinned !== right.isPinned) {
      return left.isPinned ? -1 : 1;
    }
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }
    return right.updatedAt.localeCompare(left.updatedAt);
  });

  return (
    <AdminSectionGuard section="faq">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
            <p className="mt-2 text-slate-600">{t("subtitle")}</p>
            {statusMessage ? <p className="mt-2 text-sm text-rose-600">{statusMessage}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleImportDefaults} disabled={importingDefaults}>
              {importingDefaults ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseZap className="mr-2 h-4 w-4" />}
              {t("importDefaults")}
            </Button>
            <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="mr-2 h-4 w-4" />
              {t("create")}
            </Button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle>{locale === "en" ? `FAQ Items (${items.length})` : `常见问题 (${items.length})`}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-10 text-slate-500">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {locale === "en" ? "Loading FAQ items..." : "正在加载常见问题..."}
                </div>
              ) : sortedItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-500">
                  {t("empty")}
                </div>
              ) : (
                <div className="grid gap-4">
                  {sortedItems.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-900">{item.question}</h3>
                            <Badge variant="outline">{item.category}</Badge>
                            <Badge variant={item.isPublished ? "default" : "secondary"}>
                              {item.isPublished ? t("table.published") : t("table.draft")}
                            </Badge>
                            <Badge variant="outline" className={item.isPinned ? "border-amber-300 text-amber-700" : ""}>
                              {item.isPinned ? t("table.pinned") : t("table.notPinned")}
                            </Badge>
                            <Badge variant="outline">#{item.sortOrder}</Badge>
                          </div>
                          {item.questionEn ? <p className="mt-1 text-sm text-slate-500">{item.questionEn}</p> : null}
                          <p className="mt-3 text-sm leading-6 text-slate-600">{item.summary || "-"}</p>
                          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Paperclip className="h-3.5 w-3.5" />
                              {item.attachmentUrl ? t("table.hasAttachment") : t("table.noAttachment")}
                            </span>
                            <span>{new Date(item.updatedAt).toLocaleString(locale === "en" ? "en-US" : "zh-CN")}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => {
                              setDeletingItem(item);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{editingItem ? t("editTitle") : t("createTitle")}</DialogTitle>
              <DialogDescription>{t("subtitle")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("fields.category")}</Label>
                  <Input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("fields.categoryEn")}</Label>
                  <Input value={form.categoryEn} onChange={(e) => setForm((p) => ({ ...p, categoryEn: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("fields.question")}</Label>
                  <Input value={form.question} onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("fields.questionEn")}</Label>
                  <Input value={form.questionEn} onChange={(e) => setForm((p) => ({ ...p, questionEn: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("fields.summary")}</Label>
                  <Textarea rows={3} value={form.summary} onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("fields.summaryEn")}</Label>
                  <Textarea rows={3} value={form.summaryEn} onChange={(e) => setForm((p) => ({ ...p, summaryEn: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("fields.answer")}</Label>
                  <Textarea rows={6} value={form.answer} onChange={(e) => setForm((p) => ({ ...p, answer: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("fields.answerEn")}</Label>
                  <Textarea rows={6} value={form.answerEn} onChange={(e) => setForm((p) => ({ ...p, answerEn: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[160px,1fr]">
                <div className="space-y-2">
                  <Label>{t("fields.sortOrder")}</Label>
                  <Input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number.parseInt(e.target.value, 10) || 0 }))}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                    <Label>{t("fields.published")}</Label>
                    <Switch checked={form.isPublished} onCheckedChange={(checked) => setForm((p) => ({ ...p, isPublished: checked }))} />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                    <Label>{t("fields.pinned")}</Label>
                    <Switch checked={form.isPinned} onCheckedChange={(checked) => setForm((p) => ({ ...p, isPinned: checked }))} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label>{t("fields.attachment")}</Label>
                    <p className="mt-1 text-xs text-slate-500">{t("attachmentHint")}</p>
                  </div>
                  <label>
                    <input className="hidden" type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={handleAttachmentUpload} disabled={uploading} />
                    <span className="inline-flex h-9 cursor-pointer items-center rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      {uploading ? t("uploading") : t("upload")}
                    </span>
                  </label>
                </div>
                {form.attachmentUrl ? (
                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-2 font-medium text-slate-800">
                        <FileText className="h-4 w-4" />
                        {form.attachmentName || t("attachmentUploaded")}
                      </span>
                      <a className="text-emerald-700 underline" href={form.attachmentUrl} target="_blank" rel="noopener noreferrer">
                        {t("previewAttachment")}
                      </a>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-rose-600"
                        onClick={() => setForm((p) => ({ ...p, attachmentUrl: "", attachmentName: "" }))}
                      >
                        <X className="h-4 w-4" />
                        {t("removeAttachment")}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("cancel")}</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t("save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("deleteTitle")}</DialogTitle>
              <DialogDescription>{t("deleteDescription")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>{t("cancel")}</Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>{t("delete")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminSectionGuard>
  );
}