"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { 
  Scan, 
  CheckCircle, 
  XCircle, 
  User, 
  Calendar, 
  Ticket,
  Loader2,
  RefreshCw,
  History,
  AlertTriangle,
  QrCode,
  Award,
  ChevronDown,
  MapPin,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import dynamic from "next/dynamic";

// 动态导入 Html5QrcodeScanner 以避免 SSR 问题
const Html5QrcodePlugin = dynamic(
  () => import("@/components/html5-qrcode-plugin"),
  { ssr: false }
);

interface CheckInResult {
  success: boolean;
  data?: {
    type: "PASSPORT" | "EVENT";
    alreadyCheckedIn?: boolean;
    user: {
      id: string;
      name: string;
      email: string;
      avatar?: string;
      climatePassportId?: string;
      passCode: string;
      organization?: string;
      title?: string;
    };
    event?: {
      id: string;
      title: string;
      startDate: Date;
      venue: string;
    };
    registration?: {
      id: string;
      status: string;
      checkedInAt?: Date;
      pointsEarned: number;
    };
    pointsAwarded?: number;
    message: string;
  };
  error?: string;
}

interface CheckInRecord {
  id: string;
  scannedAt: Date;
  method: string;
  user: {
    id: string;
    name: string;
    email: string;
    climatePassportId?: string;
    avatar?: string;
  };
  event?: {
    id: string;
    title: string;
  };
}

interface AssignedEvent {
  id: string;
  title: string;
  titleEn?: string | null;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  venue: string;
  type: string;
}

export default function VerifierPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations("verifierPage");
  const locale = useLocale();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<CheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [assignedEvents, setAssignedEvents] = useState<AssignedEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showEventSelector, setShowEventSelector] = useState(false);

  const fetchRecentCheckIns = useCallback(async () => {
    try {
      const response = await fetch("/api/checkin?limit=10");
      const data = await response.json();
      if (data.success) {
        setRecentCheckIns(data.data);
      }
    } catch (error) {
      console.error("获取验码记录失败", error);
    }
  }, []);

  const fetchAssignedEvents = useCallback(async () => {
    try {
      const response = await fetch("/api/verifier/events");
      const data = await response.json();
      if (data.success) {
        setAssignedEvents(data.data);
        // Auto-select if only one event
        if (data.data.length === 1) {
          setSelectedEventId(data.data[0].id);
        }
      }
    } catch (error) {
      console.error("获取分配活动失败", error);
    }
  }, []);

  // 检查权限
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/login");
      return;
    }

    const allowedRoles = ["ADMIN", "STAFF", "VERIFIER"];
    if (!allowedRoles.includes(session.user?.role as string)) {
      toast.error(t("noPermission"));
      router.push("/");
      return;
    }

    setLoading(false);
    void fetchRecentCheckIns();
    void fetchAssignedEvents();
  }, [fetchRecentCheckIns, fetchAssignedEvents, router, session, status, t]);

  // 处理扫描结果
  const onNewScanResult = useCallback(async (decodedText: string) => {
    if (!scanning) return;
    
    setScanning(false);
    
    try {
      const response = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrData: decodedText, eventId: selectedEventId }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        toast.success(data.data.message);
        void fetchRecentCheckIns();
      } else {
        toast.error(data.error || t("result.failed"));
      }
    } catch (error) {
      toast.error(t("result.requestFailed"));
    }
  }, [fetchRecentCheckIns, scanning, selectedEventId, t]);

  // 重新开始扫描
  const restartScan = () => {
    setResult(null);
    setScanning(true);
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-16 lg:pt-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-[64px] lg:top-[80px] z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
              <Scan className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{t("header.title")}</h1>
              <p className="text-sm text-slate-500">{t("header.subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="w-4 h-4 mr-2" />
              {t("history")}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {!scanning && !result ? (
            // 初始状态 - 选择活动 + 开始扫描
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* 活动选择器 */}
              {assignedEvents.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-medium text-slate-700">{t("eventSelector.label")}</span>
                    </div>
                    <div className="space-y-2">
                      {assignedEvents.map((ev) => {
                        const isSelected = selectedEventId === ev.id;
                        const eventTitle = locale === "en" && ev.titleEn ? ev.titleEn : ev.title;
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => setSelectedEventId(isSelected ? null : ev.id)}
                            className={`w-full text-left p-3 rounded-lg border transition-colors ${
                              isSelected
                                ? "border-emerald-500 bg-emerald-50"
                                : "border-slate-200 hover:border-slate-300 bg-white"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium truncate ${isSelected ? "text-emerald-900" : "text-slate-900"}`}>
                                  {eventTitle}
                                </p>
                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(ev.startDate).toLocaleDateString(locale === "en" ? "en-US" : "zh-CN", { month: "short", day: "numeric" })}
                                  </span>
                                  {ev.venue && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {ev.venue}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isSelected && (
                                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 ml-2" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {!selectedEventId && session?.user?.role === "VERIFIER" && (
                      <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {t("eventSelector.selectRequired")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {assignedEvents.length === 0 && session?.user?.role === "VERIFIER" && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="p-6 text-center">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-amber-800 font-medium">{t("eventSelector.noEvents")}</p>
                    <p className="text-sm text-amber-600 mt-1">{t("eventSelector.contactAdmin")}</p>
                  </CardContent>
                </Card>
              )}

              <Card className="text-center p-8">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <QrCode className="w-10 h-10 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">{t("ready.title")}</h2>
                <p className="text-slate-500 mb-6">
                  {t("ready.description")}
                </p>
                <Button 
                  size="lg" 
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setScanning(true)}
                  disabled={session?.user?.role === "VERIFIER" && !selectedEventId}
                >
                  <Scan className="w-5 h-5 mr-2" />
                  {t("ready.start")}
                </Button>
              </Card>
            </motion.div>
          ) : scanning ? (
            // 扫描中状态
            <motion.div
              key="scanning"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Scan className="w-5 h-5 text-emerald-600" />
                      {t("scanning.title")}
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setScanning(false)}
                    >
                      {t("scanning.cancel")}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedEventId && (
                    <div className="mb-3 p-2 bg-emerald-50 rounded-lg flex items-center gap-2 text-sm">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-800 font-medium truncate">
                        {(() => {
                          const ev = assignedEvents.find(e => e.id === selectedEventId);
                          return ev ? (locale === "en" && ev.titleEn ? ev.titleEn : ev.title) : "";
                        })()}
                      </span>
                    </div>
                  )}
                  <Html5QrcodePlugin
                    fps={10}
                    disableFlip={false}
                    qrCodeSuccessCallback={onNewScanResult}
                  />
                  <p className="text-center text-sm text-slate-500 mt-4">
                    {t("scanning.hint")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : result ? (
            // 扫描结果状态
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              {/* 验证结果卡片 */}
              <Card className={`overflow-hidden ${result.success ? "border-green-200" : "border-red-200"}`}>
                <div className={`p-6 ${result.success ? "bg-green-50" : "bg-red-50"}`}>
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    ) : (
                      <XCircle className="w-8 h-8 text-red-600" />
                    )}
                    <div>
                      <h2 className={`text-xl font-bold ${result.success ? "text-green-900" : "text-red-900"}`}>
                        {result.success ? t("result.success") : t("result.failed")}
                      </h2>
                      <p className={result.success ? "text-green-600" : "text-red-600"}>
                        {result.data?.message || result.error}
                      </p>
                    </div>
                  </div>
                </div>

                {result.success && result.data && (
                  <CardContent className="p-6 space-y-6">
                    {/* 用户信息 */}
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                        {result.data.user.avatar ? (
                          <div
                            aria-label={result.data.user.name}
                            className="w-full h-full rounded-full bg-cover bg-center"
                            role="img"
                            style={{ backgroundImage: `url(${result.data.user.avatar})` }}
                          />
                        ) : (
                          <User className="w-8 h-8 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900">{result.data.user.name}</h3>
                        <p className="text-slate-500">{result.data.user.email}</p>
                        {result.data.user.climatePassportId && (
                          <Badge variant="outline" className="mt-2 text-emerald-600 border-emerald-200">
                            {result.data.user.climatePassportId}
                          </Badge>
                        )}
                        {result.data.user.title && (
                          <p className="text-sm text-slate-500 mt-1">
                            {result.data.user.title}
                            {result.data.user.organization && ` · ${result.data.user.organization}`}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 活动信息 */}
                    {result.data.event && (
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-500">{t("result.eventInfo")}</span>
                        </div>
                        <h4 className="font-semibold text-slate-900">{result.data.event.title}</h4>
                        <p className="text-sm text-slate-500">
                          {new Date(result.data.event.startDate).toLocaleDateString(locale === "en" ? "en-US" : "zh-CN")} · {result.data.event.venue}
                        </p>
                      </div>
                    )}

                    {/* 积分奖励 */}
                    {result.data.pointsAwarded && result.data.pointsAwarded > 0 && (
                      <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <Award className="w-8 h-8 text-amber-500" />
                        <div>
                          <p className="font-semibold text-amber-900">{t("result.pointsAwarded", { points: result.data.pointsAwarded })}</p>
                          <p className="text-sm text-amber-600">{t("result.pointsDescription")}</p>
                        </div>
                      </div>
                    )}

                    {/* 已入场提示 */}
                    {result.data.alreadyCheckedIn && (
                      <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <AlertTriangle className="w-6 h-6 text-blue-500" />
                        <div>
                          <p className="font-semibold text-blue-900">{t("result.alreadyCheckedIn")}</p>
                          <p className="text-sm text-blue-600">
                            {result.data.registration?.checkedInAt && 
                              t("result.checkedInTime", { time: new Date(result.data.registration.checkedInAt).toLocaleString(locale === "en" ? "en-US" : "zh-CN") })
                            }
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>

              {/* 操作按钮 */}
              <div className="flex gap-3">
                <Button 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={restartScan}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t("result.continueScanning")}
                </Button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* 最近验码记录 */}
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  {t("historyPanel.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentCheckIns.length === 0 ? (
                  <p className="text-center text-slate-500 py-4">{t("historyPanel.empty")}</p>
                ) : (
                  <div className="space-y-3">
                    {recentCheckIns.map((record) => (
                      <div 
                        key={record.id} 
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50"
                      >
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{record.user.name}</p>
                          <p className="text-xs text-slate-500">
                            {record.event?.title || t("historyPanel.passportVerify")} · 
                            {new Date(record.scannedAt).toLocaleTimeString(locale === "en" ? "en-US" : "zh-CN")}
                          </p>
                        </div>
                        <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}
