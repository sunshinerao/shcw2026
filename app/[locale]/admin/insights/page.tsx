"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { BookOpen, Check, Download, Edit2, FileText, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { AdminSectionGuard } from "@/components/admin/admin-section-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getKnowledgeTypePreset, type KnowledgeTypeSettingsMap } from "@/lib/knowledge-type-config";

const typeOptions = ["WHITE_PAPER", "REPORT", "INITIATIVE", "POLICY_BRIEF", "GUIDE", "DECLARATION", "SUMMARY"];
const statusOptions = ["DRAFT", "PUBLISHED"];
const accessTypeOptions = ["PUBLIC", "LOGIN_REQUIRED", "PAID", "HIDDEN"];
const defaultKnowledgeTypeSettings = Object.fromEntries(
  typeOptions.map((type) => [type, getKnowledgeTypePreset(type)])
) as KnowledgeTypeSettingsMap;

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type InsightItem = {
  id: string;
  title: string;
  titleEn?: string | null;
  slug: string;
  type: string;
  status: string;
  accessType: string;
  publishDate?: string | null;
};

type FormState = {
  title: string;
  titleEn: string;
  subtitle: string;
  subtitleEn: string;
  slug: string;
  type: string;
  status: string;
  accessType: string;
  coverImage: string;
  publishDate: string;
  author: string;
  tags: string;
  tagsEn: string;
  summary: string;
  summaryEn: string;
  content: string;
  contentEn: string;
  keyPoints: string[];
  keyPointsEn: string[];
  chapters: any[];
  chaptersEn: any[];
  pullQuote: string;
  pullQuoteEn: string;
  pullQuoteCaption: string;
  pullQuoteCaptionEn: string;
  aboutUs: string;
  aboutUsEn: string;
  references: string;
  recommendations: string;
  recommendationsEn: string;
  fileUrl: string;
  fileFormat: string;
  primaryTemplateId: string;
  webTemplateId: string;
  relatedEventIds: string[];
  relatedInstitutionIds: string[];
  relatedSpeakerIds: string[];
  relatedTrackIds: string[];
};

type OptionItem = {
  id: string;
  name: string;
  nameEn?: string | null;
  slug?: string;
};

type TemplateItem = {
  id: string;
  code?: string | null;
  name: string;
  nameEn?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
};

const emptyForm: FormState = {
  title: "",
  titleEn: "",
  subtitle: "",
  subtitleEn: "",
  slug: "",
  type: "REPORT",
  status: "PUBLISHED",
  accessType: "PUBLIC",
  coverImage: "",
  publishDate: "",
  author: "",
  tags: "",
  tagsEn: "",
  summary: "",
  summaryEn: "",
  content: "",
  contentEn: "",
  keyPoints: [],
  keyPointsEn: [],
  chapters: [],
  chaptersEn: [],
  pullQuote: "",
  pullQuoteEn: "",
  pullQuoteCaption: "",
  pullQuoteCaptionEn: "",
  aboutUs: "",
  aboutUsEn: "",
  references: "",
  recommendations: "",
  recommendationsEn: "",
  fileUrl: "",
  fileFormat: "PDF",
  primaryTemplateId: "",
  webTemplateId: "",
  relatedEventIds: [],
  relatedInstitutionIds: [],
  relatedSpeakerIds: [],
  relatedTrackIds: [],
};

function toggleId(list: string[], id: string) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

function getDefaultTemplateId(list: TemplateItem[]) {
  if (!list.length) return "";
  return list.find((item) => item.isDefault)?.id || list[0].id;
}

function getTemplateIdByCode(list: TemplateItem[], code: string) {
  return list.find((item) => item.code === code)?.id || "";
}

function getRecommendedTemplateIds(
  type: string,
  formalTemplates: TemplateItem[],
  webTemplates: TemplateItem[],
  typeSettings?: KnowledgeTypeSettingsMap,
) {
  const preset = getKnowledgeTypePreset(type, typeSettings);
  return {
    primaryTemplateId: getTemplateIdByCode(formalTemplates, preset.formalTemplateCodeStandard || preset.formalTemplateCode) || getDefaultTemplateId(formalTemplates),
    webTemplateId: getTemplateIdByCode(webTemplates, preset.webTemplateCodeStandard || preset.webTemplateCode) || getDefaultTemplateId(webTemplates),
  };
}

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminInsightsPage() {
  const locale = useLocale();
  const t = useTranslations("adminInsightsPage");
  const [items, setItems] = useState<InsightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [status, setStatus] = useState("");
  const [eventOptions, setEventOptions] = useState<OptionItem[]>([]);
  const [institutionOptions, setInstitutionOptions] = useState<OptionItem[]>([]);
  const [speakerOptions, setSpeakerOptions] = useState<OptionItem[]>([]);
  const [trackOptions, setTrackOptions] = useState<OptionItem[]>([]);
  const [formalTemplates, setFormalTemplates] = useState<TemplateItem[]>([]);
  const [webTemplates, setWebTemplates] = useState<TemplateItem[]>([]);
  const [knowledgeTypeSettings, setKnowledgeTypeSettings] = useState<KnowledgeTypeSettingsMap>(defaultKnowledgeTypeSettings);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const currentTypePreset = getKnowledgeTypePreset(form.type, knowledgeTypeSettings);
  const nameOf = (item: { name: string; nameEn?: string | null }) => (locale === "en" && item.nameEn ? item.nameEn : item.name);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/insights?pageSize=100");
      const json = await res.json();
      if (json.success) {
        setItems(json.data?.items || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        const [eventsRes, institutionsRes, speakersRes, tracksRes, templatesRes] = await Promise.all([
          fetch("/api/events?pageSize=200").then((r) => r.json()),
          fetch("/api/institutions?limit=200").then((r) => r.json()),
          fetch("/api/speakers?limit=200").then((r) => r.json()),
          fetch("/api/tracks").then((r) => r.json()),
          fetch("/api/knowledge-templates").then((r) => r.json()),
        ]);

        if (!cancelled) {
          setEventOptions(
            (eventsRes?.data?.events || []).map((e: any) => ({
              id: e.id,
              name: e.title,
              nameEn: e.titleEn,
            }))
          );

          const institutionList = Array.isArray(institutionsRes?.data)
            ? institutionsRes.data
            : Array.isArray(institutionsRes?.data?.items)
            ? institutionsRes.data.items
            : Array.isArray(institutionsRes?.items)
            ? institutionsRes.items
            : [];

          setInstitutionOptions(
            institutionList
              .map((i: any) => ({
                id: i.id,
                name: i.name,
                nameEn: i.nameEn,
                slug: i.slug,
              }))
              .filter((i: OptionItem) => Boolean(i.id && i.name))
          );

          setSpeakerOptions(
            (speakersRes?.data || []).map((s: any) => ({
              id: s.id,
              name: s.name,
              nameEn: s.nameEn,
            }))
          );

          setTrackOptions(
            (tracksRes?.data || []).map((t: any) => ({
              id: t.id,
              name: t.name,
              nameEn: t.nameEn,
            }))
          );

          setFormalTemplates(templatesRes?.data?.formalTemplates || []);
          setWebTemplates(templatesRes?.data?.webTemplates || []);
          setKnowledgeTypeSettings(templatesRes?.data?.typeSettings || defaultKnowledgeTypeSettings);
        }
      } catch {
        // ignore
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, [locale]);

  function openCreate() {
    setEditingId(null);
    const recommended = getRecommendedTemplateIds(emptyForm.type, formalTemplates, webTemplates, knowledgeTypeSettings);
    setForm({
      ...emptyForm,
      publishDate: todayDateInputValue(),
      primaryTemplateId: recommended.primaryTemplateId,
      webTemplateId: recommended.webTemplateId,
    });
    setDialogOpen(true);
  }

  async function uploadInsightFile(file: File) {
    setIsUploadingFile(true);
    setStatus("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("uploadMode", "publish");

      const res = await fetch("/api/insights/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || t("messages.uploadFailed"));
      }

      const extracted = json.data?.extracted || {};
      setForm((prev) => {
        const nextTitle = prev.title || extracted.title || "";
        return {
          ...prev,
          fileUrl: json.data?.url || prev.fileUrl,
          fileFormat: extracted.fileFormat || prev.fileFormat,
          coverImage: prev.coverImage || extracted.coverImage || "",
          title: nextTitle,
          titleEn: prev.titleEn || extracted.title || "",
          subtitle: prev.subtitle || extracted.subtitle || "",
          subtitleEn: prev.subtitleEn || extracted.subtitleEn || extracted.subtitle || "",
          slug: prev.slug || extracted.slugSuggestion || slugify(nextTitle),
          summary: prev.summary || extracted.summary || "",
          summaryEn: prev.summaryEn || extracted.summaryEn || extracted.summary || "",
          content: prev.content || extracted.shortContent || "",
          contentEn: prev.contentEn || extracted.shortContentEn || extracted.shortContent || "",
        };
      });
      setStatus(t("messages.uploaded"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("messages.uploadFailed"));
    } finally {
      setIsUploadingFile(false);
    }
  }

  async function uploadCoreMarkdownFile(file: File) {
    setIsUploadingFile(true);
    setStatus("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("uploadMode", "core");
      formData.append("assetType", form.type);

      const res = await fetch("/api/insights/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || t("messages.uploadFailed"));
      }

      const extracted = json.data?.extracted || {};

      setForm((prev) => {
        const nextType = extracted.typeSuggestion || prev.type;
        const recommended = getRecommendedTemplateIds(nextType, formalTemplates, webTemplates, knowledgeTypeSettings);
        const nextTitle = prev.title || extracted.title || "";
        const nextSubtitle = prev.subtitle || extracted.subtitle || nextTitle;

        return {
          ...prev,
          type: nextType,
          title: nextTitle,
          titleEn: prev.titleEn || extracted.titleEn || nextTitle,
          subtitle: nextSubtitle,
          subtitleEn: prev.subtitleEn || extracted.subtitleEn || nextSubtitle,
          slug: prev.slug || extracted.slugSuggestion || slugify(nextTitle),
          author: prev.author || extracted.author || "",
          tags: prev.tags || extracted.tags || "",
          tagsEn: prev.tagsEn || extracted.tagsEn || "",
          summary: prev.summary || extracted.summary || "",
          summaryEn: prev.summaryEn || extracted.summaryEn || "",
          content: prev.content || extracted.fullContent || extracted.shortContent || "",
          contentEn: prev.contentEn || extracted.fullContentEn || extracted.shortContentEn || "",
          keyPoints: Array.isArray(extracted.keyPoints) ? extracted.keyPoints : prev.keyPoints,
          keyPointsEn: Array.isArray(extracted.keyPointsEn) ? extracted.keyPointsEn : prev.keyPointsEn,
          chapters: Array.isArray(extracted.chapters) ? extracted.chapters : prev.chapters,
          chaptersEn: Array.isArray(extracted.chaptersEn) ? extracted.chaptersEn : prev.chaptersEn,
          pullQuote: prev.pullQuote || extracted.pullQuote || "",
          pullQuoteEn: prev.pullQuoteEn || extracted.pullQuoteEn || "",
          pullQuoteCaption: prev.pullQuoteCaption || extracted.pullQuoteCaption || "",
          pullQuoteCaptionEn: prev.pullQuoteCaptionEn || extracted.pullQuoteCaptionEn || "",
          aboutUs: prev.aboutUs || extracted.aboutUs || "",
          aboutUsEn: prev.aboutUsEn || extracted.aboutUsEn || "",
          references: prev.references ||
            (Array.isArray(extracted.references) ? extracted.references.join("\n") : ""),
          recommendations: prev.recommendations ||
            (Array.isArray(extracted.recommendations) ? extracted.recommendations.join("\n") : ""),
          recommendationsEn: prev.recommendationsEn ||
            (Array.isArray(extracted.recommendationsEn) ? extracted.recommendationsEn.join("\n") : ""),
          coverImage: prev.coverImage || extracted.coverImage || "",
          primaryTemplateId: prev.primaryTemplateId || recommended.primaryTemplateId,
          webTemplateId: prev.webTemplateId || recommended.webTemplateId,
        };
      });

      setStatus(t("messages.uploadedStructuredSource"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("messages.uploadFailed"));
    } finally {
      setIsUploadingFile(false);
    }
  }

  async function uploadCoverImage(file: File) {
    setStatus("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "insights");

      const res = await fetch("/api/upload/image", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok || !json.success || !json.data?.url) {
        throw new Error(json.error || t("messages.uploadCoverFailed"));
      }

      setForm((prev) => ({ ...prev, coverImage: json.data.url }));
      setStatus(t("messages.uploadedCover"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("messages.uploadCoverFailed"));
    }
  }

  async function openEdit(id: string) {
    const res = await fetch(`/api/insights/${id}`);
    const json = await res.json();
    if (!json.success) return;
    const data = json.data;
    setEditingId(id);
    setForm({
      title: data.title || "",
      titleEn: data.titleEn || "",
      subtitle: data.subtitle || "",
      subtitleEn: data.subtitleEn || "",
      slug: data.slug || "",
      type: data.type || "REPORT",
      status: data.status || "DRAFT",
      accessType: data.accessType || "PUBLIC",
      coverImage: data.coverImage || "",
      publishDate: data.publishDate ? new Date(data.publishDate).toISOString().slice(0, 10) : "",
      author: data.author || "",
      tags: data.tags || "",
      tagsEn: data.tagsEn || "",
      summary: data.summary || "",
      summaryEn: data.summaryEn || "",
      content: data.content || "",
      contentEn: data.contentEn || "",
      keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
      keyPointsEn: Array.isArray(data.keyPointsEn) ? data.keyPointsEn : [],
      chapters: Array.isArray(data.chapters) ? data.chapters : [],
      chaptersEn: Array.isArray(data.chaptersEn) ? data.chaptersEn : [],
      pullQuote: data.pullQuote || "",
      pullQuoteEn: data.pullQuoteEn || "",
      pullQuoteCaption: data.pullQuoteCaption || "",
      pullQuoteCaptionEn: data.pullQuoteCaptionEn || "",
      aboutUs: data.aboutUs || "",
      aboutUsEn: data.aboutUsEn || "",
      references: Array.isArray(data.references) ? data.references.join("\n") : (data.references || ""),
      recommendations: data.recommendations || "",
      recommendationsEn: data.recommendationsEn || "",
      fileUrl: data.fileUrl || "",
      fileFormat: data.fileFormat || "PDF",
      primaryTemplateId: data.primaryTemplateId || "",
      webTemplateId: data.webTemplateId || "",
      relatedEventIds: (data.events || []).map((x: any) => x.eventId || x.event?.id).filter(Boolean),
      relatedInstitutionIds: (data.institutions || []).map((x: any) => x.institutionId || x.institution?.id).filter(Boolean),
      relatedSpeakerIds: (data.speakers || []).map((x: any) => x.speakerId || x.speaker?.id).filter(Boolean),
      relatedTrackIds: (data.tracks || []).map((x: any) => x.trackId || x.track?.id).filter(Boolean),
    });
    setDialogOpen(true);
  }

  async function save() {
    try {
      const inferredTitle = form.title || form.titleEn;
      const normalizedSubtitle = form.subtitle || inferredTitle || "";
      // references is stored as newline-separated string → convert to JSON array for API
      const refsArray = form.references
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean);
      const payload = {
        ...form,
        subtitle: normalizedSubtitle,
        publishDate: form.publishDate || todayDateInputValue(),
        slug: form.slug || slugify(inferredTitle || ""),
        status: form.status || "PUBLISHED",
        references: refsArray.length > 0 ? refsArray : null,
      };

      if (!payload.slug) {
        throw new Error(t("messages.slugRequired"));
      }

      const url = editingId ? `/api/insights/${editingId}` : "/api/insights";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || t("messages.failed"));
      setDialogOpen(false);
      setStatus(t("messages.saved"));
      loadData();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("messages.failed"));
    }
  }

  function clearPublishFile() {
    setForm((prev) => ({
      ...prev,
      fileUrl: "",
      fileFormat: "",
    }));
    setStatus(t("messages.publishFileCleared"));
  }

  function clearCoreContent() {
    setForm((prev) => ({
      ...prev,
      title: "",
      titleEn: "",
      subtitle: "",
      subtitleEn: "",
      summary: "",
      summaryEn: "",
      content: "",
      contentEn: "",
      keyPoints: [],
      keyPointsEn: [],
      chapters: [],
      chaptersEn: [],
      slug: "",
      author: "",
      tags: "",
      tagsEn: "",
      pullQuote: "",
      pullQuoteEn: "",
      pullQuoteCaption: "",
      pullQuoteCaptionEn: "",
      aboutUs: "",
      aboutUsEn: "",
      references: "",
      recommendations: "",
      recommendationsEn: "",
    }));
    setStatus(t("messages.coreContentCleared"));
  }

  async function remove(id: string) {
    if (!confirm(t("messages.confirmDelete"))) return;
    const res = await fetch(`/api/insights/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      loadData();
    }
  }

  return (
    <AdminSectionGuard section="insights">
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
            <p className="text-sm text-slate-600">{t("subtitle")}</p>
          </div>
          <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="mr-2 h-4 w-4" />
            {t("actions.new")}
          </Button>
        </motion.div>

        {status && <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{status}</div>}

        <Card>
          <CardHeader>
            <CardTitle>{t("list.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-slate-500">{t("list.loading")}</div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <BookOpen className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                {t("list.empty")}
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.type} · {item.status} · {item.accessType}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => void openEdit(item.id)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => void remove(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? t("dialog.editTitle") : t("dialog.createTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>{t("fields.titleZh")}</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t("fields.titleEn")}</Label><Input value={form.titleEn} onChange={(e) => setForm((p) => ({ ...p, titleEn: e.target.value }))} /></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>{t("fields.subtitleZh")}</Label><Input value={form.subtitle} onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t("fields.subtitleEn")}</Label><Input value={form.subtitleEn} onChange={(e) => setForm((p) => ({ ...p, subtitleEn: e.target.value }))} /></div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-2"><Label>{t("fields.slug")}</Label><Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t("fields.type")}</Label><Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v, ...getRecommendedTemplateIds(v, formalTemplates, webTemplates, knowledgeTypeSettings) }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{typeOptions.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
              </div>

              {/* MD Upload section */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Label className="text-sm font-semibold text-slate-700">{t("fields.uploadCoreFile")}</Label>
                    <p className="mt-1 text-xs text-slate-500">
                      {locale === "en"
                        ? `Current type: ${currentTypePreset.labelEn}. The system will auto-read one bilingual source file and match the recommended templates.`
                        : `当前类型：${currentTypePreset.labelZh}。系统会自动识别同一份中英结构化源文档，并匹配推荐模板。`}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" asChild>
                    <a href={`/api/insights/md-spec?type=${form.type}`} download>
                      <Download className="mr-1 h-3.5 w-3.5" />
                      {t("actions.specUnified")}
                    </a>
                  </Button>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">{t("fields.uploadStructuredMd")}</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".md,.markdown,text/markdown,text/plain"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadCoreMarkdownFile(file);
                      }}
                      disabled={isUploadingFile}
                    />
                    {isUploadingFile && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={clearCoreContent}>
                    {t("actions.clearCoreContent")}
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>{t("fields.status")}</Label><Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{statusOptions.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>{t("fields.access")}</Label><Select value={form.accessType} onValueChange={(v) => setForm((p) => ({ ...p, accessType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{accessTypeOptions.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("fields.coverImage")}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          void uploadCoverImage(file);
                        }
                      }}
                    />
                    <Button type="button" variant="outline" disabled>
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                  {form.coverImage && <p className="text-xs text-slate-500 truncate">{form.coverImage}</p>}
                </div>
                <div className="space-y-2"><Label>{t("fields.publishDate")}</Label><Input type="date" value={form.publishDate} onChange={(e) => setForm((p) => ({ ...p, publishDate: e.target.value }))} /></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("fields.formalTemplate")}</Label>
                  <Select
                    value={form.primaryTemplateId || "none"}
                    onValueChange={(v) => setForm((p) => ({ ...p, primaryTemplateId: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("fields.selectFormalTemplate")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("fields.selectFormalTemplate")}</SelectItem>
                      {formalTemplates.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {nameOf(item)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("fields.webTemplate")}</Label>
                  <Select
                    value={form.webTemplateId || "none"}
                    onValueChange={(v) => setForm((p) => ({ ...p, webTemplateId: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("fields.selectWebTemplate")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("fields.selectWebTemplate")}</SelectItem>
                      {webTemplates.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {nameOf(item)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                {editingId ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <a href={`/api/insights/${editingId}/export?format=html`} target="_blank" rel="noopener noreferrer">
                        <FileText className="mr-1 h-4 w-4" />
                        {locale === "en" ? "Formal Preview" : "正式预览"}
                      </a>
                    </Button>
                    <Button type="button" variant="outline" size="sm" asChild>
                      <a href={`/api/insights/${editingId}/export?format=pdf&download=true`} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-1 h-4 w-4" />
                        {locale === "en" ? "Download current PDF" : "下载当前 PDF"}
                      </a>
                    </Button>
                    <span className="text-xs text-slate-500">
                      {locale === "en" ? "Preview uses the selected formal document template." : "预览将调用当前选中的正式文档模板。"}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    {locale === "en" ? "Save the knowledge asset first to open the formal preview and PDF export." : "请先保存成果，再打开正式预览和 PDF 导出。"}
                  </p>
                )}
              </div>
              <div className="space-y-2"><Label>{t("fields.summary")}</Label><Textarea rows={3} value={form.summary} onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))} /></div>
              <div className="space-y-2"><Label>{t("fields.summaryEn")}</Label><Textarea rows={3} value={form.summaryEn} onChange={(e) => setForm((p) => ({ ...p, summaryEn: e.target.value }))} /></div>

              {/* Extended fields: author, tags, pull quote, references */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>{t("fields.author")}</Label><Input value={form.author} onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t("fields.tags")}</Label><Input placeholder="tag1, tag2, tag3" value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} /></div>
              </div>
              <div className="space-y-2">
                <Label>{t("fields.pullQuote")}</Label>
                <Textarea rows={2} value={form.pullQuote} onChange={(e) => setForm((p) => ({ ...p, pullQuote: e.target.value }))} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>{t("fields.pullQuoteCaption")}</Label><Input value={form.pullQuoteCaption} onChange={(e) => setForm((p) => ({ ...p, pullQuoteCaption: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t("fields.pullQuoteCaptionEn")}</Label><Input value={form.pullQuoteCaptionEn} onChange={(e) => setForm((p) => ({ ...p, pullQuoteCaptionEn: e.target.value }))} /></div>
              </div>
              <div className="space-y-2"><Label>{t("fields.references")}</Label><Textarea rows={3} placeholder="1. Author, Year. Title." value={form.references} onChange={(e) => setForm((p) => ({ ...p, references: e.target.value }))} /></div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>{t("fields.recommendations")}</Label><Textarea rows={3} value={form.recommendations} onChange={(e) => setForm((p) => ({ ...p, recommendations: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t("fields.recommendationsEn")}</Label><Textarea rows={3} value={form.recommendationsEn} onChange={(e) => setForm((p) => ({ ...p, recommendationsEn: e.target.value }))} /></div>
              </div>

              {/* Publish file upload */}
              <div className="space-y-2">
                <Label>{t("fields.uploadPublishFile")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".pdf,.txt,.md,.markdown,.json,.csv,.docx,.doc"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void uploadInsightFile(file);
                      }
                    }}
                    disabled={isUploadingFile}
                  />
                  <Button type="button" variant="outline" disabled>
                    {isUploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={clearPublishFile}>
                  {t("actions.clearPublishFile")}
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>{t("fields.fileUrl")}</Label><Input value={form.fileUrl} onChange={(e) => setForm((p) => ({ ...p, fileUrl: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t("fields.format")}</Label><Input value={form.fileFormat} onChange={(e) => setForm((p) => ({ ...p, fileFormat: e.target.value }))} /></div>
              </div>

              <div className="space-y-2">
                <Label>{t("fields.relatedEvents")}</Label>
                <div className="max-h-36 overflow-y-auto rounded-md border border-slate-200 p-2 space-y-1">
                  {eventOptions.map((item) => {
                    const selected = form.relatedEventIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, relatedEventIds: toggleId(p.relatedEventIds, item.id) }))}
                        className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm ${selected ? "bg-emerald-50 text-emerald-700" : "hover:bg-slate-50 text-slate-700"}`}
                      >
                        <span className="truncate">{nameOf(item)}</span>
                        {selected && <Check className="h-3.5 w-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("fields.relatedInstitutions")}</Label>
                <div className="max-h-36 overflow-y-auto rounded-md border border-slate-200 p-2 space-y-1">
                  {institutionOptions.length === 0 ? (
                    <p className="px-2 py-1 text-sm text-slate-500">{t("messages.noInstitutionOptions")}</p>
                  ) : institutionOptions.map((item) => {
                    const selected = form.relatedInstitutionIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, relatedInstitutionIds: toggleId(p.relatedInstitutionIds, item.id) }))}
                        className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm ${selected ? "bg-emerald-50 text-emerald-700" : "hover:bg-slate-50 text-slate-700"}`}
                      >
                        <span className="truncate">{nameOf(item)}</span>
                        {selected && <Check className="h-3.5 w-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("fields.relatedSpeakers")}</Label>
                  <div className="max-h-32 overflow-y-auto rounded-md border border-slate-200 p-2 space-y-1">
                    {speakerOptions.map((item) => {
                      const selected = form.relatedSpeakerIds.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, relatedSpeakerIds: toggleId(p.relatedSpeakerIds, item.id) }))}
                          className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm ${selected ? "bg-emerald-50 text-emerald-700" : "hover:bg-slate-50 text-slate-700"}`}
                        >
                          <span className="truncate">{nameOf(item)}</span>
                          {selected && <Check className="h-3.5 w-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("fields.relatedTracks")}</Label>
                  <div className="max-h-32 overflow-y-auto rounded-md border border-slate-200 p-2 space-y-1">
                    {trackOptions.map((item) => {
                      const selected = form.relatedTrackIds.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, relatedTrackIds: toggleId(p.relatedTrackIds, item.id) }))}
                          className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm ${selected ? "bg-emerald-50 text-emerald-700" : "hover:bg-slate-50 text-slate-700"}`}
                        >
                          <span className="truncate">{nameOf(item)}</span>
                          {selected && <Check className="h-3.5 w-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("actions.cancel")}</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => void save()}>{t("actions.save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminSectionGuard>
  );
}
