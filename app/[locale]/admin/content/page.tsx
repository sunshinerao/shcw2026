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
              <CardContent>{renderForm(c.key)}</CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
