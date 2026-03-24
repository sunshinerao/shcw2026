"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { AdminSectionGuard } from "@/components/admin/admin-section-guard";

type MessageStatus = "PENDING" | "REPLIED" | "CLOSED";

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  organization?: string | null;
  category: string;
  subject: string;
  message: string;
  metadata?: Record<string, string> | null;
  status: MessageStatus;
  adminReply?: string | null;
  adminNotes?: string | null;
  repliedAt?: string | null;
  repliedBy?: string | null;
  createdAt: string;
};

const ITEMS_PER_PAGE = 15;

const statusColors: Record<MessageStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  REPLIED: "bg-green-100 text-green-700",
  CLOSED: "bg-slate-100 text-slate-600",
};

const statusIcons: Record<MessageStatus, typeof Clock> = {
  PENDING: Clock,
  REPLIED: CheckCircle,
  CLOSED: XCircle,
};

export default function AdminMessagesPage() {
  const t = useTranslations("adminMessagesPage");
  const locale = useLocale();

  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<MessageStatus | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewMessage, setViewMessage] = useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [notesText, setNotesText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: ITEMS_PER_PAGE.toString(),
      });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (categoryFilter !== "ALL") params.set("category", categoryFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/contact/admin?${params}`, {
        headers: { "Accept-Language": locale },
      });
      const json = await res.json();
      if (json.success) {
        setMessages(json.data);
        setTotalPages(json.pagination.totalPages);
        setTotal(json.pagination.total);
      }
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter, categoryFilter, searchQuery, locale]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, categoryFilter, searchQuery]);

  function openDetail(msg: ContactMessage) {
    setViewMessage(msg);
    setReplyText(msg.adminReply || "");
    setNotesText(msg.adminNotes || "");
  }

  async function handleReply() {
    if (!viewMessage || !replyText.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/contact/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        body: JSON.stringify({
          id: viewMessage.id,
          adminReply: replyText.trim(),
          adminNotes: notesText.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(locale === "zh" ? "回复已发送" : "Reply sent");
        setViewMessage(null);
        fetchMessages();
      }
    } catch {
      toast.error("Failed to send reply");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(id: string, newStatus: MessageStatus) {
    try {
      const res = await fetch("/api/contact/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(locale === "zh" ? "状态已更新" : "Status updated");
        if (viewMessage?.id === id) setViewMessage(null);
        fetchMessages();
      }
    } catch {
      toast.error("Failed to update status");
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const categoryKeys = [
    "GENERAL", "ORGANIZATION", "PARTNERSHIP", "SPEAKER", "MEDIA", "SPONSOR", "VOLUNTEER", "OTHER",
  ];

  return (
    <AdminSectionGuard section="messages">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-slate-500">{t("subtitle")}</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder={locale === "zh" ? "搜索姓名、邮箱或主题..." : "Search name, email, subject..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as MessageStatus | "ALL")}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("filters.all")}</SelectItem>
                  <SelectItem value="PENDING">{t("filters.pending")}</SelectItem>
                  <SelectItem value="REPLIED">{t("filters.replied")}</SelectItem>
                  <SelectItem value="CLOSED">{t("filters.closed")}</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={categoryFilter}
                onValueChange={(v) => setCategoryFilter(v)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("filters.all")}</SelectItem>
                  {categoryKeys.map((key) => (
                    <SelectItem key={key} value={key}>
                      {t(`categoryLabels.${key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline" className="text-sm">
                {total} {locale === "zh" ? "条消息" : "messages"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-emerald-600" />
              {t("title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
              </div>
            ) : messages.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-400">{t("empty")}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.name")}</TableHead>
                    <TableHead>{t("table.email")}</TableHead>
                    <TableHead>{t("table.category")}</TableHead>
                    <TableHead>{t("table.subject")}</TableHead>
                    <TableHead>{t("table.status")}</TableHead>
                    <TableHead>{t("table.date")}</TableHead>
                    <TableHead className="text-right">{t("table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((msg) => {
                    const StatusIcon = statusIcons[msg.status as MessageStatus] || Clock;
                    return (
                      <TableRow key={msg.id} className="cursor-pointer hover:bg-slate-50" onClick={() => openDetail(msg)}>
                        <TableCell className="font-medium">{msg.name}</TableCell>
                        <TableCell className="text-sm text-slate-500">{msg.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {t(`categoryLabels.${msg.category}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">{msg.subject}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[msg.status as MessageStatus] || "bg-slate-100"}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {t(`statusLabels.${msg.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">{formatDate(msg.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); openDetail(msg); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-6 py-3">
                <span className="text-sm text-slate-500">
                  {locale === "zh"
                    ? `第 ${currentPage} / ${totalPages} 页`
                    : `Page ${currentPage} of ${totalPages}`}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail / Reply Dialog */}
        <Dialog open={!!viewMessage} onOpenChange={(open) => { if (!open) setViewMessage(null); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("detail.title")}</DialogTitle>
            </DialogHeader>
            {viewMessage && (
              <div className="space-y-5">
                {/* Sender info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-slate-500">{t("detail.from")}</Label>
                    <p className="font-medium">{viewMessage.name}</p>
                    <p className="text-slate-500">{viewMessage.email}</p>
                    {viewMessage.phone && <p className="text-slate-500">{viewMessage.phone}</p>}
                  </div>
                  <div>
                    <Label className="text-slate-500">{t("detail.category")}</Label>
                    <p>
                      <Badge variant="outline">{t(`categoryLabels.${viewMessage.category}`)}</Badge>
                    </p>
                    {viewMessage.organization && (
                      <>
                        <Label className="mt-2 text-slate-500">{t("detail.organization")}</Label>
                        <p>{viewMessage.organization}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Metadata */}
                {viewMessage.metadata && Object.keys(viewMessage.metadata).length > 0 && (
                  <div>
                    <Label className="text-slate-500">{t("detail.metadata")}</Label>
                    <div className="mt-1 rounded-lg bg-slate-50 p-3 text-sm">
                      {Object.entries(viewMessage.metadata).map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <span className="font-medium text-slate-600">{k}:</span>
                          <span>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Original message */}
                <div>
                  <Label className="text-slate-500">{t("detail.message")}</Label>
                  <div className="mt-1 rounded-lg bg-slate-50 p-4 text-sm whitespace-pre-wrap">
                    <p className="font-semibold mb-2">{viewMessage.subject}</p>
                    {viewMessage.message}
                  </div>
                </div>

                {/* Reply info if already replied */}
                {viewMessage.repliedAt && (
                  <div className="text-xs text-slate-400">
                    {t("detail.repliedAt")}: {formatDate(viewMessage.repliedAt)}
                  </div>
                )}

                {/* Reply textarea */}
                <div>
                  <Label>{t("detail.reply")}</Label>
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={t("detail.replyPlaceholder")}
                    rows={4}
                    className="mt-1"
                  />
                </div>

                {/* Internal notes */}
                <div>
                  <Label>{t("detail.notes")}</Label>
                  <Textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder={t("detail.notesPlaceholder")}
                    rows={2}
                    className="mt-1"
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    onClick={handleReply}
                    disabled={!replyText.trim() || isSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {t("detail.sendReply")}
                  </Button>
                  {viewMessage.status !== "CLOSED" && (
                    <Button
                      variant="outline"
                      onClick={() => handleStatusChange(viewMessage.id, "CLOSED")}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      {t("detail.close")}
                    </Button>
                  )}
                  {viewMessage.status === "CLOSED" && (
                    <Button
                      variant="outline"
                      onClick={() => handleStatusChange(viewMessage.id, "PENDING")}
                    >
                      {t("detail.reopen")}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminSectionGuard>
  );
}
