"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { FileText, Search, Upload, XCircle, CheckCircle, Clock, Download, Loader2, Wand2, ExternalLink, Pencil } from "lucide-react";
import { getLocalizedSalutationOptions } from "@/lib/user-form-options";
import { Badge } from "@/components/ui/badge";
import { AdminSectionGuard } from "@/components/admin/admin-section-guard";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  user: { id: string; name: string; email: string; title?: string | null; organization?: { name: string } | null };
  purpose?: string | null;
  notes?: string | null;
  customMainContent?: string | null;
  signaturePresetId?: string | null;
  status: string;
  letterFileUrl?: string | null;
  rejectReason?: string | null;
  createdAt: string;
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

export default function AdminInvitationsPage() {
  const t = useTranslations("adminInvitationsPage");
  const locale = useLocale();
  const [requests, setRequests] = useState<InvitationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Edit dialog state
  const [editingRequest, setEditingRequest] = useState<InvitationRequest | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [signaturePresets, setSignaturePresets] = useState<SignaturePreset[]>([]);
  const [defaultPresetId, setDefaultPresetId] = useState<string>("");
  const [editForm, setEditForm] = useState({
    status: "",
    letterFileUrl: "",
    rejectReason: "",
    signaturePresetId: "",
  });

  // Info edit dialog state
  const [isInfoEditDialogOpen, setIsInfoEditDialogOpen] = useState(false);
  const [isInfoEditSubmitting, setIsInfoEditSubmitting] = useState(false);
  const [events, setEvents] = useState<{ id: string; title: string; titleEn?: string | null }[]>([]);
  const [infoEditForm, setInfoEditForm] = useState({
    salutation: "",
    guestName: "",
    guestTitle: "",
    guestOrg: "",
    guestEmail: "",
    language: "zh",
    signaturePresetId: "",
    eventId: "",
    purpose: "",
    notes: "",
    customMainContent: "",
  });

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "100" });
      if (filterStatus !== "all") params.set("status", filterStatus);
      const res = await fetch(`/api/invitations?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRequests(data.data.requests || []);
      } else {
        throw new Error(data.error || t("loadError"));
      }
    } catch (err) {
      console.error("Load invitations failed:", err);
      setStatusTone("error");
      setStatusMessage(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, t]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

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
    void loadSignaturePresets();
  }, []);

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

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((r) => {
      const haystack = [r.guestName, r.guestEmail, r.guestOrg, r.user.name, r.user.email]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());
      return haystack.some((v) => v.includes(q));
    });
  }, [requests, searchQuery]);

  const openEditDialog = (req: InvitationRequest) => {
    setEditingRequest(req);
    setEditForm({
      status: req.status,
      letterFileUrl: req.letterFileUrl || "",
      rejectReason: req.rejectReason || "",
      signaturePresetId: req.signaturePresetId || "",
    });
    setIsEditDialogOpen(true);
  };

  const openInfoEditDialog = (req: InvitationRequest) => {
    setEditingRequest(req);
    setInfoEditForm({
      salutation: req.salutation || "",
      guestName: req.guestName,
      guestTitle: req.guestTitle || "",
      guestOrg: req.guestOrg || "",
      guestEmail: req.guestEmail || "",
      language: req.language || "zh",
      signaturePresetId: req.signaturePresetId || "",
      eventId: req.eventId || "",
      purpose: req.purpose || "",
      notes: req.notes || "",
      customMainContent: req.customMainContent || "",
    });
    setIsInfoEditDialogOpen(true);
  };

  const submitInfoEdit = async () => {
    if (!editingRequest) return;
    setIsInfoEditSubmitting(true);
    try {
      const res = await fetch(`/api/invitations/${editingRequest.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          salutation: infoEditForm.salutation || null,
          guestName: infoEditForm.guestName,
          guestTitle: infoEditForm.guestTitle || null,
          guestOrg: infoEditForm.guestOrg || null,
          guestEmail: infoEditForm.guestEmail || null,
          language: infoEditForm.language,
          signaturePresetId: infoEditForm.signaturePresetId || null,
          eventId: infoEditForm.eventId || null,
          purpose: infoEditForm.purpose || null,
          notes: infoEditForm.notes || null,
          customMainContent: infoEditForm.customMainContent || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("infoEditDialog.saveFailed"));
      setRequests((prev) =>
        prev.map((r) => (r.id === editingRequest.id ? data.data : r))
      );
      setStatusTone("success");
      setStatusMessage(t("infoEditDialog.saveSuccess"));
      setIsInfoEditDialogOpen(false);
      setEditingRequest(null);
    } catch (err) {
      setStatusTone("error");
      setStatusMessage(err instanceof Error ? err.message : t("infoEditDialog.saveFailed"));
    } finally {
      setIsInfoEditSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingRequest) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("invitationId", editingRequest.id);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("messages.uploadFailed"));
      setEditForm((p) => ({ ...p, letterFileUrl: data.data.url, status: "UPLOADED" }));
      setStatusTone("success");
      setStatusMessage(t("messages.uploadSuccess"));
    } catch (err) {
      setStatusTone("error");
      setStatusMessage(err instanceof Error ? err.message : t("messages.uploadFailed"));
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleGenerateFromTemplate = async () => {
    if (!editingRequest) return;
    setIsGenerating(true);
    try {
      const presetParam = editingRequest.language === "en" && editForm.signaturePresetId
        ? `?presetId=${encodeURIComponent(editForm.signaturePresetId)}`
        : "";
      const renderUrl = `/api/invitations/${editingRequest.id}/render${presetParam}`;
      const res = await fetch(`/api/invitations/${editingRequest.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          status: "UPLOADED",
          letterFileUrl: renderUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("messages.updateFailed"));
      setRequests((prev) =>
        prev.map((r) => (r.id === editingRequest.id ? data.data : r))
      );
      setEditForm((p) => ({ ...p, status: "UPLOADED", letterFileUrl: renderUrl }));
      setStatusTone("success");
      setStatusMessage(t("editDialog.generateSuccess"));
    } catch (err) {
      setStatusTone("error");
      setStatusMessage(err instanceof Error ? err.message : t("messages.updateFailed"));
    } finally {
      setIsGenerating(false);
    }
  };

  const submitEdit = async () => {
    if (!editingRequest) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/invitations/${editingRequest.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          status: editForm.status,
          letterFileUrl: editForm.letterFileUrl || null,
          rejectReason: editForm.rejectReason || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("messages.updateFailed"));

      setRequests((prev) =>
        prev.map((r) => (r.id === editingRequest.id ? data.data : r))
      );
      setStatusTone("success");
      setStatusMessage(data.message || t("messages.updateSuccess"));
      setIsEditDialogOpen(false);
      setEditingRequest(null);
    } catch (err) {
      setStatusTone("error");
      setStatusMessage(err instanceof Error ? err.message : t("messages.updateFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <AdminSectionGuard section="events">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="mb-2 text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-slate-600">{t("subtitle")}</p>
        </motion.div>

        {statusMessage ? (
          <Card className={statusTone === "success" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}>
            <CardContent className="p-4 text-sm font-medium text-slate-700">{statusMessage}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filters.all")}</SelectItem>
                  <SelectItem value="PENDING">{t("status.pending")}</SelectItem>
                  <SelectItem value="UPLOADED">{t("status.uploaded")}</SelectItem>
                  <SelectItem value="DOWNLOADED">{t("status.downloaded")}</SelectItem>
                  <SelectItem value="REJECTED">{t("status.rejected")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("listTitle", { count: filteredRequests.length })}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-slate-500">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
                <p className="mt-2">{t("loading")}</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="py-12 text-center text-slate-500">{t("empty")}</div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((req) => {
                  const cfg = statusConfig[req.status] || statusConfig.PENDING;
                  const StatusIcon = cfg.icon;
                  const eventTitle = req.event
                    ? locale === "en" ? req.event.titleEn || req.event.title : req.event.title
                    : null;

                  return (
                    <div
                      key={req.id}
                      className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 hover:border-emerald-200 hover:shadow-sm transition-all lg:flex-row lg:items-start lg:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-semibold text-slate-900">{req.guestName}</span>
                            {req.guestTitle ? <span className="text-sm text-slate-500">· {req.guestTitle}</span> : null}
                            <Badge className={cfg.color}>
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {getStatusLabel(req.status)}
                            </Badge>
                          </div>
                          <div className="text-sm text-slate-500 space-y-0.5">
                            <p>{t("applicant")}: {req.user.name}{req.user.title ? ` · ${req.user.title}` : ""} ({req.user.email})</p>
                            {req.user.organization?.name ? <p>{t("applicantOrg")}: {req.user.organization.name}</p> : null}
                            {req.guestOrg ? <p>{t("org")}: {req.guestOrg}</p> : null}
                            {req.guestEmail ? <p>{t("email")}: {req.guestEmail}</p> : null}
                            {eventTitle ? <p>{t("event")}: {eventTitle}</p> : null}
                            {req.purpose ? <p>{t("purpose")}: {req.purpose}</p> : null}
                            <p>{t("lang")}: {req.language === "en" ? "English" : "中文"} · {new Date(req.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "zh-CN")}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 lg:shrink-0">
                        <Button size="sm" variant="outline" onClick={() => openInfoEditDialog(req)}>
                          <Pencil className="mr-1 h-4 w-4" />
                          {t("actions.editInfo")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(req)}>
                          {req.status === "PENDING" ? (
                            <>
                              <Upload className="mr-1 h-4 w-4" />
                              {t("actions.process")}
                            </>
                          ) : (
                            t("actions.edit")
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setEditingRequest(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("editDialog.title")}</DialogTitle>
              <DialogDescription>
                {t("editDialog.description", { name: editingRequest?.guestName || "" })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inv-status">{t("editDialog.status")}</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm((p) => ({ ...p, status: v }))}>
                  <SelectTrigger id="inv-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">{t("status.pending")}</SelectItem>
                    <SelectItem value="UPLOADED">{t("status.uploaded")}</SelectItem>
                    <SelectItem value="REJECTED">{t("status.rejected")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Option A: Generate from template */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                <p className="text-sm font-medium text-emerald-800">{t("editDialog.generateSection")}</p>
                <p className="text-xs text-emerald-700">{t("editDialog.generateHint")}</p>
                {editingRequest?.language === "en" && signaturePresets.length > 0 ? (
                  <div className="space-y-1">
                    <Label htmlFor="admin-sig-preset" className="text-xs text-emerald-800">{t("editDialog.signaturePreset")}</Label>
                    <Select
                      value={editForm.signaturePresetId || "default"}
                      onValueChange={(v) => setEditForm((p) => ({ ...p, signaturePresetId: v === "default" ? "" : v }))}
                    >
                      <SelectTrigger id="admin-sig-preset" className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">{t("editDialog.signaturePresetDefault")}</SelectItem>
                        {signaturePresets.map((preset) => (
                          <SelectItem key={preset.id} value={preset.id}>
                            {preset.label}{preset.id === defaultPresetId ? ` (${locale === "en" ? "default" : "默认"})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <div className="flex items-center gap-2 flex-wrap">
                  <LoadingButton
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => void handleGenerateFromTemplate()}
                    loading={isGenerating}
                    loadingText={locale === "en" ? "Generating..." : "生成中..."}
                  >
                    <Wand2 className="mr-1.5 h-4 w-4" />
                    {t("editDialog.generateBtn")}
                  </LoadingButton>
                  {editingRequest ? (
                    <a
                      href={`/api/invitations/${editingRequest.id}/render${editingRequest.language === "en" && editForm.signaturePresetId ? `?presetId=${encodeURIComponent(editForm.signaturePresetId)}` : ""}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-emerald-700 underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {t("editDialog.previewTemplate")}
                    </a>
                  ) : null}
                </div>
              </div>

              {/* Option B: Manual file upload */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">{t("editDialog.uploadSection")}</p>
                <div className="flex items-center gap-2">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    <div className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors text-sm text-slate-600">
                      {isUploading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" />{t("editDialog.uploading")}</>
                      ) : (
                        <><Upload className="h-4 w-4" />{t("editDialog.selectFile")}</>
                      )}
                    </div>
                  </label>
                </div>
                {editForm.letterFileUrl ? (
                  <p className="text-sm text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {t("editDialog.fileUploaded")}
                    <a href={editForm.letterFileUrl} target="_blank" rel="noopener noreferrer" className="underline ml-1">{t("editDialog.preview")}</a>
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-file-url">{t("editDialog.letterFileUrl")}</Label>
                <Input
                  id="inv-file-url"
                  placeholder={t("editDialog.letterFileUrlPlaceholder")}
                  value={editForm.letterFileUrl}
                  onChange={(e) => setEditForm((p) => ({ ...p, letterFileUrl: e.target.value }))}
                />
              </div>
              {editForm.status === "REJECTED" ? (
                <div className="space-y-2">
                  <Label htmlFor="inv-reject-reason">{t("editDialog.rejectReason")}</Label>
                  <Textarea
                    id="inv-reject-reason"
                    rows={2}
                    value={editForm.rejectReason}
                    onChange={(e) => setEditForm((p) => ({ ...p, rejectReason: e.target.value }))}
                  />
                </div>
              ) : null}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>{t("editDialog.cancel")}</Button>
              <LoadingButton className="bg-emerald-600 hover:bg-emerald-700" onClick={() => void submitEdit()} loading={isSubmitting} loadingText={locale === "en" ? "Saving..." : "保存中..."}>
                {t("editDialog.save")}
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Info Edit Dialog */}
        <Dialog open={isInfoEditDialogOpen} onOpenChange={(open) => { setIsInfoEditDialogOpen(open); if (!open) setEditingRequest(null); }}>
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("infoEditDialog.title")}</DialogTitle>
              <DialogDescription>
                {t("infoEditDialog.description", { name: editingRequest?.guestName || "" })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="info-salutation">{t("infoEditDialog.salutation")}</Label>
                <Select value={infoEditForm.salutation || "none"} onValueChange={(v) => setInfoEditForm((p) => ({ ...p, salutation: v === "none" ? "" : v }))}>
                  <SelectTrigger id="info-salutation"><SelectValue placeholder={t("infoEditDialog.salutationPlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("infoEditDialog.salutationPlaceholder")}</SelectItem>
                    {getLocalizedSalutationOptions(locale === "en" ? "en" : "zh").map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="info-guest-name">{t("infoEditDialog.guestName")} *</Label>
                <Input id="info-guest-name" value={infoEditForm.guestName} onChange={(e) => setInfoEditForm((p) => ({ ...p, guestName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="info-guest-title">{t("infoEditDialog.guestTitle")}</Label>
                <Input id="info-guest-title" value={infoEditForm.guestTitle} onChange={(e) => setInfoEditForm((p) => ({ ...p, guestTitle: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="info-guest-org">{t("infoEditDialog.guestOrg")}</Label>
                <Input id="info-guest-org" value={infoEditForm.guestOrg} onChange={(e) => setInfoEditForm((p) => ({ ...p, guestOrg: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="info-guest-email">{t("infoEditDialog.guestEmail")}</Label>
                <Input id="info-guest-email" type="email" value={infoEditForm.guestEmail} onChange={(e) => setInfoEditForm((p) => ({ ...p, guestEmail: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="info-language">{t("infoEditDialog.language")}</Label>
                <Select value={infoEditForm.language} onValueChange={(v) => setInfoEditForm((p) => ({ ...p, language: v, signaturePresetId: "" }))}>
                  <SelectTrigger id="info-language"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {infoEditForm.language === "en" && signaturePresets.length > 0 ? (
                <div className="space-y-2">
                  <Label htmlFor="info-sig-preset">{t("infoEditDialog.signaturePreset")}</Label>
                  <Select
                    value={infoEditForm.signaturePresetId || "default"}
                    onValueChange={(v) => setInfoEditForm((p) => ({ ...p, signaturePresetId: v === "default" ? "" : v }))}
                  >
                    <SelectTrigger id="info-sig-preset"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">{t("infoEditDialog.signaturePresetDefault")}</SelectItem>
                      {signaturePresets.map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          {preset.label}{preset.id === defaultPresetId ? ` (${locale === "en" ? "default" : "默认"})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="info-event">{t("infoEditDialog.event")}</Label>
                <Select value={infoEditForm.eventId || "none"} onValueChange={(v) => setInfoEditForm((p) => ({ ...p, eventId: v === "none" ? "" : v }))}>
                  <SelectTrigger id="info-event"><SelectValue placeholder={t("infoEditDialog.eventPlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("infoEditDialog.eventPlaceholder")}</SelectItem>
                    {events.map((ev) => (
                      <SelectItem key={ev.id} value={ev.id}>
                        {locale === "en" ? ev.titleEn || ev.title : ev.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="info-purpose">{t("infoEditDialog.purpose")}</Label>
                <Textarea id="info-purpose" rows={2} value={infoEditForm.purpose} onChange={(e) => setInfoEditForm((p) => ({ ...p, purpose: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="info-notes">{t("infoEditDialog.notes")}</Label>
                <Textarea id="info-notes" rows={2} value={infoEditForm.notes} onChange={(e) => setInfoEditForm((p) => ({ ...p, notes: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="info-custom-content">{t("infoEditDialog.customMainContent")}</Label>
                <Textarea id="info-custom-content" rows={6} value={infoEditForm.customMainContent} onChange={(e) => setInfoEditForm((p) => ({ ...p, customMainContent: e.target.value }))} />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsInfoEditDialogOpen(false)}>{t("infoEditDialog.cancel")}</Button>
              <LoadingButton
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => void submitInfoEdit()}
                loading={isInfoEditSubmitting}
                loadingText={locale === "en" ? "Saving..." : "保存中..."}
                disabled={!infoEditForm.guestName.trim()}
              >
                {t("infoEditDialog.save")}
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminSectionGuard>
  );
}
