"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Users, Calendar, Ticket, TrendingUp, ArrowRight, Activity, Loader2 } from "lucide-react";
import { AdminSectionGuard } from "@/components/admin/admin-section-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/routing";

const statIcons = [
  { key: "users", icon: Users, color: "text-blue-600", bgColor: "bg-blue-50" },
  { key: "events", icon: Calendar, color: "text-emerald-600", bgColor: "bg-emerald-50" },
  { key: "registrations", icon: Ticket, color: "text-amber-600", bgColor: "bg-amber-50" },
  { key: "checkins", icon: Activity, color: "text-rose-600", bgColor: "bg-rose-50" },
];

export default function AdminDashboard() {
  const t = useTranslations("adminDashboardPage");
  const locale = useLocale();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ key: string; value: string }[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [recentCheckins, setRecentCheckins] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<{ month: string; count: number }[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [usersRes, eventsRes, checkinsRes, trendRes] = await Promise.all([
          fetch("/api/users?pageSize=1"),
          fetch("/api/events?limit=100"),
          fetch("/api/checkin?limit=5"),
          fetch("/api/stats/trend"),
        ]);

        const usersData = await usersRes.json();
        const eventsData = await eventsRes.json();
        const checkinsData = await checkinsRes.json();
        const trendResult = await trendRes.json();

        const totalUsers = usersData.data?.pagination?.total ?? 0;
        const events = eventsData.data?.events ?? [];
        const totalEvents = eventsData.data?.pagination?.total ?? events.length;
        const totalRegistrations = events.reduce(
          (sum: number, e: any) => sum + (e._count?.registrations ?? 0),
          0
        );
        const totalCheckins = events.reduce(
          (sum: number, e: any) => sum + (e._count?.checkins ?? 0),
          0
        );

        setStats([
          { key: "users", value: totalUsers.toLocaleString() },
          { key: "events", value: String(totalEvents) },
          { key: "registrations", value: totalRegistrations.toLocaleString() },
          { key: "checkins", value: totalCheckins.toLocaleString() },
        ]);

        // 即将举办的活动（按日期升序，取前3个未过期的）
        const now = new Date().toISOString();
        const upcoming = events
          .filter((e: any) => e.startDate >= now && e.isPublished)
          .sort((a: any, b: any) => a.startDate.localeCompare(b.startDate))
          .slice(0, 3)
          .map((e: any) => ({
            id: e.id,
            title: e.title,
            titleEn: e.titleEn,
            startDate: e.startDate?.slice(0, 10),
            registered: e._count?.registrations ?? 0,
            capacity: e.maxAttendees ?? 999,
          }));
        setUpcomingEvents(upcoming);

        // 最近签到记录
        const recent = (checkinsData.data ?? []).slice(0, 5).map((c: any) => ({
          id: c.id,
          user: c.user?.name ?? "-",
          event: c.event?.title ?? "-",
          time: c.scannedAt,
        }));
        setRecentCheckins(recent);

        // 注册趋势
        if (trendResult.success) {
          setTrendData(trendResult.data);
        }
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <AdminSectionGuard section="dashboard">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      </AdminSectionGuard>
    );
  }

  return (
    <AdminSectionGuard section="dashboard">
      <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{t("title")}</h1>
        <p className="text-slate-600">{t("subtitle")}</p>
      </motion.div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statIcons.map((si, index) => {
          const stat = stats.find((s) => s.key === si.key);
          return (
          <motion.div
            key={si.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                    <div className={`w-12 h-12 ${si.bgColor} rounded-xl flex items-center justify-center mr-4`}>
                      <si.icon className={`w-6 h-6 ${si.color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">{t(`stats.${si.key}`)}</p>
                      <p className="text-2xl font-bold text-slate-900">{stat?.value ?? "-"}</p>
                    </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Registration Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("trendTitle")}</CardTitle>
              <TrendingUp className="w-5 h-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              {(() => {
                const maxCount = Math.max(...trendData.map((d) => d.count), 1);
                return (
                  <>
                    <div className="h-48 flex items-end justify-between gap-2">
                      {trendData.map((d, i) => {
                        const height = (d.count / maxCount) * 100;
                        return (
                          <div
                            key={i}
                            className="flex-1 bg-emerald-100 rounded-t-lg relative group"
                            style={{ height: `${Math.max(height, 2)}%` }}
                            title={`${d.month}: ${d.count}`}
                          >
                            <div className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-t-lg transition-all group-hover:bg-emerald-600" style={{ height: `${height * 0.7}%` }} />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-4 text-xs text-slate-500">
                      {trendData.length > 0 && (
                        <>
                          <span>{trendData[0]?.month}</span>
                          <span>{trendData[Math.floor(trendData.length / 4)]?.month}</span>
                          <span>{trendData[Math.floor(trendData.length / 2)]?.month}</span>
                          <span>{trendData[Math.floor(trendData.length * 3 / 4)]?.month}</span>
                          <span>{trendData[trendData.length - 1]?.month}</span>
                        </>
                      )}
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Check-ins */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("recentTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentCheckins.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">-</p>
                ) : recentCheckins.map((reg) => (
                  <div key={reg.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                    <div>
                      <p className="font-medium text-slate-900">{reg.user}</p>
                      <p className="text-sm text-slate-500">{reg.event}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">
                        {reg.time ? new Date(reg.time).toLocaleString(locale === "en" ? "en-US" : "zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Upcoming Events */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("upcomingTitle")}</CardTitle>
            <Link href="/admin/events">
              <Button variant="ghost" size="sm">
                {t("manageEvents")}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                  <div>
                    <h3 className="font-semibold text-slate-900">{locale === "en" ? event.titleEn : event.title}</h3>
                    <p className="text-sm text-slate-500">{event.startDate}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-900">{event.registered} / {event.capacity}</p>
                      <p className="text-xs text-slate-500">{t("registeredCapacity")}</p>
                    </div>
                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${(event.registered / event.capacity) * 100}%` }}
                      />
                    </div>
                    <Link href={`/admin/events/${event.id}`}>
                      <Button size="sm" variant="outline">
                        {t("manage")}
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
      </div>
    </AdminSectionGuard>
  );
}
