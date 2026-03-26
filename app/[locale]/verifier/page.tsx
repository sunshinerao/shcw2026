"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
  Award
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

export default function VerifierPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<CheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  // 检查权限
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/login");
      return;
    }

    const allowedRoles = ["ADMIN", "STAFF", "VERIFIER"];
    if (!allowedRoles.includes(session.user?.role as string)) {
      toast.error("您没有验证人员权限");
      router.push("/");
      return;
    }

    setLoading(false);
    fetchRecentCheckIns();
  }, [session, status, router]);

  // 获取最近的验码记录
  const fetchRecentCheckIns = async () => {
    try {
      const response = await fetch("/api/checkin?limit=10");
      const data = await response.json();
      if (data.success) {
        setRecentCheckIns(data.data);
      }
    } catch (error) {
      console.error("获取验码记录失败", error);
    }
  };

  // 处理扫描结果
  const onNewScanResult = useCallback(async (decodedText: string) => {
    if (!scanning) return;
    
    setScanning(false);
    
    try {
      const response = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrData: decodedText }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        toast.success(data.data.message);
        fetchRecentCheckIns();
      } else {
        toast.error(data.error || "验证失败");
      }
    } catch (error) {
      toast.error("验码请求失败");
    }
  }, [scanning]);

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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
              <Scan className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">现场验码</h1>
              <p className="text-sm text-slate-500">扫描参与者二维码进行验证</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="w-4 h-4 mr-2" />
              记录
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {!scanning && !result ? (
            // 初始状态 - 开始扫描
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="text-center p-8">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <QrCode className="w-10 h-10 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">准备扫描</h2>
                <p className="text-slate-500 mb-6">
                  点击开始扫描按钮，将相机对准参与者的二维码进行验证
                </p>
                <Button 
                  size="lg" 
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setScanning(true)}
                >
                  <Scan className="w-5 h-5 mr-2" />
                  开始扫描
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
                      扫描二维码
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setScanning(false)}
                    >
                      取消
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative rounded-xl overflow-hidden bg-black">
                    <Html5QrcodePlugin
                      fps={10}
                      qrbox={{ width: 250, height: 250 }}
                      disableFlip={false}
                      qrCodeSuccessCallback={onNewScanResult}
                    />
                  </div>
                  <p className="text-center text-sm text-slate-500 mt-4">
                    将二维码放入框内即可自动扫描
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
                        {result.success ? "验证成功" : "验证失败"}
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
                          <span className="text-sm text-slate-500">活动信息</span>
                        </div>
                        <h4 className="font-semibold text-slate-900">{result.data.event.title}</h4>
                        <p className="text-sm text-slate-500">
                          {new Date(result.data.event.startDate).toLocaleDateString("zh-CN")} · {result.data.event.venue}
                        </p>
                      </div>
                    )}

                    {/* 积分奖励 */}
                    {result.data.pointsAwarded && result.data.pointsAwarded > 0 && (
                      <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <Award className="w-8 h-8 text-amber-500" />
                        <div>
                          <p className="font-semibold text-amber-900">+{result.data.pointsAwarded} 积分</p>
                          <p className="text-sm text-amber-600">用户已获得活动积分奖励</p>
                        </div>
                      </div>
                    )}

                    {/* 已入场提示 */}
                    {result.data.alreadyCheckedIn && (
                      <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <AlertTriangle className="w-6 h-6 text-blue-500" />
                        <div>
                          <p className="font-semibold text-blue-900">该用户已完成签到</p>
                          <p className="text-sm text-blue-600">
                            验码时间: {result.data.registration?.checkedInAt && 
                              new Date(result.data.registration.checkedInAt).toLocaleString("zh-CN")
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
                  继续扫描
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
                  最近验码记录
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentCheckIns.length === 0 ? (
                  <p className="text-center text-slate-500 py-4">暂无验码记录</p>
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
                            {record.event?.title || "护照验证"} · 
                            {new Date(record.scannedAt).toLocaleTimeString("zh-CN")}
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
