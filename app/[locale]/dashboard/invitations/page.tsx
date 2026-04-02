"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { motion } from "framer-motion";
import { FileText, Plus, Download, Clock, CheckCircle, XCircle, Loader2, User, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");
  const [editingId, setEditingId] = useState<string | null>(null);

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
    });
    setEditingId(null);
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
    });
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
                          <span className="font-semibold text-slate-900">{req.salutation ? `${req.salutation} ` : ""}{req.guestName}</span>
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

      {/* Create Request Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
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
                  <SelectItem value="Dr.">Dr.</SelectItem>
                  <SelectItem value="PhD">PhD</SelectItem>
                  <SelectItem value="Mr.">Mr.</SelectItem>
                  <SelectItem value="Ms.">Ms.</SelectItem>
                  <SelectItem value="Mrs.">Mrs.</SelectItem>
                  <SelectItem value="Prof.">Prof.</SelectItem>
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
              <Select value={form.language} onValueChange={(v) => setForm((p) => ({ ...p, language: v }))}>
                <SelectTrigger id="inv-language"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh">中文</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t("form.cancel")}</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => void submitRequest()} disabled={isSubmitting}>
              {editingId ? t("form.saveChanges") : t("form.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
