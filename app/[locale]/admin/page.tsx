"use client";

import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Users, Calendar, Ticket, TrendingUp, ArrowRight, Activity } from "lucide-react";
import { AdminSectionGuard } from "@/components/admin/admin-section-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/routing";

// Mock stats data
const stats = [
  { key: "users", value: "1,234", change: "+12%", icon: Users, color: "text-blue-600", bgColor: "bg-blue-50" },
  { key: "events", value: "13", change: "+3", icon: Calendar, color: "text-emerald-600", bgColor: "bg-emerald-50" },
  { key: "registrations", value: "856", change: "+28%", icon: Ticket, color: "text-amber-600", bgColor: "bg-amber-50" },
  { key: "visits", value: "342", change: "+15%", icon: Activity, color: "text-rose-600", bgColor: "bg-rose-50" },
];

const recentRegistrations = [
  { id: "1", user: "张三", userEn: "Alex Zhang", event: "开幕典礼", eventEn: "Opening ceremony", time: "2分钟前", timeEn: "2 min ago", status: "success" },
  { id: "2", user: "李四", userEn: "Lina Li", event: "未来食物工作坊", eventEn: "Future food workshop", time: "5分钟前", timeEn: "5 min ago", status: "success" },
  { id: "3", user: "王五", userEn: "William Wang", event: "可持续贸易论坛", eventEn: "Sustainable trade forum", time: "12分钟前", timeEn: "12 min ago", status: "pending" },
];

const upcomingEvents = [
  { id: "1", title: "开幕典礼暨全球气候领导力峰会", titleEn: "Opening Ceremony and Global Climate Leadership Summit", date: "2026-04-20", registered: 234, capacity: 800 },
  { id: "2", title: "未来食物系统工作坊", titleEn: "Future Food Systems Workshop", date: "2026-04-20", registered: 89, capacity: 120 },
];

export default function AdminDashboard() {
  const t = useTranslations("adminDashboardPage");
  const locale = useLocale();
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
        {stats.map((stat, index) => (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center mr-4`}>
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">{t(`stats.${stat.key}`)}</p>
                      <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    {stat.change}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
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
              <div className="h-48 flex items-end justify-between gap-2">
                {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-emerald-100 rounded-t-lg relative group"
                    style={{ height: `${height}%` }}
                  >
                    <div className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-t-lg transition-all group-hover:bg-emerald-600" style={{ height: `${height * 0.7}%` }} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4 text-xs text-slate-500">
                <span>{t("months.jan")}</span>
                <span>{t("months.mar")}</span>
                <span>{t("months.jun")}</span>
                <span>{t("months.sep")}</span>
                <span>{t("months.dec")}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Registrations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("recentTitle")}</CardTitle>
              <Link href="/admin/registrations">
                <Button variant="ghost" size="sm">
                  {t("viewAll")}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentRegistrations.map((reg) => (
                  <div key={reg.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                    <div>
                      <p className="font-medium text-slate-900">{locale === "en" ? reg.userEn : reg.user}</p>
                      <p className="text-sm text-slate-500">{locale === "en" ? reg.eventEn : reg.event}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">{locale === "en" ? reg.timeEn : reg.time}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        reg.status === "success" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {reg.status === "success" ? t("statuses.success") : t("statuses.pending")}
                      </span>
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
                    <p className="text-sm text-slate-500">{event.date}</p>
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
