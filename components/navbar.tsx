"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
  Ticket,
  LayoutDashboard,
  BadgeCheck,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/language-switcher";
import { isAdminConsoleRole } from "@/lib/permissions";

/** Pages with light background where the navbar needs dark text/logo */
const LIGHT_BG_PREFIXES = ["/dashboard", "/admin", "/auth", "/events", "/tracks", "/speakers", "/verifier"];

export function Navbar({
  newsEnabled = true,
  speakersEnabled = true,
}: {
  newsEnabled?: boolean;
  speakersEnabled?: boolean;
}) {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const locale = useLocale();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // On pages with light background, always use dark styling
  const isLightBgPage = LIGHT_BG_PREFIXES.some((prefix) => pathname?.startsWith(prefix));
  const useDarkStyle = isScrolled || isLightBgPage;

  const allNavItems = [
    { name: t("nav.home"), href: "/" },
    { name: t("nav.events"), href: "/events" },
    { name: t("nav.speakers"), href: "/speakers" },
    { name: "Knowledge Hub", href: "/insights" },
    { name: t("nav.news"), href: "/news" },
    { name: t("nav.about"), href: "/about" },
    { name: t("nav.contact"), href: "/contact" },
  ];
  const navItems = allNavItems.filter((item) => {
    if (item.href === "/news") return newsEnabled;
    if (item.href === "/speakers") return speakersEnabled;
    return true;
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const user = session?.user;

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-sm"
            : isLightBgPage
              ? "bg-white/90 backdrop-blur-sm"
              : "bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <Image
                src={useDarkStyle ? "/images/logo-black.png" : "/images/logo-white.png"}
                alt={t("adminLayout.logoAlt")}
                width={176}
                height={48}
                priority
                sizes="(max-width: 640px) 120px, 176px"
                className="h-10 sm:h-12 w-auto object-contain transition-opacity"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                    useDarkStyle
                      ? "text-neutral-700 hover:text-primary-600 hover:bg-primary-50"
                      : "text-white/90 hover:text-white hover:bg-white/10"
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-2">
              <LanguageSwitcher />
              {status === "loading" ? (
                <div className="w-8 h-8 rounded-full bg-neutral-200 animate-pulse" />
              ) : user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className={cn(
                      "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                      useDarkStyle
                        ? "hover:bg-neutral-100"
                        : "hover:bg-white/10"
                    )}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.image || undefined} />
                      <AvatarFallback className="bg-primary-100 text-primary-700">
                        {user.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={cn(
                        "hidden md:block text-sm font-medium",
                        useDarkStyle ? "text-neutral-700" : "text-white"
                      )}
                    >
                      {user.name}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 transition-transform",
                        isUserMenuOpen && "rotate-180",
                        useDarkStyle ? "text-neutral-500" : "text-white/70"
                      )}
                    />
                  </button>

                  {/* User Dropdown */}
                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-neutral-100 py-2 z-50"
                      >
                        <div className="px-4 py-3 border-b border-neutral-100">
                          <p className="font-medium text-neutral-900">
                            {user.name}
                          </p>
                          <p className="text-sm text-neutral-500">{user.email}</p>
                          {user.role && (
                            <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-primary-50 text-primary-700 rounded-full">
                              {t(`roles.${user.role.toLowerCase()}`)}
                            </span>
                          )}
                        </div>
                        <div className="py-1">
                          <Link
                            href="/dashboard"
                            className="flex items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            {t("nav.dashboard")}
                          </Link>
                          <Link
                            href="/dashboard/pass"
                            className="flex items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Ticket className="w-4 h-4 mr-2" />
                            {t("userMenu.pass")}
                          </Link>
                          <Link
                            href="/dashboard/climate-passport"
                            className="flex items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <BadgeCheck className="w-4 h-4 mr-2" />
                            {t("userMenu.climatePassport")}
                          </Link>
                          {["ADMIN", "STAFF", "VERIFIER"].includes(String(user.role || "")) && (
                            <Link
                              href="/verifier"
                              className="flex items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <QrCode className="w-4 h-4 mr-2" />
                              {t("userMenu.verifier")}
                            </Link>
                          )}
                          <Link
                            href="/dashboard/profile"
                            className="flex items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <User className="w-4 h-4 mr-2" />
                            {t("userMenu.profile")}
                          </Link>
                          {isAdminConsoleRole(user.role, (user as any).staffPermissions) && (
                            <Link
                              href="/admin"
                              className="flex items-center px-4 py-2 text-sm text-primary-600 hover:bg-primary-50"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <LayoutDashboard className="w-4 h-4 mr-2" />
                              {t("nav.admin")}
                            </Link>
                          )}
                        </div>
                        <div className="border-t border-neutral-100 pt-1">
                          <button
                            onClick={() => signOut({ callbackUrl: `/${locale}` })}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <LogOut className="w-4 h-4 mr-2" />
                            {t("dashboard.logout")}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link href="/auth/login">
                    <Button
                      variant="ghost"
                      className={cn(
                        useDarkStyle
                          ? "text-neutral-700 hover:text-neutral-900"
                          : "text-white hover:text-white hover:bg-white/10"
                      )}
                    >
                      {t("nav.login")}
                    </Button>
                  </Link>
                  <Link href="/auth/register" className="hidden sm:block">
                    <Button
                      className={cn(
                        useDarkStyle
                          ? "bg-primary-600 hover:bg-primary-700 text-white"
                          : "bg-white text-primary-600 hover:bg-white/90"
                      )}
                    >
                      {t("nav.register")}
                    </Button>
                  </Link>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={cn(
                  "lg:hidden p-2 rounded-lg transition-colors",
                  useDarkStyle
                    ? "text-neutral-700 hover:bg-neutral-100"
                    : "text-white hover:bg-white/10"
                )}
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-16 z-40 bg-white shadow-lg lg:hidden"
          >
            <nav className="px-4 py-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block px-4 py-3 text-base font-medium text-neutral-700 rounded-lg hover:bg-neutral-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              {!user && (
                <div className="pt-4 border-t border-neutral-100 mt-4 space-y-2">
                  <Link
                    href="/auth/login"
                    className="block w-full px-4 py-3 text-center font-medium text-neutral-700 rounded-lg border border-neutral-200"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t("nav.login")}
                  </Link>
                  <Link
                    href="/auth/register"
                    className="block w-full px-4 py-3 text-center font-medium text-white bg-primary-600 rounded-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t("nav.register")}
                  </Link>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
