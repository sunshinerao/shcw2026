"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  CheckCircle,
  XCircle,
  Loader2,
  QrCode,
  Calendar,
  MapPin,
  Award,
  AlertTriangle,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";

interface CheckInData {
  alreadyCheckedIn?: boolean;
  event?: {
    id: string;
    title: string;
    titleEn?: string | null;
    venue?: string;
  };
  registration?: {
    id: string;
    status: string;
    checkedInAt?: string;
    pointsEarned: number;
  };
  pointsAwarded?: number;
  message: string;
}

export default function SelfCheckinPage() {
  const { data: session, status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("selfCheckinPage");
  const locale = useLocale();

  const eventId = searchParams.get("eventId");
  const secret = searchParams.get("secret");

  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ success: boolean; data?: CheckInData; error?: string } | null>(null);

  const doCheckin = useCallback(async () => {
    if (!eventId || !secret || checking) return;
    setChecking(true);

    try {
      const response = await fetch("/api/self-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, secret, locale }),
      });
      const data = await response.json();
      setResult(data);
    } catch {
      setResult({ success: false, error: t("networkError") });
    } finally {
      setChecking(false);
    }
  }, [eventId, secret, locale, checking, t]);

  // Auto-check-in once session is ready
  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session) return; // Not logged in — show login prompt
    if (!eventId || !secret) return; // Missing params
    if (result || checking) return; // Already done or in progress

    void doCheckin();
  }, [session, sessionStatus, eventId, secret, result, checking, doCheckin]);

  // Missing parameters
  if (!eventId || !secret) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 pt-20">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-900 mb-2">{t("invalidQr")}</h2>
            <p className="text-slate-500 text-sm">{t("invalidQrDesc")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not logged in
  if (sessionStatus !== "loading" && !session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 pt-20">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <LogIn className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-900 mb-2">{t("loginRequired")}</h2>
            <p className="text-slate-500 text-sm mb-6">{t("loginRequiredDesc")}</p>
            <Link
              href={`/auth/login?callbackUrl=/${locale}/self-checkin?eventId=${encodeURIComponent(eventId)}&secret=${encodeURIComponent(secret)}`}
            >
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <LogIn className="w-4 h-4 mr-2" />
                {t("loginBtn")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading
  if (sessionStatus === "loading" || checking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 pt-20">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-900">{t("checking")}</h2>
            <p className="text-slate-500 text-sm mt-2">{t("checkingDesc")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Result
  if (result) {
    const eventTitle = result.data?.event
      ? (locale === "en" && result.data.event.titleEn ? result.data.event.titleEn : result.data.event.title)
      : "";

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 pt-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full space-y-4"
        >
          <Card className={`overflow-hidden ${result.success ? "border-green-200" : "border-red-200"}`}>
            <div className={`p-6 ${result.success ? "bg-green-50" : "bg-red-50"}`}>
              <div className="flex flex-col items-center text-center">
                {result.success ? (
                  <CheckCircle className="w-16 h-16 text-green-500 mb-3" />
                ) : (
                  <XCircle className="w-16 h-16 text-red-500 mb-3" />
                )}
                <h2 className={`text-xl font-bold ${result.success ? "text-green-900" : "text-red-900"}`}>
                  {result.success ? t("success") : t("failed")}
                </h2>
                <p className={`mt-1 text-sm ${result.success ? "text-green-600" : "text-red-600"}`}>
                  {result.data?.message || result.error}
                </p>
              </div>
            </div>

            {result.success && result.data && (
              <CardContent className="p-6 space-y-4">
                {/* Event info */}
                {result.data.event && (
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">{eventTitle}</span>
                    </div>
                    {result.data.event.venue && (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <MapPin className="w-3 h-3" />
                        {result.data.event.venue}
                      </div>
                    )}
                  </div>
                )}

                {/* Points awarded */}
                {result.data.pointsAwarded && result.data.pointsAwarded > 0 && (
                  <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <Award className="w-8 h-8 text-amber-500" />
                    <div>
                      <p className="font-semibold text-amber-900">+{result.data.pointsAwarded} {t("points")}</p>
                      <p className="text-sm text-amber-600">{t("pointsDesc")}</p>
                    </div>
                  </div>
                )}

                {/* Already checked in */}
                {result.data.alreadyCheckedIn && (
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <AlertTriangle className="w-6 h-6 text-blue-500" />
                    <div>
                      <p className="font-semibold text-blue-900">{t("alreadyCheckedIn")}</p>
                      {result.data.registration?.checkedInAt && (
                        <p className="text-sm text-blue-600">
                          {new Date(result.data.registration.checkedInAt).toLocaleString(
                            locale === "en" ? "en-US" : "zh-CN"
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          <div className="text-center">
            <Link href="/dashboard/pass">
              <Button variant="outline">
                <QrCode className="w-4 h-4 mr-2" />
                {t("viewPass")}
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
