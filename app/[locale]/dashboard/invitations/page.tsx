"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { motion } from "framer-motion";
import { FileText, Plus, Download, Clock, CheckCircle, XCircle, Loader2, User, Pencil, Eye, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countInvitationBodyChars, getInvitationRequestBodyCharLimit } from "@/lib/invitation-content-limits";
import { invitationHtmlToPlainText } from "@/lib/invitation-template";
import { getLocalizedSalutationLabel, getLocalizedSalutationOptions } from "@/lib/user-form-options";

type InvitationRequest = {
  id: string;
  salutation?: string | null;
  guestName: string;
  guestTitle?: string | null;
  guestOrg?: string | null;
  guestEmail?: string | null;
  language: string;
  eventId?: string | null;
  event?: { id: string; title: string; titleEn?: string | null; startDate: string } | null;
  user?: { id: string; name: string; email: string; title?: string | null; organization?: { name: string } | null } | null;
  purpose?: string | null;
  notes?: string | null;
  customMainContent?: string | null;
  signaturePresetId?: string | null;
  useStamp?: boolean;
  status: string;
  letterFileUrl?: string | null;
  rejectReason?: string | null;
  createdAt: string;
};

type PublicEvent = {
  id: string;
  title: string;
  titleEn?: string | null;
};

type SignaturePreset = {
  id: string;
  label: string;
  type: "single" | "dual";
};

const statusConfig: Record<string, { icon: typeof Clock; color: string }> = {
  PENDING: { icon: Clock, color: "bg-amber-100 text-amber-700" },
  UPLOADED: { icon: CheckCircle, color: "bg-emerald-100 text-emerald-700" },
  DOWNLOADED: { icon: Download, color: "bg-blue-100 text-blue-700" },
  REJECTED: { icon: XCircle, color: "bg-red-100 text-red-700" },
};

export default function DashboardInvitationsPage() {
  const t = useTranslations("dashboardInvitations");
  const locale = useLocale();
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const [requests, setRequests] = useState<InvitationRequest[]>([]);
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [signaturePresets, setSignaturePresets] = useState<SignaturePreset[]>([]);
  const [defaultPresetId, setDefaultPresetId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Two-step flow: form → preview → submit
  const [step, setStep] = useState<"form" | "preview">("form");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewError, setPreviewError] = useState<string>("");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [bodyDraftText, setBodyDraftText] = useState("");
  const [bodyDraftHtml, setBodyDraftHtml] = useState("");
  const [bodyDraftSource, setBodyDraftSource] = useState<"event" | "global" | null>(null);
  const [bodyDraftError, setBodyDraftError] = useState("");
  const [isDraftLoading, setIsDraftLoading] = useState(false);
  const [isBodyDirty, setIsBodyDirty] = useState(false);
  // Drives programmatic updates to the contenteditable editor
  const [bodyEditorHtml, setBodyEditorHtml] = useState("");
  const bodyEditorRef = useRef<HTMLDivElement>(null);
  const salutationOptions = getLocalizedSalutationOptions(locale === "en" ? "en" : "zh");

  const [form, setForm] = useState({
    salutation: "",
    guestName: "",
    guestTitle: "",
    guestOrg: "",
    guestEmail: "",
    language: "zh",
    eventId: "",
    purpose: "",
    notes: "",
    customMainContent: "",
    signaturePresetId: "",
    useStamp: false,
  });

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [authStatus, router]);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/invitations?pageSize=100");
      const data = await res.json();
      if (data.success) {
        setRequests(data.data.requests || []);
      }
    } catch (err) {
      console.error("Load invitations failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === "authenticated") {
      void loadRequests();
    }
  }, [authStatus, loadRequests]);

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch(`/api/events?published=true&locale=${locale}&pageSize=100`);
        const data = await res.json();
        if (data.success) {
          setEvents(data.data.events || []);
        }
      } catch (err) {
        console.error("Load events failed:", err);
      }
    }
    void loadEvents();
  }, [locale]);

  useEffect(() => {
    async function loadSignaturePresets() {
      try {
        const res = await fetch("/api/invitations/signature-presets");
        const data = await res.json();
        if (data.success) {
          setSignaturePresets(data.data.presets || []);
          setDefaultPresetId(data.data.defaultPresetId || "");
        }
      } catch (err) {
        console.error("Load signature presets failed:", err);
      }
    }
    if (authStatus === "authenticated") {
      void loadSignaturePresets();
    }
  }, [authStatus]);

  const resetForm = () => {
    setForm({
      salutation: "",
      guestName: "",
      guestTitle: "",
      guestOrg: "",
      guestEmail: session?.user?.email || "",
      language: "zh",
      eventId: "",
      purpose: "",
      notes: "",
      customMainContent: "",
      signaturePresetId: "",
      useStamp: false,
    });
    setBodyDraftText("");
    setBodyDraftHtml("");
    setBodyDraftSource(null);
    setBodyDraftError("");
    setIsBodyDirty(false);
    setBodyEditorHtml("");
    setEditingId(null);
    setStep("form");
    setPreviewHtml("");
    setPreviewError("");
  };

  const generateBodyDraft = useCallback(async (forceReplace = false) => {
    if (!isDialogOpen || step !== "form") {
      return;
    }

    if (!forceReplace && isBodyDirty) {
      return;
    }

    setIsDraftLoading(true);
    setBodyDraftError("");
    try {
      const res = await fetch("/api/invitations/body-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salutation: form.salutation || null,
          guestName: form.guestName,
          guestTitle: form.guestTitle || null,
          guestOrg: form.guestOrg || null,
          language: form.language,
          eventId: form.eventId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || t("form.draftFailed"));
      }

      const newDraftHtml = data.data?.draftHtml || "";
      setBodyDraftText(data.data?.draftText || "");
      setBodyDraftHtml(newDraftHtml);
      setBodyDraftSource((data.data?.source as "event" | "global" | undefined) || null);
      if (forceReplace) {
        setIsBodyDirty(false);
        setBodyEditorHtml(newDraftHtml);
        setForm((previous) => ({ ...previous, customMainContent: "" }));
      } else if (!isBodyDirty) {
        setBodyEditorHtml(newDraftHtml);
      }
    } catch (err) {
      setBodyDraftError(err instanceof Error ? err.message : t("form.draftFailed"));
    } finally {
      setIsDraftLoading(false);
    }
  }, [form.eventId, form.guestName, form.guestOrg, form.guestTitle, form.language, form.salutation, isBodyDirty, isDialogOpen, step, t]);

  useEffect(() => {
    if (!isDialogOpen || step !== "form" || isBodyDirty) {
      return;
    }

    const timer = setTimeout(() => {
      void generateBodyDraft();
    }, 300);

    return () => clearTimeout(timer);
  }, [form.eventId, form.guestName, form.guestOrg, form.guestTitle, form.language, form.salutation, generateBodyDraft, isBodyDirty, isDialogOpen, step]);

  // Sync bodyEditorHtml state → contenteditable DOM.
  // Depends on `step` so that when the user returns from the preview step to the
  // form step the contenteditable div is remounted with empty innerHTML — the
  // effect must fire again to restore the saved HTML even if bodyEditorHtml itself
  // did not change.
  useEffect(() => {
    if (step !== "form") return;
    if (bodyEditorRef.current && bodyEditorRef.current.innerHTML !== bodyEditorHtml) {
      bodyEditorRef.current.innerHTML = bodyEditorHtml;
    }
  }, [bodyEditorHtml, step]);

  const effectiveCustomMainContent = isBodyDirty ? form.customMainContent : null;
  // Strip HTML before counting chars (handles both HTML and plain-text content)
  const charCountPlainText = isBodyDirty
    ? invitationHtmlToPlainText(form.customMainContent)
    : bodyDraftText;
  const bodyCharLimit = getInvitationRequestBodyCharLimit(
    form.language === "en" ? "en" : "zh",
    form.guestName,
    form.guestTitle
  );
  const bodyCharCount = countInvitationBodyChars(charCountPlainText);
  const bodyCharRemaining = bodyCharLimit - bodyCharCount;
  const isBodyOverLimit = bodyCharRemaining < 0;

  const handlePreview = async () => {
    if (!form.guestName.trim()) {
      setPreviewError(t("form.guestNameRequired"));
      return;
    }
    if (isBodyOverLimit) {
      setPreviewError(t("form.bodyExceeded", { count: Math.abs(bodyCharRemaining) }));
      return;
    }
    setPreviewError("");
    setIsPreviewing(true);
    try {
      const res = await fetch("/api/invitations/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salutation: form.salutation || null,
          guestName: form.guestName,
          guestTitle: form.guestTitle || null,
          guestOrg: form.guestOrg || null,
          language: form.language,
          eventId: form.eventId || null,
          customMainContent: effectiveCustomMainContent || null,
          signaturePresetId: form.language === "en" && form.signaturePresetId ? form.signaturePresetId : null,
          useStamp: form.language === "zh" ? form.useStamp : false,
        }),
      });
      if (!res.ok) {
        throw new Error(t("preview.error"));
      }
      const html = await res.text();
      setPreviewHtml(html);
      setStep("preview");
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : t("preview.error"));
    } finally {
      setIsPreviewing(false);
    }
  };

  const submitRequest = async () => {
    if (!form.guestName.trim()) {
      setStatusTone("error");
      setStatusMessage(t("form.guestNameRequired"));
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        locale,
        salutation: form.salutation || null,
        guestName: form.guestName,
        guestTitle: form.guestTitle || null,
        guestOrg: form.guestOrg || null,
        guestEmail: form.guestEmail || null,
        language: form.language,
        eventId: form.eventId || null,
        purpose: form.purpose || null,
        notes: form.notes || null,
        customMainContent: effectiveCustomMainContent || null,
        signaturePresetId: form.language === "en" && form.signaturePresetId ? form.signaturePresetId : null,
        useStamp: form.language === "zh" ? form.useStamp : false,
      };

      const isEditing = !!editingId;
      const url = isEditing ? `/api/invitations/${editingId}` : "/api/invitations";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t(isEditing ? "messages.editFailed" : "messages.createFailed"));

      if (isEditing) {
        setRequests((prev) => prev.map((r) => (r.id === editingId ? data.data : r)));
      } else {
        setRequests((prev) => [data.data, ...prev]);
      }
      setStatusTone("success");
      setStatusMessage(data.message || t(isEditing ? "messages.editSuccess" : "messages.createSuccess"));
      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      setStatusTone("error");
      setStatusMessage(err instanceof Error ? err.message : t("messages.createFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (req: InvitationRequest) => {
    setEditingId(req.id);
    setForm({
      salutation: req.salutation || "",
      guestName: req.guestName,
      guestTitle: req.guestTitle || "",
      guestOrg: req.guestOrg || "",
      guestEmail: req.guestEmail || "",
      language: req.language,
      eventId: req.eventId || "",
      purpose: req.purpose || "",
      notes: req.notes || "",
      customMainContent: req.customMainContent || "",
      signaturePresetId: req.signaturePresetId || "",
      useStamp: req.useStamp ?? false,
    });
    setIsBodyDirty(Boolean(req.customMainContent));
    setBodyEditorHtml(req.customMainContent || "");
    setBodyDraftText("");
    setBodyDraftHtml("");
    setBodyDraftSource(null);
    setBodyDraftError("");
    setStep("form");
    setPreviewHtml("");
    setPreviewError("");
    setIsDialogOpen(true);
  };

  const markDownloaded = async (id: string) => {
    try {
      const res = await fetch(`/api/invitations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, status: "DOWNLOADED" }),
      });
      const data = await res.json();
      if (data.success) {
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: "DOWNLOADED" } : r))
        );
      }
    } catch (err) {
      console.error("Mark downloaded failed:", err);
    }
  };

  if (authStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[360px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (authStatus !== "authenticated") return null;

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: t("status.pending"),
      UPLOADED: t("status.uploaded"),
      DOWNLOADED: t("status.downloaded"),
      REJECTED: t("status.rejected"),
    };
    return labels[status] || status;
  };

  return (
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
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { resetForm(); setIsDialogOpen(true); }}>
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
        <CardHeader>
          <CardTitle>{t("listTitle", { count: requests.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-slate-500">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
              <p className="mt-2">{t("loading")}</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="py-12 text-center text-slate-500">{t("empty")}</div>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => {
                const cfg = statusConfig[req.status] || statusConfig.PENDING;
                const StatusIcon = cfg.icon;
                const eventTitle = req.event
                  ? locale === "en" ? req.event.titleEn || req.event.title : req.event.title
                  : null;

                return (
                  <div
                    key={req.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 hover:border-emerald-200 hover:shadow-sm transition-all lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900">{req.salutation ? `${getLocalizedSalutationLabel(req.salutation, locale === "en" ? "en" : "zh")} ` : ""}{req.guestName}</span>
                          {req.guestTitle ? <span className="text-sm text-slate-500">{req.guestTitle}</span> : null}
                          <Badge className={cfg.color}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {getStatusLabel(req.status)}
                          </Badge>
                        </div>
                        <div className="text-sm text-slate-500 space-y-0.5">
                          {req.guestOrg ? <p>{req.guestOrg}</p> : null}
                          {eventTitle ? <p>{t("forEvent")}: {eventTitle}</p> : null}
                          <p>{t("language")}: {req.language === "en" ? "English" : "中文"}</p>
                          <p>{new Date(req.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "zh-CN")}</p>
                        </div>
                        {req.status === "REJECTED" && req.rejectReason ? (
                          <p className="mt-1 text-sm text-red-600">{t("rejectReason")}: {req.rejectReason}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {(req.status === "PENDING" || req.status === "REJECTED") ? (
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(req)}>
                          <Pencil className="mr-1 h-4 w-4" />
                          {t("edit")}
                        </Button>
                      ) : null}
                      {(req.status === "UPLOADED" || req.status === "DOWNLOADED") && req.letterFileUrl ? (
                        <a
                          href={req.letterFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => { if (req.status === "UPLOADED") void markDownloaded(req.id); }}
                        >
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                            <Download className="mr-1 h-4 w-4" />
                            {t("download")}
                          </Button>
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Request Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className={`max-h-[90vh] overflow-y-auto transition-all ${step === "preview" ? "max-w-3xl" : "max-w-lg"}`}>
          {step === "form" ? (
            <>
              <DialogHeader>
                <DialogTitle>{editingId ? t("form.editTitle") : t("form.title")}</DialogTitle>
                <DialogDescription>{editingId ? t("form.editDescription") : t("form.description")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Applicant info (auto-filled from session) */}
                {session?.user ? (
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-medium text-slate-700">{t("form.applicantInfo")}</span>
                    </div>
                    <p className="text-sm text-slate-600">{t("form.applicantName")}: {session.user.name}</p>
                    <p className="text-sm text-slate-600">{t("form.applicantEmail")}: {session.user.email}</p>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="salutation">{t("form.salutation")}</Label>
                  <Select value={form.salutation || "none"} onValueChange={(v) => setForm((p) => ({ ...p, salutation: v === "none" ? "" : v }))}>
                    <SelectTrigger id="salutation"><SelectValue placeholder={t("form.salutationPlaceholder")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("form.salutationPlaceholder")}</SelectItem>
                      {salutationOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guest-name">{t("form.guestName")} *</Label>
                  <Input id="guest-name" value={form.guestName} onChange={(e) => setForm((p) => ({ ...p, guestName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guest-title">{t("form.guestTitle")}</Label>
                  <Input id="guest-title" value={form.guestTitle} onChange={(e) => setForm((p) => ({ ...p, guestTitle: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guest-org">{t("form.guestOrg")}</Label>
                  <Input id="guest-org" value={form.guestOrg} onChange={(e) => setForm((p) => ({ ...p, guestOrg: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guest-email">{t("form.guestEmail")}</Label>
                  <Input id="guest-email" type="email" value={form.guestEmail} onChange={(e) => setForm((p) => ({ ...p, guestEmail: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inv-language">{t("form.language")}</Label>
                  <Select value={form.language} onValueChange={(v) => setForm((p) => ({ ...p, language: v, signaturePresetId: "" }))}>
                    <SelectTrigger id="inv-language"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh">中文</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.language === "en" && signaturePresets.length > 0 ? (
                  <div className="space-y-2">
                    <Label htmlFor="inv-sig-preset">{t("form.signaturePreset")}</Label>
                    <Select
                      value={form.signaturePresetId || "default"}
                      onValueChange={(v) => setForm((p) => ({ ...p, signaturePresetId: v === "default" ? "" : v }))}
                    >
                      <SelectTrigger id="inv-sig-preset"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">{t("form.signaturePresetDefault")}</SelectItem>
                        {signaturePresets.map((preset) => (
                          <SelectItem key={preset.id} value={preset.id}>
                            {preset.label}{preset.id === defaultPresetId ? ` (${locale === "en" ? "default" : "默认"})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                {form.language === "zh" ? (
                  <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                    <div>
                      <Label className="text-sm font-medium">{t("form.useStamp")}</Label>
                      <p className="text-xs text-slate-500 mt-0.5">{t("form.useStampHint")}</p>
                    </div>
                    <Switch
                      checked={form.useStamp}
                      onCheckedChange={(v) => setForm((p) => ({ ...p, useStamp: v }))}
                    />
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="inv-event">{t("form.event")}</Label>
                  <Select value={form.eventId || "none"} onValueChange={(v) => setForm((p) => ({ ...p, eventId: v === "none" ? "" : v }))}>
                    <SelectTrigger id="inv-event"><SelectValue placeholder={t("form.eventPlaceholder")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("form.eventPlaceholder")}</SelectItem>
                      {events.map((ev) => (
                        <SelectItem key={ev.id} value={ev.id}>
                          {locale === "en" ? ev.titleEn || ev.title : ev.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inv-purpose">{t("form.purpose")}</Label>
                  <Textarea id="inv-purpose" rows={2} value={form.purpose} onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inv-notes">{t("form.notes")}</Label>
                  <Textarea id="inv-notes" rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inv-custom-content">{t("form.customMainContent")}</Label>
                  <p className="text-xs text-slate-500">{t("form.customMainContentHint")}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {isDraftLoading ? <span>{t("form.draftLoading")}</span> : null}
                    {!isDraftLoading && !isBodyDirty && bodyDraftSource === "event" ? <span>{t("form.draftSourceEvent")}</span> : null}
                    {!isDraftLoading && !isBodyDirty && bodyDraftSource === "global" ? <span>{t("form.draftSourceGlobal")}</span> : null}
                    <span>{t("form.bodyLimitHint", { count: bodyCharLimit })}</span>
                    <span>{t("form.draftLength", { count: bodyCharCount })}</span>
                    <span className="text-slate-400">{locale === "en" ? "(Rich text — formatting is preserved)" : "（富文本格式，支持加粗/换行）"}</span>
                    <span className={bodyCharRemaining >= 0 ? "text-slate-500" : "text-rose-600"}>
                      {bodyCharRemaining >= 0
                        ? t("form.bodyRemaining", { count: bodyCharRemaining })
                        : t("form.bodyExceeded", { count: Math.abs(bodyCharRemaining) })}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => void generateBodyDraft(true)}>
                      {isBodyDirty ? t("form.draftRestore") : t("form.draftRefresh")}
                    </Button>
                  </div>
                  <div
                    ref={bodyEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={() => {
                      if (!bodyEditorRef.current) return;
                      const html = bodyEditorRef.current.innerHTML;
                      setIsBodyDirty(true);
                      setForm((p) => ({ ...p, customMainContent: html }));
                    }}
                    className="min-h-[200px] max-h-[400px] overflow-y-auto w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&_p]:mb-2 [&_strong]:font-semibold [&_em]:italic"
                  />
                  {bodyDraftError ? <p className="text-xs text-rose-600">{bodyDraftError}</p> : null}
                </div>
                {previewError ? (
                  <p className="text-sm text-red-600">{previewError}</p>
                ) : null}
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t("form.cancel")}</Button>
                <LoadingButton
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => void handlePreview()}
                  loading={isPreviewing}
                  disabled={isBodyOverLimit}
                  loadingText={locale === "en" ? "Generating..." : "生成预览中..."}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {t("form.preview")}
                </LoadingButton>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t("preview.title")}</DialogTitle>
                <DialogDescription>{t("preview.description")}</DialogDescription>
              </DialogHeader>
              <div className="mt-2">
                <iframe
                  srcDoc={previewHtml}
                  className="w-full rounded-lg border border-slate-200"
                  style={{ height: "60vh", minHeight: "480px" }}
                  title="Invitation preview"
                  sandbox="allow-same-origin"
                />
              </div>
              <DialogFooter className="mt-4 flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={() => setStep("form")} className="w-full sm:w-auto">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t("preview.backToEdit")}
                </Button>
                <LoadingButton
                  className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
                  onClick={() => void submitRequest()}
                  loading={isSubmitting}
                  loadingText={locale === "en" ? "Submitting..." : "提交中..."}
                >
                  {t("preview.confirmSubmit")}
                </LoadingButton>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
