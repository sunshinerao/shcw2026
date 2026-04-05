"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { KeyRound, Loader2, Save, Sparkles, Trash2, FileImage, Upload } from "lucide-react";
import { AdminSectionGuard } from "@/components/admin/admin-section-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type SettingsResponse = {
  hasOpenaiApiKey: boolean;
  openaiApiKeyMasked: string | null;
  openaiModel: string;
  aiHighlightsEnabled: boolean;
  autoGenerateHighlightsOnSave: boolean;
  highlightCount: number;
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
    mainContentHtml_zh: "",
    mainContentHtml_en: "",
  });

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

  useEffect(() => {
    void loadSettings();
    void loadTplSettings();
  }, [loadSettings, loadTplSettings]);

  const saveSettings = async () => {
    setIsSaving(true);

    try {
      const payload: Record<string, unknown> = {
        openaiModel: openaiModel.trim() || "gpt-4o-mini",
        aiHighlightsEnabled,
        autoGenerateHighlightsOnSave,
        highlightCount,
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

  const saveTplSettings = async () => {
    setIsTplSaving(true);
    try {
      const res = await fetch("/api/admin/invitation-template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tplForm),
      });
      const result = await res.json();
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
    setTplForm((f) => ({ ...f, [fieldKey]: result.data.url as string }));
  };

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
                                <img
                                  src={currentUrl}
                                  alt=""
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
                                  onClick={() => setTplForm((f) => ({ ...f, [fieldKey]: "" }))}
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

                {/* Main content HTML fields */}
                <div>
                  <p className="mb-1 text-sm font-medium text-slate-700">{t("invitationTemplate.mainContentHtml")}</p>
                  <p className="mb-2 text-xs text-slate-500">{t("invitationTemplate.mainContentHtmlHint")}</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">{t("invitationTemplate.zhLabel")}</label>
                      <Textarea
                        value={tplForm.mainContentHtml_zh}
                        onChange={(e) => setTplForm((f) => ({ ...f, mainContentHtml_zh: e.target.value }))}
                        rows={8}
                        className="font-mono text-xs"
                        disabled={isTplSaving}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">{t("invitationTemplate.enLabel")}</label>
                      <Textarea
                        value={tplForm.mainContentHtml_en}
                        onChange={(e) => setTplForm((f) => ({ ...f, mainContentHtml_en: e.target.value }))}
                        rows={8}
                        className="font-mono text-xs"
                        disabled={isTplSaving}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <LoadingButton onClick={saveTplSettings} loading={isTplSaving} loadingText={locale === "en" ? "Saving..." : "保存中..."}>
                    <Save className="mr-2 h-4 w-4" />
                    {t("invitationTemplate.save")}
                  </LoadingButton>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminSectionGuard>
  );
}
