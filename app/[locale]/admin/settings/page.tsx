"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { KeyRound, Loader2, Save, Sparkles, Trash2 } from "lucide-react";
import { AdminSectionGuard } from "@/components/admin/admin-section-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

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
                  <Button onClick={saveSettings} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {t("save")}
                  </Button>

                  <Button variant="outline" onClick={loadSettings} disabled={isSaving}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("reload")}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminSectionGuard>
  );
}
