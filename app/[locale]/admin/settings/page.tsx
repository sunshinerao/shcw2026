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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { KNOWLEDGE_ASSET_TYPES, getKnowledgeTypePreset, normalizeKnowledgeTypeSettings, type KnowledgeTypeSettingsMap } from "@/lib/knowledge-type-config";
import type { FormalDocumentTemplateConfig, WebpageTemplateConfig } from "@/lib/knowledge-template";
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
  homepageAttendeesEnabled: boolean;
  knowledgeTypeSettings: KnowledgeTypeSettingsMap;
};

type TemplateOption = {
  id: string;
  code?: string | null;
  name: string;
  nameEn?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
  config?: {
    formal?: Partial<FormalDocumentTemplateConfig>;
    webpage?: Partial<WebpageTemplateConfig>;
  } | null;
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
  const [homepageAttendeesEnabled, setHomepageAttendeesEnabled] = useState(false);
  const [formalTemplates, setFormalTemplates] = useState<TemplateOption[]>([]);
  const [webTemplates, setWebTemplates] = useState<TemplateOption[]>([]);
  const [knowledgeTypeSettings, setKnowledgeTypeSettings] = useState<KnowledgeTypeSettingsMap>(
    normalizeKnowledgeTypeSettings(undefined)
  );
  const [isKnowledgeSaving, setIsKnowledgeSaving] = useState(false);
  const [templateSavingId, setTemplateSavingId] = useState<string | null>(null);
  const [isImportingTemplate, setIsImportingTemplate] = useState(false);
  const [figmaHtmlFile, setFigmaHtmlFile] = useState<File | null>(null);
  const [figmaImportForm, setFigmaImportForm] = useState({
    name: "",
    nameEn: "",
    code: "",
    description: "",
    sourceHtml: "",
    sourceFileName: "",
  });

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
      setHomepageAttendeesEnabled(data.homepageAttendeesEnabled === true);
      setKnowledgeTypeSettings(normalizeKnowledgeTypeSettings(data.knowledgeTypeSettings));
      setStatusMessage("");
    } catch (error) {
      setMessage("error", error instanceof Error ? error.message : t("messages.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  const loadKnowledgeTemplates = useCallback(async () => {
    try {
      const response = await fetch("/api/knowledge-templates", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to load knowledge templates");
      }

      setFormalTemplates(payload.data?.formalTemplates || []);
      setWebTemplates(payload.data?.webTemplates || []);
      if (payload.data?.typeSettings) {
        setKnowledgeTypeSettings(normalizeKnowledgeTypeSettings(payload.data.typeSettings));
      }
    } catch {
      setFormalTemplates([]);
      setWebTemplates([]);
    }
  }, []);

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
    void loadKnowledgeTemplates();
    void loadTplSettings();
    void loadSigPresets();
  }, [loadSettings, loadKnowledgeTemplates, loadTplSettings, loadSigPresets]);

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
        homepageAttendeesEnabled,
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

  const updateKnowledgeTypeField = (
    typeKey: (typeof KNOWLEDGE_ASSET_TYPES)[number],
    field:
      | "formalTemplateCode"
      | "webTemplateCode"
      | "formalTemplateCodeStandard"
      | "formalTemplateCodeSimple"
      | "webTemplateCodeStandard"
      | "webTemplateCodeCard"
      | "toneZh"
      | "toneEn"
      | "sectionFocusZh"
      | "sectionFocusEn"
      | "mdSpecTemplate",
    value: string,
  ) => {
    setKnowledgeTypeSettings((prev) => {
      const current = prev[typeKey];
      const next = {
        ...current,
        [field]: value,
      };

      if (field === "formalTemplateCode" || field === "formalTemplateCodeStandard") {
        next.formalTemplateCode = value;
        next.formalTemplateCodeStandard = value;
      }

      if (field === "webTemplateCode" || field === "webTemplateCodeStandard") {
        next.webTemplateCode = value;
        next.webTemplateCodeStandard = value;
      }

      return {
        ...prev,
        [typeKey]: next,
      };
    });
  };

  const saveKnowledgeSettings = async () => {
    setIsKnowledgeSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ knowledgeTypeSettings }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || t("messages.saveFailed"));
      }
      setKnowledgeTypeSettings(normalizeKnowledgeTypeSettings(result.data.knowledgeTypeSettings));
      setMessage("success", t("messages.knowledgeSaveSuccess"));
    } catch (error) {
      setMessage("error", error instanceof Error ? error.message : t("messages.saveFailed"));
    } finally {
      setIsKnowledgeSaving(false);
    }
  };

  const updateFormalTemplateField = (
    templateId: string,
    field: keyof FormalDocumentTemplateConfig,
    value: string | number | boolean,
  ) => {
    setFormalTemplates((prev) =>
      prev.map((item) =>
        item.id === templateId
          ? {
              ...item,
              config: {
                ...(item.config || {}),
                formal: {
                  ...(item.config?.formal || {}),
                  [field]: value,
                },
              },
            }
          : item
      )
    );
  };

  const updateWebTemplateField = (
    templateId: string,
    field: keyof WebpageTemplateConfig,
    value: string | number | boolean,
  ) => {
    setWebTemplates((prev) =>
      prev.map((item) =>
        item.id === templateId
          ? {
              ...item,
              config: {
                ...(item.config || {}),
                webpage: {
                  ...(item.config?.webpage || {}),
                  [field]: value,
                },
              },
            }
          : item
      )
    );
  };

  const saveTemplateConfig = async (template: TemplateOption) => {
    setTemplateSavingId(template.id);
    try {
      const sourceHtml = template.config?.formal?.sourceHtml;
      const response = await fetch(`/api/knowledge-templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: template.config || {},
          sourceHtml: typeof sourceHtml === "string" ? sourceHtml : undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || t("messages.saveFailed"));
      }

      if (result.data?.templateType === "FORMAL_DOCUMENT") {
        setFormalTemplates((prev) => prev.map((item) => (item.id === template.id ? result.data : item)));
      } else {
        setWebTemplates((prev) => prev.map((item) => (item.id === template.id ? result.data : item)));
      }

      const warningCount = Array.isArray(result.validation?.warnings) ? result.validation.warnings.length : 0;
      setMessage(
        "success",
        warningCount > 0
          ? `${t("messages.templateSaveSuccess")} (${warningCount} ${locale === "en" ? "warnings" : "条提醒"})`
          : t("messages.templateSaveSuccess")
      );
    } catch (error) {
      setMessage("error", error instanceof Error ? error.message : t("messages.saveFailed"));
    } finally {
      setTemplateSavingId(null);
    }
  };

  const importFormalTemplateFromHtml = async () => {
    if (!figmaHtmlFile && !figmaImportForm.sourceHtml.trim()) {
      setMessage("error", locale === "en" ? "Please upload or paste the exported Figma HTML first." : "请先上传或粘贴 Figma 导出的 HTML。" );
      return;
    }

    setIsImportingTemplate(true);
    try {
      const defaultName = locale === "en" ? "Imported Figma Formal Template" : "导入的 Figma 正式模板";
      const response = await fetch(
        "/api/knowledge-templates/import-html",
        figmaHtmlFile
          ? {
              method: "POST",
              body: (() => {
                const formData = new FormData();
                formData.append("createTemplate", "true");
                formData.append("name", figmaImportForm.name.trim() || defaultName);
                formData.append("nameEn", figmaImportForm.nameEn.trim() || figmaImportForm.name.trim() || "Imported Figma Formal Template");
                formData.append("code", figmaImportForm.code.trim() || `formal_import_${Date.now()}`);
                formData.append("description", figmaImportForm.description.trim());
                formData.append("file", figmaHtmlFile);
                return formData;
              })(),
            }
          : {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                createTemplate: true,
                name: figmaImportForm.name.trim() || defaultName,
                nameEn: figmaImportForm.nameEn.trim() || figmaImportForm.name.trim() || "Imported Figma Formal Template",
                code: figmaImportForm.code.trim() || `formal_import_${Date.now()}`,
                description: figmaImportForm.description.trim(),
                sourceHtml: figmaImportForm.sourceHtml,
              }),
            }
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || (locale === "en" ? "Failed to import template" : "导入模版失败"));
      }

      await loadKnowledgeTemplates();
      setFigmaHtmlFile(null);
      setFigmaImportForm({ name: "", nameEn: "", code: "", description: "", sourceHtml: "", sourceFileName: "" });
      const warningCount = Array.isArray(result.validation?.warnings) ? result.validation.warnings.length : 0;
      setMessage(
        "success",
        warningCount > 0
          ? (locale === "en" ? `Template imported with ${warningCount} warnings.` : `模版已导入，并返回 ${warningCount} 条提醒。`)
          : (locale === "en" ? "Template imported successfully." : "模版导入成功。")
      );
    } catch (error) {
      setMessage("error", error instanceof Error ? error.message : (locale === "en" ? "Failed to import template" : "导入模版失败"));
    } finally {
      setIsImportingTemplate(false);
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

        <Tabs defaultValue="ai" className="space-y-6">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 rounded-xl bg-slate-100 p-2">
            <TabsTrigger value="ai">{t("tabs.ai")}</TabsTrigger>
            <TabsTrigger value="siteFeatures">{t("tabs.siteFeatures")}</TabsTrigger>
            <TabsTrigger value="knowledge">{t("tabs.knowledge")}</TabsTrigger>
            <TabsTrigger value="invitationTemplate">{t("tabs.invitationTemplate")}</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-6">
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
          </TabsContent>

          <TabsContent value="siteFeatures" className="space-y-6">
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

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label className="text-base">{t("siteFeatures.homepageAttendeesEnabled")}</Label>
                    <p className="text-sm text-slate-500 mt-1">{t("siteFeatures.homepageAttendeesEnabledHint")}</p>
                  </div>
                  <Switch checked={homepageAttendeesEnabled} onCheckedChange={async (val) => {
                    setHomepageAttendeesEnabled(val);
                    try {
                      await fetch("/api/admin/settings", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ homepageAttendeesEnabled: val }),
                      });
                    } catch {
                      setHomepageAttendeesEnabled(!val);
                    }
                  }} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="knowledge" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600" />
              {t("knowledge.title")}
            </CardTitle>
            <CardDescription>{t("knowledge.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("knowledge.loading")}
              </div>
            ) : (
              <>
                <Tabs defaultValue={KNOWLEDGE_ASSET_TYPES[0]} className="space-y-4">
                  <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 rounded-xl bg-slate-100 p-2">
                    {KNOWLEDGE_ASSET_TYPES.map((typeKey) => {
                      const preset = knowledgeTypeSettings[typeKey] || getKnowledgeTypePreset(typeKey);
                      return (
                        <TabsTrigger key={typeKey} value={typeKey}>
                          {locale === "en" ? preset.labelEn : preset.labelZh}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {KNOWLEDGE_ASSET_TYPES.map((typeKey) => {
                    const preset = knowledgeTypeSettings[typeKey] || getKnowledgeTypePreset(typeKey);

                    return (
                      <TabsContent key={typeKey} value={typeKey} className="mt-0">
                        <div className="rounded-xl border border-slate-200 p-4 space-y-4">
                          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                            <div>
                              <h3 className="text-base font-semibold text-slate-900">
                                {locale === "en" ? preset.labelEn : preset.labelZh}
                              </h3>
                              <p className="text-xs text-slate-500">{t("knowledge.typeCode")}: {typeKey}</p>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>{locale === "en" ? "Standard formal template" : "标准正式文档模板"}</Label>
                              <p className="text-xs text-slate-500">{locale === "en" ? "Slot 1 of 4 for this knowledge type." : "该类型 4 个模板槽位中的第 1 个。"}</p>
                              <Select
                                value={preset.formalTemplateCodeStandard}
                                onValueChange={(value) => updateKnowledgeTypeField(typeKey, "formalTemplateCodeStandard", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={locale === "en" ? "Standard formal template" : "标准正式文档模板"} />
                                </SelectTrigger>
                                <SelectContent>
                                  {formalTemplates.map((item) => (
                                    <SelectItem key={item.id} value={item.code || item.id}>
                                      {locale === "en" ? item.nameEn || item.name : item.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>{locale === "en" ? "Simplified formal template" : "简化正式文档模板"}</Label>
                              <p className="text-xs text-slate-500">{locale === "en" ? "Slot 2 of 4 for this knowledge type." : "该类型 4 个模板槽位中的第 2 个。"}</p>
                              <Select
                                value={preset.formalTemplateCodeSimple}
                                onValueChange={(value) => updateKnowledgeTypeField(typeKey, "formalTemplateCodeSimple", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={locale === "en" ? "Simplified formal template" : "简化正式文档模板"} />
                                </SelectTrigger>
                                <SelectContent>
                                  {formalTemplates.map((item) => (
                                    <SelectItem key={item.id} value={item.code || item.id}>
                                      {locale === "en" ? item.nameEn || item.name : item.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>{locale === "en" ? "Standard webpage template" : "标准网页展示模板"}</Label>
                              <p className="text-xs text-slate-500">{locale === "en" ? "Slot 3 of 4 for this knowledge type." : "该类型 4 个模板槽位中的第 3 个。"}</p>
                              <Select
                                value={preset.webTemplateCodeStandard}
                                onValueChange={(value) => updateKnowledgeTypeField(typeKey, "webTemplateCodeStandard", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={locale === "en" ? "Standard webpage template" : "标准网页展示模板"} />
                                </SelectTrigger>
                                <SelectContent>
                                  {webTemplates.map((item) => (
                                    <SelectItem key={item.id} value={item.code || item.id}>
                                      {locale === "en" ? item.nameEn || item.name : item.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>{locale === "en" ? "Card webpage template" : "卡片式网页模板"}</Label>
                              <p className="text-xs text-slate-500">{locale === "en" ? "Slot 4 of 4 for this knowledge type." : "该类型 4 个模板槽位中的第 4 个。"}</p>
                              <Select
                                value={preset.webTemplateCodeCard}
                                onValueChange={(value) => updateKnowledgeTypeField(typeKey, "webTemplateCodeCard", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={locale === "en" ? "Card webpage template" : "卡片式网页模板"} />
                                </SelectTrigger>
                                <SelectContent>
                                  {webTemplates.map((item) => (
                                    <SelectItem key={item.id} value={item.code || item.id}>
                                      {locale === "en" ? item.nameEn || item.name : item.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>{t("knowledge.toneZh")}</Label>
                              <Textarea
                                rows={2}
                                value={preset.toneZh}
                                onChange={(e) => updateKnowledgeTypeField(typeKey, "toneZh", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t("knowledge.toneEn")}</Label>
                              <Textarea
                                rows={2}
                                value={preset.toneEn}
                                onChange={(e) => updateKnowledgeTypeField(typeKey, "toneEn", e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>{t("knowledge.sectionFocusZh")}</Label>
                              <Textarea
                                rows={2}
                                value={preset.sectionFocusZh}
                                onChange={(e) => updateKnowledgeTypeField(typeKey, "sectionFocusZh", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t("knowledge.sectionFocusEn")}</Label>
                              <Textarea
                                rows={2}
                                value={preset.sectionFocusEn}
                                onChange={(e) => updateKnowledgeTypeField(typeKey, "sectionFocusEn", e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>{t("knowledge.mdSpecTemplate")}</Label>
                            <p className="text-xs text-slate-500">{t("knowledge.mdSpecTemplateHint")}</p>
                            <Textarea
                              rows={18}
                              className="font-mono text-xs"
                              value={preset.mdSpecTemplate || ""}
                              onChange={(e) => updateKnowledgeTypeField(typeKey, "mdSpecTemplate", e.target.value)}
                            />
                          </div>
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>

                <div className="space-y-6 border-t border-slate-200 pt-6">
                  <div>
                    <LoadingButton onClick={saveKnowledgeSettings} loading={isKnowledgeSaving} loadingText={locale === "en" ? "Saving..." : "保存中..."}>
                      <Save className="mr-2 h-4 w-4" />
                      {t("knowledge.save")}
                    </LoadingButton>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{t("knowledge.templateLibraryTitle")}</h3>
                      <p className="text-sm text-slate-500">{t("knowledge.templateLibraryDescription")}</p>
                    </div>

                    <div className="rounded-xl border border-dashed border-violet-300 bg-violet-50/60 p-4 space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">
                          {locale === "en" ? "Import Figma HTML as a formal template" : "导入 Figma HTML 生成正式模板"}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {locale === "en"
                            ? "Paste the HTML exported from Figma. The system will preserve its visual style but still enforce TOC pagination, chapter breaks, continuation pages, and page-number backfill."
                            : "粘贴 Figma 导出的 HTML 后，系统会保留视觉风格，但仍强制执行目录分页、章节分页、续页拆分和目录页码回填。"}
                        </p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>{locale === "en" ? "Template name" : "模板名称"}</Label>
                          <Input
                            value={figmaImportForm.name}
                            onChange={(e) => setFigmaImportForm((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder={locale === "en" ? "Imported Figma Formal Template" : "导入的 Figma 正式模板"}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{locale === "en" ? "Template code" : "模板编码"}</Label>
                          <Input
                            value={figmaImportForm.code}
                            onChange={(e) => setFigmaImportForm((prev) => ({ ...prev, code: e.target.value }))}
                            placeholder="formal_import_custom"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>{locale === "en" ? "Description" : "描述"}</Label>
                        <Input
                          value={figmaImportForm.description}
                          onChange={(e) => setFigmaImportForm((prev) => ({ ...prev, description: e.target.value }))}
                          placeholder={locale === "en" ? "Optional description for the imported template" : "可选：填写该模板的用途说明"}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>{locale === "en" ? "HTML file upload" : "HTML 文件上传"}</Label>
                        <Input
                          type="file"
                          accept=".html,.htm,text/html"
                          onChange={async (e) => {
                            const file = e.target.files?.[0] || null;
                            setFigmaHtmlFile(file);
                            if (!file) {
                              setFigmaImportForm((prev) => ({ ...prev, sourceFileName: "" }));
                              return;
                            }
                            const text = await file.text();
                            setFigmaImportForm((prev) => ({
                              ...prev,
                              sourceHtml: text,
                              sourceFileName: file.name,
                              code: prev.code || file.name.replace(/\.(html?|HTML?)$/, "").replace(/[^a-zA-Z0-9_-]+/g, "_").toLowerCase(),
                            }));
                          }}
                        />
                        {figmaImportForm.sourceFileName ? (
                          <p className="text-xs text-emerald-700">
                            {locale === "en" ? `Loaded file: ${figmaImportForm.sourceFileName}` : `已载入文件：${figmaImportForm.sourceFileName}`}
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <Label>{locale === "en" ? "Figma exported HTML" : "Figma 导出的 HTML 源码"}</Label>
                        <Textarea
                          rows={10}
                          className="font-mono text-xs"
                          value={figmaImportForm.sourceHtml}
                          onChange={(e) => {
                            setFigmaHtmlFile(null);
                            setFigmaImportForm((prev) => ({ ...prev, sourceHtml: e.target.value, sourceFileName: prev.sourceFileName || "" }));
                          }}
                          placeholder={locale === "en" ? "Upload an HTML file or paste the exported HTML here..." : "可上传 HTML 文件，或将导出的 HTML 粘贴到这里..."}
                        />
                      </div>

                      <LoadingButton onClick={importFormalTemplateFromHtml} loading={isImportingTemplate} loadingText={locale === "en" ? "Importing..." : "导入中..."}>
                        <Upload className="mr-2 h-4 w-4" />
                        {locale === "en" ? "Import as formal template" : "导入为正式模板"}
                      </LoadingButton>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-xl border border-slate-200 p-4 space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">{t("knowledge.formalTemplateLibrary")}</h4>
                          <p className="text-xs text-slate-500">{t("knowledge.formalTemplateHint")}</p>
                        </div>
                        <div className="space-y-4">
                          {formalTemplates.map((item) => {
                            const formal = (item.config?.formal || {}) as Partial<FormalDocumentTemplateConfig>;
                            return (
                              <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
                                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                  <div>
                                    <h5 className="font-medium text-slate-900">{locale === "en" ? item.nameEn || item.name : item.name}</h5>
                                    <p className="text-xs text-slate-500">{item.code || item.id}</p>
                                  </div>
                                  {item.isDefault ? (
                                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                      {locale === "en" ? "Built-in default" : "内置默认模版"}
                                    </span>
                                  ) : null}
                                </div>

                                <div className="grid gap-4 md:grid-cols-4">
                                  <div className="space-y-2">
                                    <Label>{t("knowledge.renderMode")}</Label>
                                    <Select
                                      value={formal.renderMode || "classic"}
                                      onValueChange={(value) => updateFormalTemplateField(item.id, "renderMode", value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder={t("knowledge.renderMode")} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="classic">Classic</SelectItem>
                                        <SelectItem value="figma_whitepaper">Figma White Paper</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t("knowledge.styleTemplate")}</Label>
                                    <Select
                                      value={formal.styleTemplate || "professional"}
                                      onValueChange={(value) => updateFormalTemplateField(item.id, "styleTemplate", value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder={t("knowledge.styleTemplate")} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="default">Default</SelectItem>
                                        <SelectItem value="professional">Professional</SelectItem>
                                        <SelectItem value="minimal">Minimal</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t("knowledge.colorScheme")}</Label>
                                    <Select
                                      value={formal.colorScheme || "blue"}
                                      onValueChange={(value) => updateFormalTemplateField(item.id, "colorScheme", value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder={t("knowledge.colorScheme")} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="blue">Blue</SelectItem>
                                        <SelectItem value="green">Green</SelectItem>
                                        <SelectItem value="gray">Gray</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t("knowledge.fontSize")}</Label>
                                    <Input
                                      type="number"
                                      min={8}
                                      max={18}
                                      value={String(formal.fontSize ?? 11)}
                                      onChange={(e) => updateFormalTemplateField(item.id, "fontSize", Number(e.target.value || 11))}
                                    />
                                  </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-4">
                                  <div className="space-y-2">
                                    <Label>{t("knowledge.accentColor")}</Label>
                                    <Input
                                      value={formal.accentColor || "#f6645a"}
                                      onChange={(e) => updateFormalTemplateField(item.id, "accentColor", e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t("knowledge.tocItemsPerPage")}</Label>
                                    <Input
                                      type="number"
                                      min={4}
                                      max={12}
                                      value={String(formal.tocItemsPerPage ?? 6)}
                                      onChange={(e) => updateFormalTemplateField(item.id, "tocItemsPerPage", Number(e.target.value || 6))}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t("knowledge.chapterFirstPageChars")}</Label>
                                    <Input
                                      type="number"
                                      min={800}
                                      max={4000}
                                      step="100"
                                      value={String(formal.chapterFirstPageChars ?? 1600)}
                                      onChange={(e) => updateFormalTemplateField(item.id, "chapterFirstPageChars", Number(e.target.value || 1600))}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t("knowledge.chapterBodyPageChars")}</Label>
                                    <Input
                                      type="number"
                                      min={1000}
                                      max={5000}
                                      step="100"
                                      value={String(formal.chapterBodyPageChars ?? 2300)}
                                      onChange={(e) => updateFormalTemplateField(item.id, "chapterBodyPageChars", Number(e.target.value || 2300))}
                                    />
                                  </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label>{t("knowledge.headerText")}</Label>
                                    <Input
                                      value={formal.headerText || ""}
                                      onChange={(e) => updateFormalTemplateField(item.id, "headerText", e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t("knowledge.footerText")}</Label>
                                    <Input
                                      value={formal.footerText || ""}
                                      onChange={(e) => updateFormalTemplateField(item.id, "footerText", e.target.value)}
                                    />
                                  </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label>{locale === "en" ? "Imported Figma HTML source" : "导入的 Figma HTML 源码"}</Label>
                                    <Textarea
                                      rows={8}
                                      className="font-mono text-xs"
                                      value={formal.sourceHtml || ""}
                                      onChange={(e) => updateFormalTemplateField(item.id, "sourceHtml", e.target.value)}
                                      placeholder={locale === "en" ? "Optional: paste original Figma HTML for this template" : "可选：为该模板粘贴原始 Figma HTML"}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{locale === "en" ? "Custom CSS override" : "自定义 CSS 覆盖"}</Label>
                                    <Textarea
                                      rows={8}
                                      className="font-mono text-xs"
                                      value={formal.customCss || ""}
                                      onChange={(e) => updateFormalTemplateField(item.id, "customCss", e.target.value)}
                                      placeholder={locale === "en" ? "Optional: refine the imported visual skin with CSS" : "可选：使用 CSS 对导入样式做进一步微调"}
                                    />
                                    <p className="text-xs text-slate-500">
                                      {locale === "en"
                                        ? `Template contract: ${formal.templateContractVersion || "shcw-formal-v1"}`
                                        : `模板契约：${formal.templateContractVersion || "shcw-formal-v1"}`}
                                    </p>
                                  </div>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                  <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
                                    <Label>{t("knowledge.includeCover")}</Label>
                                    <Switch checked={formal.includeCover ?? true} onCheckedChange={(value) => updateFormalTemplateField(item.id, "includeCover", value)} />
                                  </div>
                                  <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
                                    <Label>{t("knowledge.includeToc")}</Label>
                                    <Switch checked={formal.includeTableOfContents ?? true} onCheckedChange={(value) => updateFormalTemplateField(item.id, "includeTableOfContents", value)} />
                                  </div>
                                  <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
                                    <Label>{t("knowledge.includeHeaders")}</Label>
                                    <Switch checked={formal.includeHeaders ?? true} onCheckedChange={(value) => updateFormalTemplateField(item.id, "includeHeaders", value)} />
                                  </div>
                                  <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
                                    <Label>{t("knowledge.includeFooters")}</Label>
                                    <Switch checked={formal.includeFooters ?? true} onCheckedChange={(value) => updateFormalTemplateField(item.id, "includeFooters", value)} />
                                  </div>
                                  <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
                                    <Label>{t("knowledge.includeReferences")}</Label>
                                    <Switch checked={formal.includeReferences ?? true} onCheckedChange={(value) => updateFormalTemplateField(item.id, "includeReferences", value)} />
                                  </div>
                                  <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
                                    <Label>{t("knowledge.includeChapters")}</Label>
                                    <Switch checked={formal.includeChapters ?? true} onCheckedChange={(value) => updateFormalTemplateField(item.id, "includeChapters", value)} />
                                  </div>
                                </div>

                                <LoadingButton
                                  onClick={() => saveTemplateConfig(item)}
                                  loading={templateSavingId === item.id}
                                  loadingText={locale === "en" ? "Saving..." : "保存中..."}
                                >
                                  <Save className="mr-2 h-4 w-4" />
                                  {t("knowledge.saveTemplate")}
                                </LoadingButton>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 p-4 space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">{t("knowledge.webTemplateLibrary")}</h4>
                          <p className="text-xs text-slate-500">{t("knowledge.webTemplateHint")}</p>
                        </div>
                        <div className="space-y-4">
                          {webTemplates.map((item) => {
                            const web = (item.config?.webpage || {}) as Partial<WebpageTemplateConfig>;
                            return (
                              <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
                                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                  <div>
                                    <h5 className="font-medium text-slate-900">{locale === "en" ? item.nameEn || item.name : item.name}</h5>
                                    <p className="text-xs text-slate-500">{item.code || item.id}</p>
                                  </div>
                                  {item.isDefault ? (
                                    <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">
                                      {locale === "en" ? "Built-in default" : "内置默认模版"}
                                    </span>
                                  ) : null}
                                </div>

                                <div className="grid gap-4 md:grid-cols-4">
                                  <div className="space-y-2">
                                    <Label>{t("knowledge.layout")}</Label>
                                    <Select
                                      value={web.layout || "standard"}
                                      onValueChange={(value) => updateWebTemplateField(item.id, "layout", value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder={t("knowledge.layout")} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="standard">Standard</SelectItem>
                                        <SelectItem value="minimal">Minimal</SelectItem>
                                        <SelectItem value="detailed">Detailed</SelectItem>
                                        <SelectItem value="card-based">Card Based</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t("knowledge.accentColor")}</Label>
                                    <Input
                                      value={web.accentColor || "#0d9488"}
                                      onChange={(e) => updateWebTemplateField(item.id, "accentColor", e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t("knowledge.maxContentWidth")}</Label>
                                    <Input
                                      type="number"
                                      min={640}
                                      max={1600}
                                      value={String(web.maxContentWidth ?? 900)}
                                      onChange={(e) => updateWebTemplateField(item.id, "maxContentWidth", Number(e.target.value || 900))}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t("knowledge.lineHeight")}</Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      max={2.4}
                                      step="0.1"
                                      value={String(web.lineHeight ?? 1.6)}
                                      onChange={(e) => updateWebTemplateField(item.id, "lineHeight", Number(e.target.value || 1.6))}
                                    />
                                  </div>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                  <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
                                    <Label>{t("knowledge.showToc")}</Label>
                                    <Switch checked={web.showTableOfContents ?? true} onCheckedChange={(value) => updateWebTemplateField(item.id, "showTableOfContents", value)} />
                                  </div>
                                  <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
                                    <Label>{t("knowledge.showKeyPoints")}</Label>
                                    <Switch checked={web.showKeyPoints ?? true} onCheckedChange={(value) => updateWebTemplateField(item.id, "showKeyPoints", value)} />
                                  </div>
                                  <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
                                    <Label>{t("knowledge.showRecommendations")}</Label>
                                    <Switch checked={web.showRecommendations ?? true} onCheckedChange={(value) => updateWebTemplateField(item.id, "showRecommendations", value)} />
                                  </div>
                                  <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
                                    <Label>{t("knowledge.showReferences")}</Label>
                                    <Switch checked={web.showReferences ?? true} onCheckedChange={(value) => updateWebTemplateField(item.id, "showReferences", value)} />
                                  </div>
                                  <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
                                    <Label>{t("knowledge.showMetadata")}</Label>
                                    <Switch checked={web.showMetadata ?? true} onCheckedChange={(value) => updateWebTemplateField(item.id, "showMetadata", value)} />
                                  </div>
                                  <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
                                    <Label>{t("knowledge.showDownloadLink")}</Label>
                                    <Switch checked={web.showDownloadLink ?? true} onCheckedChange={(value) => updateWebTemplateField(item.id, "showDownloadLink", value)} />
                                  </div>
                                  <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
                                    <Label>{t("knowledge.enablePdfExport")}</Label>
                                    <Switch checked={web.enablePdfExport ?? true} onCheckedChange={(value) => updateWebTemplateField(item.id, "enablePdfExport", value)} />
                                  </div>
                                  <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
                                    <Label>{t("knowledge.enableDocxExport")}</Label>
                                    <Switch checked={web.enableDocxExport ?? true} onCheckedChange={(value) => updateWebTemplateField(item.id, "enableDocxExport", value)} />
                                  </div>
                                  <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
                                    <Label>{t("knowledge.enablePrint")}</Label>
                                    <Switch checked={web.enablePrint ?? true} onCheckedChange={(value) => updateWebTemplateField(item.id, "enablePrint", value)} />
                                  </div>
                                </div>

                                <LoadingButton
                                  onClick={() => saveTemplateConfig(item)}
                                  loading={templateSavingId === item.id}
                                  loadingText={locale === "en" ? "Saving..." : "保存中..."}
                                >
                                  <Save className="mr-2 h-4 w-4" />
                                  {t("knowledge.saveTemplate")}
                                </LoadingButton>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="invitationTemplate" className="space-y-6">
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
          </TabsContent>
        </Tabs>
      </div>
    </AdminSectionGuard>
  );
}
