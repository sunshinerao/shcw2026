"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { FileText, Search, Upload, XCircle, CheckCircle, Clock, Download, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdminSectionGuard } from "@/components/admin/admin-section-guard";
import { Button } from "@/components/ui/button";
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
  status: string;
  letterFileUrl?: string | null;
  rejectReason?: string | null;
  createdAt: string;
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
  const [editForm, setEditForm] = useState({
    status: "",
    letterFileUrl: "",
    rejectReason: "",
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
    });
    setIsEditDialogOpen(true);
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
              <div className="space-y-2">
                <Label>{t("editDialog.uploadFile")}</Label>
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
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => void submitEdit()} disabled={isSubmitting}>
                {t("editDialog.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminSectionGuard>
  );
}
