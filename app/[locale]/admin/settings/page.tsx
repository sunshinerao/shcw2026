"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useState } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { KeyRound, Loader2, Newspaper, Pencil, Plus, Save, Sparkles, Trash2, FileImage, Upload, PenLine } from "lucide-react";
import { AdminSectionGuard } from "@/components/admin/admin-section-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  estimateInvitationTemplateVisibleChars,
  getInvitationBodyCharLimit,
} from "@/lib/invitation-content-limits";
import type { SignaturePreset, SignaturePresetType } from "@/lib/invitation-signature-presets";

type SettingsResponse = {
  hasOpenaiApiKey: boolean;
  openaiApiKeyMasked: string | null;
  openaiModel: string;
  aiHighlightsEnabled: boolean;
  autoGenerateHighlightsOnSave: boolean;
  highlightCount: number;
  newsEnabled: boolean;
  speakersEnabled: boolean;
  partnersEnabled: boolean;
};

export default function AdminSettingsPage() {
  const t = useTranslations("adminSettingsPage");
  const locale = useLocale();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");

  const [hasOpenaiApiKey, setHasOpenaiApiKey] = useState(false);
  const [openaiApiKeyMasked, setOpenaiApiKeyMasked] = useState<string | null>(null);
  const [openaiApiKeyInput, setOpenaiApiKeyInput] = useState("");
  const [clearOpenaiApiKey, setClearOpenaiApiKey] = useState(false);

  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini");
  const [aiHighlightsEnabled, setAiHighlightsEnabled] = useState(false);
  const [autoGenerateHighlightsOnSave, setAutoGenerateHighlightsOnSave] = useState(true);
  const [highlightCount, setHighlightCount] = useState(5);
  const [newsEnabled, setNewsEnabled] = useState(true);
  const [speakersEnabled, setSpeakersEnabled] = useState(true);
  const [partnersEnabled, setPartnersEnabled] = useState(true);

  // Invitation template settings
  const [isTplLoading, setIsTplLoading] = useState(true);
  const [isTplSaving, setIsTplSaving] = useState(false);
  const [tplStatusMessage, setTplStatusMessage] = useState("");
  const [tplStatusTone, setTplStatusTone] = useState<"success" | "error">("success");
  const [tplForm, setTplForm] = useState({
    coverImageUrl_zh: "",
    coverImageUrl_en: "",
    bodyBgImageUrl_zh: "",
    bodyBgImageUrl_en: "",
    backBgImageUrl_zh: "",
    backBgImageUrl_en: "",
    secondTitleTemplate_zh: "",
    secondTitleTemplate_en: "",
    bodyContentHtml_zh: "",
    bodyContentHtml_en: "",
    eventInfoLabel_zh: "",
    eventInfoLabel_en: "",
    eventDateTemplate_zh: "",
    eventDateTemplate_en: "",
    eventTimeTemplate_zh: "",
    eventTimeTemplate_en: "",
    eventVenueTemplate_zh: "",
    eventVenueTemplate_en: "",
    closingText_zh: "",
    closingText_en: "",
    greetingText_zh: "",
    greetingText_en: "",
    signatureHtml_zh: "",
    signatureHtml_en: "",
    footerNoteText_zh: "",
    footerNoteText_en: "",
    footerLinkTemplate_zh: "",
    footerLinkTemplate_en: "",
    stampImageUrl_zh: "",
  });

  // ---- Signature Presets ----
  const sigPresetUid = useId();
  const EMPTY_PRESET: SignaturePreset = {
    id: "",
    label: "",
    type: "single",
    singleHtml: "",
    singleImageUrl: "",
    signatoryAHtml: "",
    signatoryAImageUrl: "",
    signatoryBHtml: "",
    signatoryBImageUrl: "",
  };
  const [isSigLoading, setIsSigLoading] = useState(true);
  const [isSigSaving, setIsSigSaving] = useState(false);
  const [sigStatus, setSigStatus] = useState("");
  const [sigStatusTone, setSigStatusTone] = useState<"success" | "error">("success");
  const [sigPresets, setSigPresets] = useState<SignaturePreset[]>([]);
  const [sigDefaultId, setSigDefaultId] = useState<string>("");
  const [sigEditingIndex, setSigEditingIndex] = useState<number | null>(null);
  const [sigEditForm, setSigEditForm] = useState<SignaturePreset>(EMPTY_PRESET);
  const [isAddingPreset, setIsAddingPreset] = useState(false);
  const [sigUploadingField, setSigUploadingField] = useState<string | null>(null);

  const setMessage = (tone: "success" | "error", message: string) => {
    setStatusTone(tone);
    setStatusMessage(message);
  };

  const loadSettings = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/settings", { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || t("messages.loadFailed"));
      }

      const data = payload.data as SettingsResponse;
      setHasOpenaiApiKey(Boolean(data.hasOpenaiApiKey));
      setOpenaiApiKeyMasked(data.openaiApiKeyMasked || null);
      setOpenaiModel(data.openaiModel || "gpt-4o-mini");
      setAiHighlightsEnabled(Boolean(data.aiHighlightsEnabled));
      setAutoGenerateHighlightsOnSave(Boolean(data.autoGenerateHighlightsOnSave));
      setHighlightCount(data.highlightCount || 5);
      setNewsEnabled(data.newsEnabled !== false);
      setSpeakersEnabled(data.speakersEnabled !== false);
      setPartnersEnabled(data.partnersEnabled !== false);
      setStatusMessage("");
    } catch (error) {
      setMessage("error", error instanceof Error ? error.message : t("messages.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  const loadTplSettings = useCallback(async () => {
    setIsTplLoading(true);
    try {
      const res = await fetch("/api/admin/invitation-template", { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error);
      setTplForm(payload.data);
      setTplStatusMessage("");
    } catch (error) {
      setTplStatusTone("error");
      setTplStatusMessage(error instanceof Error ? error.message : t("invitationTemplate.loadFailed"));
    } finally {
      setIsTplLoading(false);
    }
  }, [t]);

  const loadSigPresets = useCallback(async () => {
    setIsSigLoading(true);
    try {
      const res = await fetch("/api/admin/invitation-signature-presets", { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error);
      setSigPresets(payload.data.presets ?? []);
      setSigDefaultId(payload.data.defaultPresetId ?? "");
    } catch {
      // non-fatal: presets section just shows empty
    } finally {
      setIsSigLoading(false);
    }
  }, []);

  const saveSigPresets = async (nextPresets: SignaturePreset[], nextDefaultId: string) => {
    setIsSigSaving(true);
    setSigStatus("");
    try {
      const res = await fetch("/api/admin/invitation-signature-presets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presets: nextPresets, defaultPresetId: nextDefaultId }),
      });
      // Guard against non-JSON responses (e.g. Vercel 413 "Request Entity Too Large")
      const text = await res.text();
      let result: { success: boolean; data?: { presets?: SignaturePreset[]; defaultPresetId?: string }; error?: string };
      try {
        result = JSON.parse(text) as typeof result;
      } catch {
        if (res.status === 413) {
          throw new Error(
            locale === "en"
              ? "Request too large — signature images may contain embedded base64 data. Please re-upload images."
              : "请求数据过大——签名图片可能含有 base64 数据，请使用上传按钮重新上传。"
          );
        }
        throw new Error(`${locale === "en" ? "Server error" : "服务器错误"} (${res.status})`);
      }
      if (!res.ok || !result.success) throw new Error(result.error ?? "Save failed");
      setSigPresets(result.data?.presets ?? []);
      setSigDefaultId(result.data?.defaultPresetId ?? "");
      setSigStatusTone("success");
      setSigStatus(locale === "en" ? "Signature presets saved." : "签名预设已保存。");
    } catch (err) {
      setSigStatusTone("error");
      setSigStatus(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSigSaving(false);
    }
  };

  const uploadSigImage = async (url: string, file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", "invitation_signature");
    const res = await fetch("/api/upload/image", { method: "POST", body: fd });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || "Upload failed");
    return result.data.url as string;
  };

  useEffect(() => {
    void loadSettings();
    void loadTplSettings();
    void loadSigPresets();
  }, [loadSettings, loadTplSettings, loadSigPresets]);

  const saveSettings = async () => {
    setIsSaving(true);

    try {
      const payload: Record<string, unknown> = {
        openaiModel: openaiModel.trim() || "gpt-4o-mini",
        aiHighlightsEnabled,
        autoGenerateHighlightsOnSave,
        highlightCount,
        newsEnabled,
        speakersEnabled,
        partnersEnabled,
      };

      if (clearOpenaiApiKey) {
        payload.openaiApiKey = "";
      } else if (openaiApiKeyInput.trim().length > 0) {
        payload.openaiApiKey = openaiApiKeyInput.trim();
      }

      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || t("messages.saveFailed"));
      }

      const data = result.data as SettingsResponse;
      setHasOpenaiApiKey(Boolean(data.hasOpenaiApiKey));
      setOpenaiApiKeyMasked(data.openaiApiKeyMasked || null);
      setOpenaiApiKeyInput("");
      setClearOpenaiApiKey(false);
      setMessage("success", t("messages.saveSuccess"));
    } catch (error) {
      setMessage("error", error instanceof Error ? error.message : t("messages.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  // Image fields that are saved immediately on upload/removal — NOT included in the text Save.
  const TPL_IMAGE_FIELDS = new Set([
    "coverImageUrl_zh", "coverImageUrl_en",
    "bodyBgImageUrl_zh", "bodyBgImageUrl_en",
    "backBgImageUrl_zh", "backBgImageUrl_en",
    "stampImageUrl_zh",
  ]);

  // Save a single image field immediately to the API (base64 body is ~2MB max, safe under Vercel limit)
  const saveTplImageField = async (fieldKey: string, value: string) => {
    const res = await fetch("/api/admin/invitation-template", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [fieldKey]: value }),
    });
    const text = await res.text();
    let result: { success: boolean; error?: string };
    try { result = JSON.parse(text) as typeof result; } catch {
      throw new Error(`${locale === "en" ? "Server error" : "服务器错误"} (${res.status})`);
    }
    if (!res.ok || !result.success) throw new Error(result.error ?? (locale === "en" ? "Failed to save image" : "图片保存失败"));
  };

  const saveTplSettings = async () => {
    const zhBodyCount = estimateInvitationTemplateVisibleChars(tplForm.bodyContentHtml_zh, "zh");
    const enBodyCount = estimateInvitationTemplateVisibleChars(tplForm.bodyContentHtml_en, "en");
    if (zhBodyCount > getInvitationBodyCharLimit("zh") || enBodyCount > getInvitationBodyCharLimit("en")) {
      setTplStatusTone("error");
      setTplStatusMessage(t("invitationTemplate.bodyLimitExceededSave"));
      return;
    }

    setIsTplSaving(true);
    try {
      // Exclude image fields — they are saved immediately on upload/removal via saveTplImageField.
      // This keeps the body small (text-only, a few KB) and avoids 413 errors.
      const textOnlyForm = Object.fromEntries(
        Object.entries(tplForm).filter(([k]) => !TPL_IMAGE_FIELDS.has(k))
      );

      const res = await fetch("/api/admin/invitation-template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(textOnlyForm),
      });
      // Guard against non-JSON responses (e.g. Vercel 413 "Request Entity Too Large")
      const text = await res.text();
      let result: { success: boolean; data?: unknown; error?: string };
      try {
        result = JSON.parse(text) as typeof result;
      } catch {
        if (res.status === 413) {
          throw new Error(
            locale === "en"
              ? "Request too large — please shorten the template content."
              : "请求数据过大，请缩短模板内容后重试。"
          );
        }
        throw new Error(`${locale === "en" ? "Server error" : "服务器错误"} (${res.status})`);
      }
      if (!res.ok || !result.success) throw new Error(result.error || t("invitationTemplate.saveFailed"));
      setTplStatusTone("success");
      setTplStatusMessage(t("invitationTemplate.saveSuccess"));
    } catch (error) {
      setTplStatusTone("error");
      setTplStatusMessage(error instanceof Error ? error.message : t("invitationTemplate.saveFailed"));
    } finally {
      setIsTplSaving(false);
    }
  };

  const uploadTplImage = async (fieldKey: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", "invitation_template");
    const res = await fetch("/api/upload/image", { method: "POST", body: fd });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || "Upload failed");
    const url = result.data.url as string;
    // Immediately persist this single image field (body ~2MB max — one image only, safe under Vercel 4.5MB limit)
    await saveTplImageField(fieldKey, url);
    setTplForm((f) => ({ ...f, [fieldKey]: url }));
  };

  const localizedTemplateFields = [
    {
      base: "secondTitleTemplate",
      label: t("invitationTemplate.secondTitleTemplate"),
      hint: t("invitationTemplate.secondTitleTemplateHint"),
      rows: 2,
    },
    {
      base: "bodyContentHtml",
      label: t("invitationTemplate.bodyContentHtml"),
      hint: `${t("invitationTemplate.bodyContentHtmlHint")} ${t("invitationTemplate.fieldHint")}`,
      rows: 10,
    },
    {
      base: "eventInfoLabel",
      label: t("invitationTemplate.eventInfoLabel"),
      hint: "",
      rows: 2,
    },
    {
      base: "eventDateTemplate",
      label: t("invitationTemplate.eventDateTemplate"),
      hint: t("invitationTemplate.fieldHint"),
      rows: 2,
    },
    {
      base: "eventTimeTemplate",
      label: t("invitationTemplate.eventTimeTemplate"),
      hint: t("invitationTemplate.fieldHint"),
      rows: 2,
    },
    {
      base: "eventVenueTemplate",
      label: t("invitationTemplate.eventVenueTemplate"),
      hint: t("invitationTemplate.fieldHint"),
      rows: 2,
    },
    {
      base: "closingText",
      label: t("invitationTemplate.closingText"),
      hint: "",
      rows: 2,
    },
    {
      base: "greetingText",
      label: t("invitationTemplate.greetingText"),
      hint: "",
      rows: 2,
    },
    {
      base: "signatureHtml",
      label: t("invitationTemplate.signatureHtml"),
      hint: t("invitationTemplate.signatureHtmlHint"),
      rows: 4,
    },
    {
      base: "footerNoteText",
      label: t("invitationTemplate.footerNoteText"),
      hint: "",
      rows: 2,
    },
    {
      base: "footerLinkTemplate",
      label: t("invitationTemplate.footerLinkTemplate"),
      hint: t("invitationTemplate.fieldHint"),
      rows: 2,
    },
  ] as const;

  const templateBodyMetrics = {
    zh: {
      limit: getInvitationBodyCharLimit("zh"),
      count: estimateInvitationTemplateVisibleChars(tplForm.bodyContentHtml_zh, "zh"),
    },
    en: {
      limit: getInvitationBodyCharLimit("en"),
      count: estimateInvitationTemplateVisibleChars(tplForm.bodyContentHtml_en, "en"),
    },
  };
  const hasTemplateBodyOverflow =
    templateBodyMetrics.zh.count > templateBodyMetrics.zh.limit ||
    templateBodyMetrics.en.count > templateBodyMetrics.en.limit;

  return (
    <AdminSectionGuard section="settings">
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-slate-500 mt-2">{t("subtitle")}</p>
        </motion.div>

        {statusMessage ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              statusTone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {statusMessage}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              {t("ai.title")}
            </CardTitle>
            <CardDescription>{t("ai.description")}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="flex items-center gap-2 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("loading")}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label className="text-base">{t("ai.enabled")}</Label>
                    <p className="text-sm text-slate-500 mt-1">{t("ai.enabledHint")}</p>
                  </div>
                  <Switch checked={aiHighlightsEnabled} onCheckedChange={setAiHighlightsEnabled} />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label className="text-base">{t("ai.autoGenerate")}</Label>
                    <p className="text-sm text-slate-500 mt-1">{t("ai.autoGenerateHint")}</p>
                  </div>
                  <Switch
                    checked={autoGenerateHighlightsOnSave}
                    onCheckedChange={setAutoGenerateHighlightsOnSave}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="openai-model">{t("ai.model")}</Label>
                    <Input
                      id="openai-model"
                      value={openaiModel}
                      onChange={(e) => setOpenaiModel(e.target.value)}
                      placeholder="gpt-4o-mini"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="highlight-count">{t("ai.highlightCount")}</Label>
                    <Input
                      id="highlight-count"
                      type="number"
                      min={3}
                      max={6}
                      value={highlightCount}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        if (Number.isNaN(next)) {
                          return;
                        }
                        setHighlightCount(Math.min(6, Math.max(3, next)));
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openai-api-key" className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4" />
                    {t("ai.apiKey")}
                  </Label>

                  <Input
                    id="openai-api-key"
                    type="password"
                    value={openaiApiKeyInput}
                    onChange={(e) => setOpenaiApiKeyInput(e.target.value)}
                    placeholder={t("ai.apiKeyPlaceholder")}
                    autoComplete="off"
                  />

                  <p className="text-xs text-slate-500">{t("ai.apiKeyHint")}</p>

                  {hasOpenaiApiKey ? (
                    <div className="text-xs text-slate-600 rounded-md bg-slate-50 border px-3 py-2">
                      {t("ai.apiKeyStored", { masked: openaiApiKeyMasked || "****" })}
                    </div>
                  ) : null}

                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={clearOpenaiApiKey}
                      onChange={(e) => setClearOpenaiApiKey(e.target.checked)}
                    />
                    {t("ai.clearApiKey")}
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <LoadingButton onClick={saveSettings} loading={isSaving} loadingText={locale === "en" ? "Saving..." : "保存中..."}>
                    <Save className="mr-2 h-4 w-4" />
                    {t("save")}
                  </LoadingButton>

                  <Button variant="outline" onClick={loadSettings} disabled={isSaving}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("reload")}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Site Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-sky-600" />
              {t("siteFeatures.title")}
            </CardTitle>
            <CardDescription>{t("siteFeatures.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("loading")}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label className="text-base">{t("siteFeatures.newsEnabled")}</Label>
                    <p className="text-sm text-slate-500 mt-1">{t("siteFeatures.newsEnabledHint")}</p>
                  </div>
                  <Switch checked={newsEnabled} onCheckedChange={async (val) => {
                    setNewsEnabled(val);
                    try {
                      await fetch("/api/admin/settings", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ newsEnabled: val }),
                      });
                    } catch {
                      // revert on error
                      setNewsEnabled(!val);
                    }
                  }} />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label className="text-base">{t("siteFeatures.speakersEnabled")}</Label>
                    <p className="text-sm text-slate-500 mt-1">{t("siteFeatures.speakersEnabledHint")}</p>
                  </div>
                  <Switch checked={speakersEnabled} onCheckedChange={async (val) => {
                    setSpeakersEnabled(val);
                    try {
                      await fetch("/api/admin/settings", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ speakersEnabled: val }),
                      });
                    } catch {
                      // revert on error
                      setSpeakersEnabled(!val);
                    }
                  }} />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label className="text-base">{t("siteFeatures.partnersEnabled")}</Label>
                    <p className="text-sm text-slate-500 mt-1">{t("siteFeatures.partnersEnabledHint")}</p>
                  </div>
                  <Switch checked={partnersEnabled} onCheckedChange={async (val) => {
                    setPartnersEnabled(val);
                    try {
                      await fetch("/api/admin/settings", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ partnersEnabled: val }),
                      });
                    } catch {
                      // revert on error
                      setPartnersEnabled(!val);
                    }
                  }} />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Invitation Template Settings */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileImage className="h-5 w-5 text-slate-600" />
              {t("invitationTemplate.title")}
            </CardTitle>
            <CardDescription>{t("invitationTemplate.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {tplStatusMessage && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  tplStatusTone === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {tplStatusMessage}
              </div>
            )}
            {isTplLoading ? (
              <p className="text-sm text-slate-500">{t("invitationTemplate.loading")}</p>
            ) : (
              <>
                {/* Image upload fields */}
                {(
                  [
                    ["coverImageUrl", "invitationTemplate.coverImages"],
                    ["bodyBgImageUrl", "invitationTemplate.bodyBgImages"],
                    ["backBgImageUrl", "invitationTemplate.backBgImages"],
                  ] as [string, string][]
                ).map(([fieldBase, labelKey]) => (
                  <div key={fieldBase}>
                    <p className="mb-2 text-sm font-medium text-slate-700">{t(labelKey)}</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {(["zh", "en"] as const).map((lang) => {
                        const fieldKey = `${fieldBase}_${lang}`;
                        const currentUrl = tplForm[fieldKey as keyof typeof tplForm];
                        return (
                          <div key={lang}>
                            <label className="mb-1 block text-xs text-slate-500">
                              {lang === "zh" ? t("invitationTemplate.zhLabel") : t("invitationTemplate.enLabel")}
                            </label>
                            <div className="flex items-center gap-2">
                              {currentUrl && (
                                <Image
                                  src={currentUrl}
                                  alt=""
                                  width={48}
                                  height={48}
                                  unoptimized
                                  sizes="48px"
                                  className="h-12 w-12 rounded border border-slate-200 object-cover flex-shrink-0"
                                />
                              )}
                              <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                                <Upload className="h-3.5 w-3.5" />
                                {currentUrl ? t("invitationTemplate.reupload") : t("invitationTemplate.upload")}
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp"
                                  className="sr-only"
                                  disabled={isTplSaving}
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    try {
                                      await uploadTplImage(fieldKey, file);
                                    } catch (err) {
                                      setTplStatusTone("error");
                                      setTplStatusMessage(err instanceof Error ? err.message : t("invitationTemplate.uploadFailed"));
                                    }
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                              {currentUrl && (
                                <button
                                  type="button"
                                  className="text-xs text-slate-400 hover:text-rose-500"
                                  onClick={async () => {
                                    try {
                                      await saveTplImageField(fieldKey, "");
                                      setTplForm((f) => ({ ...f, [fieldKey]: "" }));
                                    } catch (err) {
                                      setTplStatusTone("error");
                                      setTplStatusMessage(err instanceof Error ? err.message : t("invitationTemplate.uploadFailed"));
                                    }
                                  }}
                                >
                                  {t("invitationTemplate.remove")}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Stamp image (ZH only) */}
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">{t("invitationTemplate.stampImage")}</p>
                  <p className="mb-2 text-xs text-slate-500">{t("invitationTemplate.stampImageHint")}</p>
                  <div className="flex items-center gap-2">
                    {tplForm.stampImageUrl_zh && (
                      <Image
                        src={tplForm.stampImageUrl_zh}
                        alt=""
                        width={48}
                        height={48}
                        unoptimized
                        sizes="48px"
                        className="h-12 w-12 rounded border border-slate-200 object-contain flex-shrink-0 bg-slate-50"
                      />
                    )}
                    <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                      <Upload className="h-3.5 w-3.5" />
                      {tplForm.stampImageUrl_zh ? t("invitationTemplate.reupload") : t("invitationTemplate.upload")}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        disabled={isTplSaving}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            await uploadTplImage("stampImageUrl_zh", file);
                          } catch (err) {
                            setTplStatusTone("error");
                            setTplStatusMessage(err instanceof Error ? err.message : t("invitationTemplate.uploadFailed"));
                          }
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {tplForm.stampImageUrl_zh && (
                      <button
                        type="button"
                        className="text-xs text-slate-400 hover:text-rose-500"
                        onClick={async () => {
                          try {
                            await saveTplImageField("stampImageUrl_zh", "");
                            setTplForm((f) => ({ ...f, stampImageUrl_zh: "" }));
                          } catch (err) {
                            setTplStatusTone("error");
                            setTplStatusMessage(err instanceof Error ? err.message : t("invitationTemplate.uploadFailed"));
                          }
                        }}
                      >
                        {t("invitationTemplate.remove")}
                      </button>
                    )}
                  </div>
                </div>

                {localizedTemplateFields.map((field) => (
                  <div key={field.base}>
                    <p className="mb-1 text-sm font-medium text-slate-700">{field.label}</p>
                    {field.hint ? (
                      <p className="mb-2 text-xs text-slate-500">{field.hint}</p>
                    ) : null}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {(["zh", "en"] as const).map((lang) => {
                        const fieldKey = `${field.base}_${lang}` as keyof typeof tplForm;
                        const bodyMetric = field.base === "bodyContentHtml" ? templateBodyMetrics[lang] : null;
                        const remaining = bodyMetric ? bodyMetric.limit - bodyMetric.count : 0;
                        return (
                          <div key={`${field.base}_${lang}`}>
                            <label className="mb-1 block text-xs text-slate-500">
                              {lang === "zh" ? t("invitationTemplate.zhLabel") : t("invitationTemplate.enLabel")}
                            </label>
                            <Textarea
                              value={tplForm[fieldKey]}
                              onChange={(e) => setTplForm((f) => ({ ...f, [fieldKey]: e.target.value }))}
                              rows={field.rows}
                              className="font-mono text-xs"
                              disabled={isTplSaving}
                            />
                            {bodyMetric ? (
                              <div className={`mt-1 text-xs ${remaining >= 0 ? "text-slate-500" : "text-rose-600"}`}>
                                <div>{t("invitationTemplate.bodyLimitHint", { count: bodyMetric.limit })}</div>
                                <div>
                                  {remaining >= 0
                                    ? t("invitationTemplate.bodyRemaining", { count: remaining })
                                    : t("invitationTemplate.bodyExceeded", { count: Math.abs(remaining) })}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div>
                  <LoadingButton onClick={saveTplSettings} loading={isTplSaving} loadingText={locale === "en" ? "Saving..." : "保存中..."} disabled={hasTemplateBodyOverflow}>
                    <Save className="mr-2 h-4 w-4" />
                    {t("invitationTemplate.save")}
                  </LoadingButton>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        {/* Signature Presets (EN) */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PenLine className="h-5 w-5 text-slate-600" />
              {locale === "en" ? "EN Signature Presets" : "英文邀请函签名预设"}
            </CardTitle>
            <CardDescription>
              {locale === "en"
                ? "Manage single or dual signatory presets for English invitations."
                : "管理英文邀请函的单签或双签预设。发送邀请函时可指定使用哪个预设。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sigStatus && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  sigStatusTone === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {sigStatus}
              </div>
            )}
            {isSigLoading ? (
              <p className="text-sm text-slate-500">
                <Loader2 className="inline h-4 w-4 animate-spin mr-1" />
                {locale === "en" ? "Loading…" : "加载中…"}
              </p>
            ) : (
              <>
                {/* Preset list */}
                {sigPresets.length === 0 && (
                  <p className="text-sm text-slate-500">
                    {locale === "en" ? "No presets yet." : "暂无签名预设。"}
                  </p>
                )}
                <div className="space-y-2">
                  {sigPresets.map((preset, idx) => (
                    <div
                      key={`${sigPresetUid}-${preset.id}`}
                      className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            preset.type === "dual"
                              ? "bg-violet-100 text-violet-700"
                              : "bg-sky-100 text-sky-700"
                          }`}
                        >
                          {preset.type === "dual"
                            ? locale === "en" ? "Dual" : "双签"
                            : locale === "en" ? "Single" : "单签"}
                        </span>
                        <span className="font-medium truncate">{preset.label}</span>
                        {sigDefaultId === preset.id && (
                          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                            {locale === "en" ? "Default" : "默认"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {sigDefaultId !== preset.id && (
                          <button
                            type="button"
                            className="text-xs text-slate-500 hover:text-emerald-600"
                            disabled={isSigSaving}
                            onClick={() => void saveSigPresets(sigPresets, preset.id)}
                          >
                            {locale === "en" ? "Set default" : "设为默认"}
                          </button>
                        )}
                        <button
                          type="button"
                          className="rounded p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-50"
                          disabled={isSigSaving}
                          onClick={() => {
                            setSigEditingIndex(idx);
                            setSigEditForm({ ...preset });
                            setIsAddingPreset(false);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          disabled={isSigSaving}
                          onClick={() => {
                            const next = sigPresets.filter((_, i) => i !== idx);
                            const nextDefault =
                              sigDefaultId === preset.id
                                ? (next[0]?.id ?? "")
                                : sigDefaultId;
                            setSigPresets(next);
                            setSigDefaultId(nextDefault);
                            setSigEditingIndex(null);
                            void saveSigPresets(next, nextDefault);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Edit / Add form */}
                {(sigEditingIndex !== null || isAddingPreset) && (() => {
                  const isSingle = sigEditForm.type === "single";
                  return (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                      <p className="text-sm font-medium text-slate-700">
                        {isAddingPreset
                          ? locale === "en" ? "New Preset" : "新建预设"
                          : locale === "en" ? "Edit Preset" : "编辑预设"}
                      </p>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">{locale === "en" ? "ID (unique)" : "唯一标识 ID"}</Label>
                          <Input
                            value={sigEditForm.id}
                            disabled={!isAddingPreset}
                            className="text-xs"
                            onChange={(e) => setSigEditForm((f) => ({ ...f, id: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{locale === "en" ? "Label" : "显示名称"}</Label>
                          <Input
                            value={sigEditForm.label}
                            className="text-xs"
                            onChange={(e) => setSigEditForm((f) => ({ ...f, label: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {(["single", "dual"] as SignaturePresetType[]).map((t) => (
                          <label key={t} className="flex items-center gap-1.5 text-sm cursor-pointer">
                            <input
                              type="radio"
                              name={`${sigPresetUid}-type`}
                              checked={sigEditForm.type === t}
                              onChange={() => setSigEditForm((f) => ({ ...f, type: t }))}
                            />
                            {t === "single"
                              ? locale === "en" ? "Single signatory" : "单签"
                              : locale === "en" ? "Dual signatory" : "双签"}
                          </label>
                        ))}
                      </div>

                      {isSingle ? (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs">
                              {locale === "en" ? "Signature image (optional)" : "签名图片（可选）"}
                            </Label>
                            <div className="flex items-center gap-2">
                              {sigEditForm.singleImageUrl && (
                                <Image
                                  src={sigEditForm.singleImageUrl}
                                  alt=""
                                  width={120}
                                  height={40}
                                  unoptimized
                                  sizes="120px"
                                  className="h-10 w-auto rounded border object-contain"
                                />
                              )}
                              <label className={`flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 ${sigUploadingField === "singleImageUrl" ? "opacity-50 pointer-events-none" : ""}`}>
                                {sigUploadingField === "singleImageUrl"
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <Upload className="h-3.5 w-3.5" />}
                                {sigEditForm.singleImageUrl
                                  ? locale === "en" ? "Replace" : "替换"
                                  : locale === "en" ? "Upload" : "上传"}
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp"
                                  className="sr-only"
                                  disabled={sigUploadingField !== null}
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setSigUploadingField("singleImageUrl");
                                    try {
                                      const url = await uploadSigImage(sigEditForm.singleImageUrl ?? "", file);
                                      setSigEditForm((f) => ({ ...f, singleImageUrl: url }));
                                    } catch (err) {
                                      setSigStatusTone("error");
                                      setSigStatus(err instanceof Error ? err.message : "Upload failed");
                                    } finally {
                                      setSigUploadingField(null);
                                    }
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                              {sigEditForm.singleImageUrl && (
                                <button
                                  type="button"
                                  className="text-xs text-slate-400 hover:text-rose-500"
                                  onClick={() => setSigEditForm((f) => ({ ...f, singleImageUrl: "" }))}
                                >
                                  {locale === "en" ? "Remove" : "移除"}
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{locale === "en" ? "Signatory text (HTML)" : "签名人文字（支持 HTML）"}</Label>
                            <Textarea
                              value={sigEditForm.singleHtml ?? ""}
                              rows={3}
                              className="font-mono text-xs"
                              onChange={(e) => setSigEditForm((f) => ({ ...f, singleHtml: e.target.value }))}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                          {/* Signatory B — Left */}
                          <div className="space-y-3">
                            <p className="text-xs font-semibold text-slate-600">
                              {locale === "en" ? "Signatory B (left)" : "签名人 B（左侧）"}
                            </p>
                            <div className="space-y-1">
                              <Label className="text-xs">{locale === "en" ? "Signature image" : "签名图片"}</Label>
                              <div className="flex items-center gap-2">
                                {sigEditForm.signatoryBImageUrl && (
                                  <Image
                                    src={sigEditForm.signatoryBImageUrl}
                                    alt=""
                                    width={120}
                                    height={40}
                                    unoptimized
                                    sizes="120px"
                                    className="h-10 w-auto rounded border object-contain"
                                  />
                                )}
                                <label className={`flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 ${sigUploadingField === "signatoryBImageUrl" ? "opacity-50 pointer-events-none" : ""}`}>
                                  {sigUploadingField === "signatoryBImageUrl"
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <Upload className="h-3.5 w-3.5" />}
                                  {sigEditForm.signatoryBImageUrl
                                    ? locale === "en" ? "Replace" : "替换"
                                    : locale === "en" ? "Upload" : "上传"}
                                  <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="sr-only"
                                    disabled={sigUploadingField !== null}
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      setSigUploadingField("signatoryBImageUrl");
                                      try {
                                        const url = await uploadSigImage(sigEditForm.signatoryBImageUrl ?? "", file);
                                        setSigEditForm((f) => ({ ...f, signatoryBImageUrl: url }));
                                      } catch (err) {
                                        setSigStatusTone("error");
                                        setSigStatus(err instanceof Error ? err.message : "Upload failed");
                                      } finally {
                                        setSigUploadingField(null);
                                      }
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                                {sigEditForm.signatoryBImageUrl && (
                                  <button
                                    type="button"
                                    className="text-xs text-slate-400 hover:text-rose-500"
                                    onClick={() => setSigEditForm((f) => ({ ...f, signatoryBImageUrl: "" }))}
                                  >
                                    {locale === "en" ? "Remove" : "移除"}
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">{locale === "en" ? "Text (HTML)" : "文字（HTML）"}</Label>
                              <Textarea
                                value={sigEditForm.signatoryBHtml ?? ""}
                                rows={3}
                                className="font-mono text-xs"
                                onChange={(e) => setSigEditForm((f) => ({ ...f, signatoryBHtml: e.target.value }))}
                              />
                            </div>
                          </div>
                          {/* Signatory A — Right */}
                          <div className="space-y-3">
                            <p className="text-xs font-semibold text-slate-600">
                              {locale === "en" ? "Signatory A (right)" : "签名人 A（右侧）"}
                            </p>
                            <div className="space-y-1">
                              <Label className="text-xs">{locale === "en" ? "Signature image" : "签名图片"}</Label>
                              <div className="flex items-center gap-2">
                                {sigEditForm.signatoryAImageUrl && (
                                  <Image
                                    src={sigEditForm.signatoryAImageUrl}
                                    alt=""
                                    width={120}
                                    height={40}
                                    unoptimized
                                    sizes="120px"
                                    className="h-10 w-auto rounded border object-contain"
                                  />
                                )}
                                <label className={`flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 ${sigUploadingField === "signatoryAImageUrl" ? "opacity-50 pointer-events-none" : ""}`}>
                                  {sigUploadingField === "signatoryAImageUrl"
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <Upload className="h-3.5 w-3.5" />}
                                  {sigEditForm.signatoryAImageUrl
                                    ? locale === "en" ? "Replace" : "替换"
                                    : locale === "en" ? "Upload" : "上传"}
                                  <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="sr-only"
                                    disabled={sigUploadingField !== null}
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      setSigUploadingField("signatoryAImageUrl");
                                      try {
                                        const url = await uploadSigImage(sigEditForm.signatoryAImageUrl ?? "", file);
                                        setSigEditForm((f) => ({ ...f, signatoryAImageUrl: url }));
                                      } catch (err) {
                                        setSigStatusTone("error");
                                        setSigStatus(err instanceof Error ? err.message : "Upload failed");
                                      } finally {
                                        setSigUploadingField(null);
                                      }
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                                {sigEditForm.signatoryAImageUrl && (
                                  <button
                                    type="button"
                                    className="text-xs text-slate-400 hover:text-rose-500"
                                    onClick={() => setSigEditForm((f) => ({ ...f, signatoryAImageUrl: "" }))}
                                  >
                                    {locale === "en" ? "Remove" : "移除"}
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">{locale === "en" ? "Text (HTML)" : "文字（HTML）"}</Label>
                              <Textarea
                                value={sigEditForm.signatoryAHtml ?? ""}
                                rows={3}
                                className="font-mono text-xs"
                                onChange={(e) => setSigEditForm((f) => ({ ...f, signatoryAHtml: e.target.value }))}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <LoadingButton
                          loading={isSigSaving}
                          loadingText={locale === "en" ? "Saving…" : "保存中…"}
                          onClick={() => {
                            const trimmed = { ...sigEditForm, id: sigEditForm.id.trim(), label: sigEditForm.label.trim() };
                            if (!trimmed.id || !trimmed.label) {
                              setSigStatusTone("error");
                              setSigStatus(locale === "en" ? "ID and label are required." : "ID 和显示名称不能为空。");
                              return;
                            }
                            let next: SignaturePreset[];
                            if (isAddingPreset) {
                              const duplicate = sigPresets.some((p) => p.id === trimmed.id);
                              if (duplicate) {
                                setSigStatusTone("error");
                                setSigStatus(locale === "en" ? "A preset with this ID already exists." : "已存在同名 ID 的预设。");
                                return;
                              }
                              next = [...sigPresets, trimmed];
                            } else {
                              next = sigPresets.map((p, i) => (i === sigEditingIndex ? trimmed : p));
                            }
                            const nextDefault = sigDefaultId || next[0]?.id || "";
                            setSigPresets(next);
                            setSigDefaultId(nextDefault);
                            setSigEditingIndex(null);
                            setIsAddingPreset(false);
                            void saveSigPresets(next, nextDefault);
                          }}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {locale === "en" ? "Save preset" : "保存预设"}
                        </LoadingButton>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSigEditingIndex(null);
                            setIsAddingPreset(false);
                          }}
                        >
                          {locale === "en" ? "Cancel" : "取消"}
                        </Button>
                      </div>
                    </div>
                  );
                })()}

                {/* Add button */}
                {sigEditingIndex === null && !isAddingPreset && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSigEditForm({ ...EMPTY_PRESET });
                      setIsAddingPreset(true);
                      setSigEditingIndex(null);
                    }}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    {locale === "en" ? "Add preset" : "新建预设"}
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminSectionGuard>
  );
}
