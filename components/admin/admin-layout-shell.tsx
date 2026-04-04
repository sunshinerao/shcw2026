"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Mic,
  Shield,
  Building2,
  Settings,
  ChevronRight,
  Route,
  FileText,
  HelpCircle,
  MessageSquare,
  Newspaper,
  PanelTop,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/routing";
import { canAccessAdminSection, type AppUserRole, type AdminSectionKey } from "@/lib/permissions";

type NavItem = {
  key: AdminSectionKey;
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
};

export function AdminLayoutShell({
  children,
  role,
}: {
  children: React.ReactNode;
  role: AppUserRole;
}) {
  const t = useTranslations("adminLayout");
  const pathname = usePathname();
  const navItems = [
    { key: "dashboard", name: t("nav.dashboard"), href: "/admin", icon: LayoutDashboard },
    { key: "events", name: t("nav.events"), href: "/admin/events", icon: Calendar },
    { key: "specialPass", name: t("nav.specialPass"), href: "/admin/special-pass", icon: Shield },
    { key: "tracks", name: t("nav.tracks"), href: "/admin/tracks", icon: Route },
    { key: "speakers", name: t("nav.speakers"), href: "/admin/speakers", icon: Mic },
    { key: "invitations", name: t("nav.invitations"), href: "/admin/invitations", icon: FileText },
    { key: "users", name: t("nav.users"), href: "/admin/users", icon: Users },
    { key: "partners", name: t("nav.partners"), href: "/admin/partners", icon: Building2 },
    { key: "cooperationPlans", name: t("nav.cooperationPlans"), href: "/admin/cooperation-plans", icon: Building2 },
    { key: "faq", name: t("nav.faq"), href: "/admin/faq", icon: HelpCircle },
    { key: "news", name: t("nav.news"), href: "/admin/news", icon: Newspaper },
    { key: "content", name: t("nav.content"), href: "/admin/content", icon: PanelTop },
    { key: "messages", name: t("nav.messages"), href: "/admin/messages", icon: MessageSquare },
    { key: "settings", name: t("nav.settings"), href: "/admin/settings", icon: Settings },
  ] satisfies NavItem[];

  const visibleNavItems = navItems.filter((item) => canAccessAdminSection(role, item.key));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 bg-slate-900 text-white">
        <div className="mx-auto h-16 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-full items-center justify-between">
            <div className="flex items-center space-x-3">
              <Image
                src="/images/logo-white.png"
                alt={t("logoAlt")}
                width={140}
                height={32}
                priority
                sizes="140px"
                className="h-8 w-auto object-contain"
              />
              <span className="font-bold text-slate-300">|</span>
              <span className="font-bold">{t("title")}</span>
            </div>
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:bg-white/10 hover:text-white focus-visible:ring-white/40"
              >
                {t("backToSite")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-5">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-1"
          >
            <div className="sticky top-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <nav className="space-y-1 p-4">
                {visibleNavItems.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <item.icon className={`mr-3 h-5 w-5 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                      {item.name}
                      {isActive ? <ChevronRight className="ml-auto h-4 w-4" /> : null}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-4"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}