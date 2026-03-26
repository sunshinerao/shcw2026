"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2, CheckCircle2 } from "lucide-react";

type ContentBlock = {
  key: string;
  title: string | null;
  titleEn: string | null;
  subtitle: string | null;
  subtitleEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  extra: Record<string, unknown> | null;
};

const CONTENT_KEYS = [
  { key: "about_us", labelKey: "aboutUs" },
  { key: "mission", labelKey: "mission" },
  { key: "highlights", labelKey: "highlights" },
  { key: "timeline", labelKey: "timeline" },
  { key: "team", labelKey: "team" },
] as const;

const HIGHLIGHT_ITEMS = [
  { key: "system", label: "系统变革" },
  { key: "action", label: "行动导向" },
  { key: "momentum", label: "全球动能" },
  { key: "winwin", label: "共赢生态" },
] as const;

const TIMELINE_ITEMS = [
  { key: "2024", label: "2024" },
  { key: "2025", label: "2025" },
  { key: "2026", label: "2026" },
] as const;

const TEAM_ITEMS = [
  { key: "chair", label: "主席" },
  { key: "viceChair", label: "副主席" },
  { key: "secretaryGeneral", label: "秘书长" },
] as const;

export default function AdminContentPage() {
  const t = useTranslations("adminSiteContent");
  const [blocks, setBlocks] = useState<Record<string, ContentBlock>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const fetchBlock = useCallback(async (key: string) => {
    try {
      const res = await fetch(`/api/site-content?key=${key}`);
      const json = await res.json();
      if (json.success && json.data) {
        setBlocks((prev) => ({ ...prev, [key]: json.data }));
      } else {
        setBlocks((prev) => ({
          ...prev,
          [key]: {
            key,
            title: null,
            titleEn: null,
            subtitle: null,
            subtitleEn: null,
            description: null,
            descriptionEn: null,
            extra: null,
          },
        }));
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    CONTENT_KEYS.forEach((c) => fetchBlock(c.key));
  }, [fetchBlock]);

  function updateField(key: string, field: keyof ContentBlock, value: string) {
    setBlocks((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  }

  function updateExtra(contentKey: string, itemKey: string, field: string, value: string) {
    setBlocks((prev) => {
      const block = prev[contentKey] || {
        key: contentKey, title: null, titleEn: null, subtitle: null, subtitleEn: null,
        description: null, descriptionEn: null, extra: null,
      };
      const extra = (block.extra || {}) as Record<string, Record<string, string>>;
      return {
        ...prev,
        [contentKey]: {
          ...block,
          extra: {
            ...extra,
            [itemKey]: { ...extra[itemKey], [field]: value },
          },
        },
      };
    });
  }

  async function saveBlock(key: string) {
    const block = blocks[key];
    if (!block) return;
    setSaving(key);
    try {
      const res = await fetch("/api/site-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(block),
      });
      const json = await res.json();
      if (json.success) {
        setSaved(key);
        setTimeout(() => setSaved(null), 2000);
      } else {
        alert(t("saveFailed"));
      }
    } catch {
      alert(t("saveFailed"));
    } finally {
      setSaving(null);
    }
  }

  function renderForm(key: string) {
    const block = blocks[key];
    if (!block) return <div className="text-center py-8 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("form.sectionTitle")}</Label>
            <Input
              value={block.title ?? ""}
              onChange={(e) => updateField(key, "title", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("form.sectionTitleEn")}</Label>
            <Input
              value={block.titleEn ?? ""}
              onChange={(e) => updateField(key, "titleEn", e.target.value)}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("form.sectionSubtitle")}</Label>
            <Input
              value={block.subtitle ?? ""}
              onChange={(e) => updateField(key, "subtitle", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("form.sectionSubtitleEn")}</Label>
            <Input
              value={block.subtitleEn ?? ""}
              onChange={(e) => updateField(key, "subtitleEn", e.target.value)}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("form.sectionDescription")}</Label>
            <Textarea
              rows={6}
              value={block.description ?? ""}
              onChange={(e) => updateField(key, "description", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("form.sectionDescriptionEn")}</Label>
            <Textarea
              rows={6}
              value={block.descriptionEn ?? ""}
              onChange={(e) => updateField(key, "descriptionEn", e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => saveBlock(key)} disabled={saving === key}>
            {saving === key ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : saved === key ? (
              <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saved === key ? t("saveSuccess") : t("form.save")}
          </Button>
        </div>
      </div>
    );
  }

  function renderSaveButton(key: string) {
    return (
      <div className="flex justify-end">
        <Button onClick={() => saveBlock(key)} disabled={saving === key}>
          {saving === key ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : saved === key ? (
            <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saved === key ? t("saveSuccess") : t("form.save")}
        </Button>
      </div>
    );
  }

  function renderHighlightsForm() {
    const key = "highlights";
    const block = blocks[key];
    if (!block) return <div className="text-center py-8 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
    const extra = (block.extra || {}) as Record<string, Record<string, string>>;

    return (
      <div className="space-y-6">
        {HIGHLIGHT_ITEMS.map((item) => (
          <div key={item.key} className="border rounded-lg p-4 space-y-4">
            <h4 className="font-semibold text-slate-700">{item.label} ({item.key})</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("form.sectionTitle")}</Label>
                <Input value={extra[item.key]?.title ?? ""} onChange={(e) => updateExtra(key, item.key, "title", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("form.sectionTitleEn")}</Label>
                <Input value={extra[item.key]?.titleEn ?? ""} onChange={(e) => updateExtra(key, item.key, "titleEn", e.target.value)} />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("form.sectionDescription")}</Label>
                <Textarea rows={3} value={extra[item.key]?.description ?? ""} onChange={(e) => updateExtra(key, item.key, "description", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("form.sectionDescriptionEn")}</Label>
                <Textarea rows={3} value={extra[item.key]?.descriptionEn ?? ""} onChange={(e) => updateExtra(key, item.key, "descriptionEn", e.target.value)} />
              </div>
            </div>
          </div>
        ))}
        {renderSaveButton(key)}
      </div>
    );
  }

  function renderTimelineForm() {
    const key = "timeline";
    const block = blocks[key];
    if (!block) return <div className="text-center py-8 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
    const extra = (block.extra || {}) as Record<string, Record<string, string>>;

    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("form.sectionTitle")}</Label>
            <Input value={block.title ?? ""} onChange={(e) => updateField(key, "title", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("form.sectionTitleEn")}</Label>
            <Input value={block.titleEn ?? ""} onChange={(e) => updateField(key, "titleEn", e.target.value)} />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("form.sectionSubtitle")}</Label>
            <Input value={block.subtitle ?? ""} onChange={(e) => updateField(key, "subtitle", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("form.sectionSubtitleEn")}</Label>
            <Input value={block.subtitleEn ?? ""} onChange={(e) => updateField(key, "subtitleEn", e.target.value)} />
          </div>
        </div>
        {TIMELINE_ITEMS.map((item) => (
          <div key={item.key} className="border rounded-lg p-4 space-y-4">
            <h4 className="font-semibold text-slate-700">{item.label}</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("form.sectionTitle")}</Label>
                <Input value={extra[item.key]?.title ?? ""} onChange={(e) => updateExtra(key, item.key, "title", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("form.sectionTitleEn")}</Label>
                <Input value={extra[item.key]?.titleEn ?? ""} onChange={(e) => updateExtra(key, item.key, "titleEn", e.target.value)} />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("form.sectionDescription")}</Label>
                <Textarea rows={3} value={extra[item.key]?.description ?? ""} onChange={(e) => updateExtra(key, item.key, "description", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("form.sectionDescriptionEn")}</Label>
                <Textarea rows={3} value={extra[item.key]?.descriptionEn ?? ""} onChange={(e) => updateExtra(key, item.key, "descriptionEn", e.target.value)} />
              </div>
            </div>
          </div>
        ))}
        {renderSaveButton(key)}
      </div>
    );
  }

  function renderTeamForm() {
    const key = "team";
    const block = blocks[key];
    if (!block) return <div className="text-center py-8 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
    const extra = (block.extra || {}) as Record<string, Record<string, string>>;

    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("form.sectionTitle")}</Label>
            <Input value={block.title ?? ""} onChange={(e) => updateField(key, "title", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("form.sectionTitleEn")}</Label>
            <Input value={block.titleEn ?? ""} onChange={(e) => updateField(key, "titleEn", e.target.value)} />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("form.sectionSubtitle")}</Label>
            <Input value={block.subtitle ?? ""} onChange={(e) => updateField(key, "subtitle", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("form.sectionSubtitleEn")}</Label>
            <Input value={block.subtitleEn ?? ""} onChange={(e) => updateField(key, "subtitleEn", e.target.value)} />
          </div>
        </div>
        {TEAM_ITEMS.map((item) => (
          <div key={item.key} className="border rounded-lg p-4 space-y-4">
            <h4 className="font-semibold text-slate-700">{item.label} ({item.key})</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("form.name")}</Label>
                <Input value={extra[item.key]?.name ?? ""} onChange={(e) => updateExtra(key, item.key, "name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("form.nameEn")}</Label>
                <Input value={extra[item.key]?.nameEn ?? ""} onChange={(e) => updateExtra(key, item.key, "nameEn", e.target.value)} />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("form.role")}</Label>
                <Input value={extra[item.key]?.role ?? ""} onChange={(e) => updateExtra(key, item.key, "role", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("form.roleEn")}</Label>
                <Input value={extra[item.key]?.roleEn ?? ""} onChange={(e) => updateExtra(key, item.key, "roleEn", e.target.value)} />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("form.bio")}</Label>
                <Textarea rows={3} value={extra[item.key]?.bio ?? ""} onChange={(e) => updateExtra(key, item.key, "bio", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("form.bioEn")}</Label>
                <Textarea rows={3} value={extra[item.key]?.bioEn ?? ""} onChange={(e) => updateExtra(key, item.key, "bioEn", e.target.value)} />
              </div>
            </div>
          </div>
        ))}
        {renderSaveButton(key)}
      </div>
    );
  }

  function renderContentEditor(key: string) {
    if (key === "highlights") return renderHighlightsForm();
    if (key === "timeline") return renderTimelineForm();
    if (key === "team") return renderTeamForm();
    return renderForm(key);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-slate-500 mt-1">{t("subtitle")}</p>
      </div>

      <Tabs defaultValue="about_us">
        <TabsList>
          {CONTENT_KEYS.map((c) => (
            <TabsTrigger key={c.key} value={c.key}>
              {t(c.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>

        {CONTENT_KEYS.map((c) => (
          <TabsContent key={c.key} value={c.key}>
            <Card>
              <CardHeader>
                <CardTitle>{t(c.labelKey)}</CardTitle>
                <CardDescription>{t("subtitle")}</CardDescription>
              </CardHeader>
              <CardContent>{renderContentEditor(c.key)}</CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
