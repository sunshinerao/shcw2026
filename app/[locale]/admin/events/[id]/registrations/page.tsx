"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  MapPin,
  Search,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminSectionGuard } from "@/components/admin/admin-section-guard";
import { Link } from "@/i18n/routing";

type RegistrationUser = {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: string;
  climatePassportId?: string | null;
};

type Registration = {
  id: string;
  userId: string;
  eventId: string;
  status: string;
  notes?: string | null;
  createdAt: string;
  checkedInAt?: string | null;
  pointsEarned: number;
  user: RegistrationUser;
};

type EventInfo = {
  id: string;
  title: string;
  titleEn?: string | null;
  maxAttendees?: number | null;
  requireApproval: boolean;
};

const statusColors: Record<string, string> = {
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  REGISTERED: "bg-emerald-100 text-emerald-700",
  ATTENDED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-slate-100 text-slate-600",
  REJECTED: "bg-red-100 text-red-700",
  WAITLIST: "bg-purple-100 text-purple-700",
};

export default function EventRegistrationsPage({
  params,
}: {
  params: { id: string };
}) {
  const t = useTranslations("adminEventsPage.registrations");
  const locale = useLocale();
  const eventId = params.id;

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [approvedCount, setApprovedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const setMessage = (tone: "success" | "error", msg: string) => {
    setStatusTone(tone);
    setStatusMessage(msg);
  };

  const loadData = useCallback(async () => {
    try {
      const statusParam = filterStatus !== "all" ? `&status=${filterStatus}` : "";
      const res = await fetch(`/api/events/${eventId}/registrations?locale=${locale}${statusParam}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setEvent(data.data.event);
        setRegistrations(data.data.registrations);
        setApprovedCount(data.data.approvedCount);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [eventId, locale, filterStatus]);

  useEffect(() => {
    setIsLoading(true);
    setSelectedIds(new Set());
    void loadData();
  }, [loadData]);

  const getStatusLabel = (status: string) => {
    try {
      return t(`statuses.${status}`);
    } catch {
      return status;
    }
  };

  const filteredRegistrations = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return registrations;
    return registrations.filter((r) => {
      return (
        r.user.name.toLowerCase().includes(query) ||
        r.user.email.toLowerCase().includes(query) ||
        (r.user.climatePassportId?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [registrations, searchQuery]);

  const pendingRegistrations = useMemo(() => {
    return filteredRegistrations.filter((r) => r.status === "PENDING_APPROVAL");
  }, [filteredRegistrations]);

  const isAllSelected = pendingRegistrations.length > 0 && pendingRegistrations.every((r) => selectedIds.has(r.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingRegistrations.map((r) => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const submitAction = async (action: "approve" | "reject") => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/registrations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationIds: ids, action, locale }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("actionFailed"));
      }

      setMessage("success", `${data.message} (${data.count})`);
      const updatedStatus = action === "approve" ? "REGISTERED" : "REJECTED";
      const idSet = new Set(ids);
      setRegistrations((prev) =>
        prev.map((r) => idSet.has(r.id) ? { ...r, status: updatedStatus } : r)
      );
      setSelectedIds(new Set());
    } catch (error) {
      setMessage("error", error instanceof Error ? error.message : t("actionFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const eventTitle = event
    ? locale === "en" && event.titleEn
      ? event.titleEn
      : event.title
    : "";

  const capacityText = event?.maxAttendees
    ? `${approvedCount} / ${event.maxAttendees}`
    : `${approvedCount}`;

  return (
    <AdminSectionGuard section="events">
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/admin/events">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("backToList")}
            </Button>
          </Link>

          {event && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                {eventTitle}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center">
                  <Users className="mr-1 h-4 w-4" />
                  {t("approved")}: {capacityText}
                </span>
                {event.requireApproval && (
                  <Badge className="bg-amber-100 text-amber-700">
                    {t("approvalRequired")}
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {t("title")}
              </h2>
              <p className="text-sm text-slate-600">{t("subtitle")}</p>
            </div>
          </div>
        </motion.div>

        {/* Status message */}
        {statusMessage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card
              className={
                statusTone === "success"
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-red-200 bg-red-50"
              }
            >
              <CardContent className="p-4 text-sm font-medium text-slate-700">
                {statusMessage}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Filters & Batch Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("searchPlaceholder")}
                      className="pl-9"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("filterAll")}</SelectItem>
                      <SelectItem value="PENDING_APPROVAL">{t("statuses.PENDING_APPROVAL")}</SelectItem>
                      <SelectItem value="REGISTERED">{t("statuses.REGISTERED")}</SelectItem>
                      <SelectItem value="ATTENDED">{t("statuses.ATTENDED")}</SelectItem>
                      <SelectItem value="CANCELLED">{t("statuses.CANCELLED")}</SelectItem>
                      <SelectItem value="REJECTED">{t("statuses.REJECTED")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">
                      {t("selected", { count: selectedIds.size })}
                    </span>
                    <LoadingButton
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => void submitAction("approve")}
                      loading={isSubmitting}
                      loadingText={locale === "en" ? "Approving..." : "审批中..."}
                    >
                      <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                      {t("approve")}
                    </LoadingButton>
                    <LoadingButton
                      size="sm"
                      variant="destructive"
                      onClick={() => void submitAction("reject")}
                      loading={isSubmitting}
                      loadingText={locale === "en" ? "Rejecting..." : "处理中..."}
                    >
                      <XCircle className="mr-1.5 h-3.5 w-3.5" />
                      {t("reject")}
                    </LoadingButton>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Registration List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>
                {t("title")} ({filteredRegistrations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-12 text-center text-slate-500">
                  {locale === "zh" ? "加载中..." : "Loading..."}
                </div>
              ) : filteredRegistrations.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  {t("empty")}
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Table header */}
                  {pendingRegistrations.length > 0 && (
                    <div className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-slate-500 border-b border-slate-100">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label={t("selectAll")}
                      />
                      <span className="flex-1">{t("selectAll")}</span>
                    </div>
                  )}

                  {filteredRegistrations.map((reg) => (
                    <div
                      key={reg.id}
                      className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-all hover:bg-slate-50 ${
                        selectedIds.has(reg.id) ? "bg-emerald-50" : ""
                      }`}
                    >
                      {reg.status === "PENDING_APPROVAL" && (
                        <Checkbox
                          checked={selectedIds.has(reg.id)}
                          onCheckedChange={() => toggleSelect(reg.id)}
                          aria-label={`Select ${reg.user.name}`}
                        />
                      )}
                      {reg.status !== "PENDING_APPROVAL" && (
                        <div className="w-4" />
                      )}

                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={reg.user.avatar || undefined} />
                        <AvatarFallback className="text-xs">
                          {reg.user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 truncate">
                            {reg.user.name}
                          </span>
                          <Badge
                            className={
                              statusColors[reg.status] ||
                              "bg-slate-100 text-slate-600"
                            }
                          >
                            {getStatusLabel(reg.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span>{reg.user.email}</span>
                          <span>
                            {new Date(reg.createdAt).toLocaleDateString(
                              locale === "en" ? "en-US" : "zh-CN",
                              { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                            )}
                          </span>
                          {reg.user.climatePassportId && (
                            <span className="font-mono text-[10px]">
                              {reg.user.climatePassportId}
                            </span>
                          )}
                        </div>
                      </div>

                      {reg.checkedInAt && (
                        <div className="flex items-center gap-1 text-xs text-emerald-600">
                          <Check className="h-3.5 w-3.5" />
                          <span>+{reg.pointsEarned}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AdminSectionGuard>
  );
}
