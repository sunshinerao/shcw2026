"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Newspaper,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { AdminSectionGuard } from "@/components/admin/admin-section-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type NewsItem = {
  id: string;
  title: string;
  titleEn?: string | null;
  slug: string;
  excerpt?: string | null;
  excerptEn?: string | null;
  content: string;
  contentEn?: string | null;
  coverImage?: string | null;
  isPublished: boolean;
  publishedAt?: string | null;
  views: number;
  createdAt: string;
};

type NewsForm = {
  title: string;
  titleEn: string;
  slug: string;
  excerpt: string;
  excerptEn: string;
  content: string;
  contentEn: string;
  coverImage: string;
  isPublished: boolean;
};

const emptyForm: NewsForm = {
  title: "",
  titleEn: "",
  slug: "",
  excerpt: "",
  excerptEn: "",
  content: "",
  contentEn: "",
  coverImage: "",
  isPublished: false,
};

export default function AdminNewsPage() {
  const t = useTranslations("adminNews");
  const locale = useLocale();

  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<NewsForm>({ ...emptyForm });
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");
  const [seeding, setSeeding] = useState(false);

  const [loadError, setLoadError] = useState(false);

  const loadNews = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const res = await fetch("/api/news?pageSize=50");
      const data = await res.json();
      if (data.success) {
        setNews(data.data?.news || []);
      } else {
        setLoadError(true);
        setStatusTone("error");
        setStatusMessage(data.error || t("loadError"));
      }
    } catch {
      setLoadError(true);
      setStatusTone("error");
      setStatusMessage(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  }

  function openEdit(item: NewsItem) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      titleEn: item.titleEn || "",
      slug: item.slug,
      excerpt: item.excerpt || "",
      excerptEn: item.excerptEn || "",
      content: item.content,
      contentEn: item.contentEn || "",
      coverImage: item.coverImage || "",
      isPublished: item.isPublished,
    });
    setDialogOpen(true);
  }

  function generateSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
  }

  async function handleSave() {
    if (!form.title || !form.slug || !form.content) return;
    setSaving(true);
    try {
      const url = editingId ? `/api/news/${editingId}` : "/api/news";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed");
      }
      setStatusTone("success");
      setStatusMessage(editingId ? t("updateSuccess") : t("createSuccess"));
      setDialogOpen(false);
      loadNews();
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(error instanceof Error ? error.message : t("loadError"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/news/${deleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      setStatusTone("success");
      setStatusMessage(t("deleteSuccess"));
      setDeleteDialogOpen(false);
      setDeleteId(null);
      loadNews();
    } catch {
      setStatusTone("error");
      setStatusMessage(t("loadError"));
    } finally {
      setDeleting(false);
    }
  }

  async function handleTogglePublish(item: NewsItem) {
    try {
      const res = await fetch(`/api/news/${item.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isPublished: !item.isPublished }),
      });
      const data = await res.json();
      if (data.success) {
        loadNews();
      }
    } catch {
      // silent
    }
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", "news");
    try {
      const res = await fetch("/api/upload/image", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success && data.data?.url) {
        setForm((prev) => ({ ...prev, coverImage: data.data.url }));
        setStatusTone("success");
        setStatusMessage(t("uploadSuccess"));
      } else {
        setStatusTone("error");
        setStatusMessage(data.error || t("uploadFailed"));
      }
    } catch {
      setStatusTone("error");
      setStatusMessage(t("uploadFailed"));
    }
  }

  async function handleSeedNews() {
    setSeeding(true);
    try {
      const res = await fetch("/api/news/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setStatusTone("success");
        setStatusMessage(`${t("seedSuccess")}: ${data.data.created} ${t("seedCreated")}, ${data.data.skipped} ${t("seedSkipped")}`);
        loadNews();
      } else {
        setStatusTone("error");
        setStatusMessage(data.error || t("loadError"));
      }
    } catch {
      setStatusTone("error");
      setStatusMessage(t("loadError"));
    } finally {
      setSeeding(false);
    }
  }

  return (
    <AdminSectionGuard section="news">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
            <p className="text-slate-600">{t("subtitle")}</p>
          </div>
          <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />
            {t("create")}
          </Button>
        </motion.div>

        {statusMessage && (
          <div
            className={`p-3 rounded-lg text-sm ${
              statusTone === "success"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {statusMessage}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : news.length === 0 ? (
          <Card>
            <CardContent className="py-20 text-center text-slate-500">
              <Newspaper className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>{loadError ? t("loadError") : t("empty")}</p>
              {!loadError && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={handleSeedNews}
                  disabled={seeding}
                >
                  {seeding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t("seedButton")}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {news.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {item.coverImage && (
                        <Image
                          src={item.coverImage}
                          alt=""
                          width={96}
                          height={64}
                          unoptimized
                          className="w-24 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900 truncate">
                            {locale === "en" ? (item.titleEn || item.title) : item.title}
                          </h3>
                          <Badge variant={item.isPublished ? "default" : "secondary"} className="flex-shrink-0">
                            {item.isPublished ? t("status.published") : t("status.draft")}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-1">
                          {locale === "en" ? (item.excerptEn || item.excerpt) : item.excerpt}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                          <span>{new Date(item.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "zh-CN")}</span>
                          <span>{item.views} views</span>
                          <span>/{item.slug}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTogglePublish(item)}
                          title={item.isPublished ? "Unpublish" : "Publish"}
                        >
                          {item.isPublished ? (
                            <EyeOff className="w-4 h-4 text-slate-500" />
                          ) : (
                            <Eye className="w-4 h-4 text-emerald-600" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                          <Edit2 className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeleteId(item.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create / Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? t("edit") : t("create")}</DialogTitle>
              <DialogDescription>{t("subtitle")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("form.title")}</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        title,
                        slug: prev.slug || generateSlug(title),
                      }));
                    }}
                  />
                </div>
                <div>
                  <Label>{t("form.titleEn")}</Label>
                  <Input
                    value={form.titleEn}
                    onChange={(e) => setForm((prev) => ({ ...prev, titleEn: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>{t("form.slug")}</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("form.excerpt")}</Label>
                  <Textarea
                    value={form.excerpt}
                    onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>{t("form.excerptEn")}</Label>
                  <Textarea
                    value={form.excerptEn}
                    onChange={(e) => setForm((prev) => ({ ...prev, excerptEn: e.target.value }))}
                    rows={2}
                  />
                </div>
              </div>

              <div>
                <Label>{t("form.content")}</Label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                  rows={8}
                />
              </div>

              <div>
                <Label>{t("form.contentEn")}</Label>
                <Textarea
                  value={form.contentEn}
                  onChange={(e) => setForm((prev) => ({ ...prev, contentEn: e.target.value }))}
                  rows={8}
                />
              </div>

              <div>
                <Label>{t("form.coverImage")}</Label>
                <div className="flex items-center gap-4">
                  {form.coverImage && (
                    <Image src={form.coverImage} alt="" width={128} height={80} unoptimized className="w-32 h-20 rounded-lg object-cover" />
                  )}
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-slate-50">
                    <ImageIcon className="w-4 h-4" />
                    Upload
                    <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                  </label>
                  {form.coverImage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setForm((prev) => ({ ...prev, coverImage: "" }))}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={form.isPublished}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isPublished: checked }))}
                />
                <Label>{t("form.isPublished")}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t("form.cancel")}
              </Button>
              <LoadingButton
                onClick={handleSave}
                disabled={!form.title || !form.slug || !form.content}
                className="bg-emerald-600 hover:bg-emerald-700"
                loading={saving}
                loadingText={locale === "en" ? "Saving..." : "保存中..."}
              >
                {t("form.save")}
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("delete")}</DialogTitle>
              <DialogDescription>{t("confirmDelete")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                {t("form.cancel")}
              </Button>
              <LoadingButton variant="destructive" onClick={handleDelete} loading={deleting} loadingText={locale === "en" ? "Deleting..." : "删除中..."}>
                {t("delete")}
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminSectionGuard>
  );
}
