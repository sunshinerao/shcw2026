"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, Loader2, Search, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { AdminSectionGuard } from "@/components/admin/admin-section-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type SpecialPassRecord = {
  id: string;
  entryType: "DOMESTIC" | "INTERNATIONAL";
  status: "PENDING" | "APPROVED" | "REJECTED";
  name: string;
  country: string;
  email?: string | null;
  phoneArea?: string | null;
  phone?: string | null;
  docType?: string | null;
  docNumber: string;
  organization?: string | null;
  jobTitle?: string | null;
  adminNotes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export default function AdminSpecialPassPage() {
  const t = useTranslations("adminSpecialPassPage");
  const locale = useLocale();
  const [records, setRecords] = useState<SpecialPassRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [isExporting, setIsExporting] = useState(false);

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }
      if (search.trim()) {
        params.set("search", search.trim());
      }

      const response = await fetch(`/api/admin/special-pass?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || t("messages.loadFailed"));
      }

      const items = Array.isArray(payload.data) ? payload.data : [];
      setRecords(items);
      setNotesDraft(
        Object.fromEntries(items.map((item: SpecialPassRecord) => [item.id, item.adminNotes || ""]))
      );
    } catch (error) {
      console.error("Load special pass records failed:", error);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, t]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return records;
    }

    return records.filter((record) => {
      return [
        record.name,
        record.email,
        record.docNumber,
        record.user.name,
        record.user.email,
        record.organization,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [records, search]);

  const statusBadge = (status: string) => {
    if (status === "APPROVED") {
      return <Badge className="bg-emerald-100 text-emerald-700">{t("status.approved")}</Badge>;
    }
    if (status === "REJECTED") {
      return <Badge className="bg-red-100 text-red-700">{t("status.rejected")}</Badge>;
    }
    return <Badge className="bg-amber-100 text-amber-700">{t("status.pending")}</Badge>;
  };

  const updateStatus = async (id: string, status: "APPROVED" | "REJECTED") => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/admin/special-pass/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          status,
          adminNotes: notesDraft[id] || "",
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || t("messages.updateFailed"));
      }

      setRecords((previous) =>
        previous.map((item) => (item.id === id ? payload.data : item))
      );
    } catch (error) {
      console.error("Update special pass status failed:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteApplication = async (id: string) => {
    if (!confirm(locale === "zh" ? "确定要删除这个申请吗？" : "Are you sure you want to delete this application?")) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/special-pass/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || t("messages.deleteFailed"));
      }

      setRecords((previous) => previous.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Delete special pass failed:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const exportExcel = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/admin/special-pass/export?locale=${locale}`);
      if (!response.ok) {
        throw new Error(t("messages.exportFailed"));
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `special-pass-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export special pass failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AdminSectionGuard section="specialPass">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
            <p className="text-slate-600">{t("subtitle")}</p>
          </div>
          <Button onClick={() => void exportExcel()} disabled={isExporting} className="bg-emerald-600 hover:bg-emerald-700">
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? t("actions.exporting") : t("actions.export")}
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-10"
                  placeholder={t("searchPlaceholder")}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("filters.all")}</SelectItem>
                  <SelectItem value="PENDING">{t("status.pending")}</SelectItem>
                  <SelectItem value="APPROVED">{t("status.approved")}</SelectItem>
                  <SelectItem value="REJECTED">{t("status.rejected")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("listTitle", { count: filteredRecords.length })}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-slate-500">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="py-12 text-center text-slate-500">{t("empty")}</div>
            ) : (
              <div className="space-y-4">
                {filteredRecords.map((record) => {
                  const notesValue = notesDraft[record.id] || "";
                  const isBusy = updatingId === record.id;

                  return (
                    <div key={record.id} className="rounded-xl border border-slate-100 p-4">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{record.name}</h3>
                        {statusBadge(record.status)}
                        <Badge className="bg-slate-100 text-slate-700">
                          {record.entryType === "INTERNATIONAL" ? t("entryType.international") : t("entryType.domestic")}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 gap-2 text-sm text-slate-600 md:grid-cols-2">
                        <p>{t("fields.country")}: {record.country}</p>
                        <p>{t("fields.docNumber")}: {record.docNumber}</p>
                        <p>{t("fields.email")}: {record.email || "-"}</p>
                        <p>{t("fields.phone")}: {(record.phoneArea || "") + (record.phone || "") || "-"}</p>
                        <p>{t("fields.organization")}: {record.organization || "-"}</p>
                        <p>{t("fields.applicant")}: {record.user.name} ({record.user.email})</p>
                      </div>

                      <div className="mt-3 space-y-2">
                        <Label>{t("fields.adminNotes")}</Label>
                        <Textarea
                          rows={2}
                          value={notesValue}
                          onChange={(event) =>
                            setNotesDraft((previous) => ({ ...previous, [record.id]: event.target.value }))
                          }
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => void updateStatus(record.id, "APPROVED")}
                          disabled={updatingId === record.id || deletingId === record.id}
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          {t("actions.approve")}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void updateStatus(record.id, "REJECTED")}
                          disabled={updatingId === record.id || deletingId === record.id}
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          {t("actions.reject")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => void deleteApplication(record.id)}
                          disabled={updatingId === record.id || deletingId === record.id}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          {deletingId === record.id ? t("actions.deleting") : t("actions.delete")}
                        </Button>
                        {record.reviewedBy ? (
                          <span className="text-xs text-slate-500">
                            {t("fields.reviewedBy")}: {record.reviewedBy}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminSectionGuard>
  );
}
