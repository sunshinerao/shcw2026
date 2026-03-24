"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/routing";

type MessageStatus = "PENDING" | "REPLIED" | "CLOSED";

type MyMessage = {
  id: string;
  name: string;
  email: string;
  organization?: string | null;
  category: string;
  subject: string;
  message: string;
  status: MessageStatus;
  adminReply?: string | null;
  repliedAt?: string | null;
  createdAt: string;
};

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

export default function DashboardMessagesPage() {
  const t = useTranslations("dashboardMessagesPage");
  const locale = useLocale();

  const [messages, setMessages] = useState<MyMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/contact/my", {
          headers: { "Accept-Language": locale },
        });
        const json = await res.json();
        if (json.success) {
          setMessages(json.data);
        }
      } catch {
        // silently fail
      } finally {
        setIsLoading(false);
      }
    })();
  }, [locale]);

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-slate-500">{t("subtitle")}</p>
        </div>
        <Link href="/contact">
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Send className="mr-2 h-4 w-4" />
            {t("sendNew")}
          </Button>
        </Link>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && messages.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="mb-4 h-12 w-12 text-slate-300" />
            <p className="text-slate-500">{t("empty")}</p>
            <Link href="/contact" className="mt-4">
              <Button variant="outline">
                <Send className="mr-2 h-4 w-4" />
                {t("sendNew")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Messages list */}
      {!isLoading && messages.length > 0 && (
        <div className="space-y-4">
          {messages.map((msg, index) => {
            const StatusIcon = statusIcons[msg.status] || Clock;
            const isExpanded = expandedId === msg.id;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={`cursor-pointer transition-shadow hover:shadow-md ${
                    isExpanded ? "ring-2 ring-emerald-200" : ""
                  }`}
                  onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base font-semibold">{msg.subject}</CardTitle>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                          <Badge variant="outline" className="text-xs">
                            {t(`category.${msg.category}`)}
                          </Badge>
                          <span>{formatDate(msg.createdAt)}</span>
                        </div>
                      </div>
                      <Badge className={statusColors[msg.status]}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {t(`status.${msg.status}`)}
                      </Badge>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="space-y-4 pt-0">
                      {/* User's original message */}
                      <div>
                        <p className="text-xs font-medium text-slate-400 uppercase mb-1">
                          {t("detail.yourMessage")}
                        </p>
                        <div className="rounded-lg bg-slate-50 p-4 text-sm whitespace-pre-wrap">
                          {msg.message}
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {t("detail.sentAt")}: {formatDate(msg.createdAt)}
                        </p>
                      </div>

                      {/* Admin reply */}
                      {msg.adminReply ? (
                        <div>
                          <p className="text-xs font-medium text-emerald-600 uppercase mb-1">
                            {t("detail.adminReply")}
                          </p>
                          <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4 text-sm whitespace-pre-wrap">
                            {msg.adminReply}
                          </div>
                          {msg.repliedAt && (
                            <p className="mt-1 text-xs text-slate-400">
                              {t("detail.repliedAt")}: {formatDate(msg.repliedAt)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">
                          <Clock className="mx-auto mb-1 h-5 w-5" />
                          {t("detail.noReply")}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
