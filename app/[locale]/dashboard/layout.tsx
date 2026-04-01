"use client";

import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  Ticket,
  BadgeCheck,
  User,
  Settings,
  Bell,
  ChevronRight,
  LogOut,
  Home,
  FileText,
  MessageSquare,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut } from "next-auth/react";
import { Link, usePathname } from "@/i18n/routing";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("dashboardLayout");
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const navItems = [
    { name: t("nav.home"), href: "/", icon: Home },
    { name: t("nav.overview"), href: "/dashboard", icon: LayoutDashboard },
    { name: t("nav.schedule"), href: "/dashboard/schedule", icon: Calendar },
    { name: t("nav.pass"), href: "/dashboard/pass", icon: Ticket },
    { name: t("nav.climatePassport"), href: "/dashboard/climate-passport", icon: BadgeCheck },
    { name: t("nav.invitations"), href: "/dashboard/invitations", icon: FileText },
    { name: t("nav.specialPass"), href: "/dashboard/special-pass", icon: Shield },
    { name: t("nav.profile"), href: "/dashboard/profile", icon: User },
    { name: t("nav.messages"), href: "/dashboard/messages", icon: MessageSquare },
    { name: t("nav.notifications"), href: "/dashboard/notifications", icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-1"
          >
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden sticky top-24">
              {/* User Profile */}
              <div className="p-6 border-b border-slate-100 bg-gradient-to-br from-emerald-50 to-teal-50">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-16 h-16 border-2 border-white shadow-sm">
                    <AvatarImage src={user?.image || ""} />
                    <AvatarFallback className="bg-emerald-600 text-white text-xl">
                      {user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-bold text-slate-900">{user?.name || t("fallbackUser")}</h2>
                    <p className="text-sm text-slate-500">{user?.email}</p>
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                      {user?.role ? t(`roles.${user.role}`) : t("roles.ATTENDEE")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="p-4 space-y-1">
                {navItems.map((item) => {
                  const isActive = item.href === "/dashboard"
                    ? pathname === item.href
                    : pathname === item.href || pathname?.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <item.icon className={`w-5 h-5 mr-3 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                      {item.name}
                      {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                    </Link>
                  );
                })}
              </nav>

              {/* Logout */}
              <div className="p-4 border-t border-slate-100">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  {t("logout")}
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-3"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
