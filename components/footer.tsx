"use client";

import Image from "next/image";
import { Mail, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { LanguageSwitcherSimple } from "@/components/language-switcher";
import { Link } from "@/i18n/routing";

export function Footer({ newsEnabled = true }: { newsEnabled?: boolean }) {
  const t = useTranslations();

  const footerLinks = {
    explore: [
      { name: t("footer.nav.home"), href: "/" },
      { name: t("footer.nav.events"), href: "/events" },
      { name: t("footer.nav.tracks"), href: "/#tracks" },
      { name: t("footer.nav.speakers"), href: "/speakers" },
      { name: t("footer.nav.partners"), href: "/partners" },
    ],
    participate: [
      { name: t("footer.nav.attendeeRegister"), href: "/auth/register" },
      { name: t("footer.nav.organization"), href: "/auth/register?role=ORGANIZATION" },
      { name: t("footer.nav.sponsor"), href: "/contact?type=partnership" },
      { name: t("footer.nav.speaker"), href: "/contact?type=speaker" },
      { name: t("footer.nav.media"), href: "/contact?type=media" },
    ],
    support: [
      { name: t("footer.nav.about"), href: "/about" },
      ...(newsEnabled ? [{ name: t("footer.nav.news"), href: "/news" }] : []),
      { name: t("footer.nav.faq"), href: "/faq" },
      { name: t("footer.nav.contact"), href: "/contact" },
    ],
  };

  return (
    <footer className="bg-neutral-900 text-neutral-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer */}
        <div className="py-12 lg:py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center mb-6">
              <Image
                src="/images/logo-white.png"
                alt={t("adminLayout.logoAlt")}
                width={176}
                height={48}
                sizes="176px"
                className="h-12 w-auto object-contain"
              />
            </Link>
            <p className="text-neutral-400 leading-relaxed mb-6 max-w-sm">
              {t("footer.brand.title")}
              <br />
              {t("footer.brand.subtitle")}
            </p>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-sm">
                <MapPin className="w-4 h-4 text-primary-400" />
                <span>{t("footer.brand.address")}</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <Mail className="w-4 h-4 text-primary-400" />
                <a
                  href="mailto:info@shanghaiclimateweek.org.cn"
                  className="hover:text-white transition-colors"
                >
                  info@shanghaiclimateweek.org.cn
                </a>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <Mail className="w-4 h-4 text-primary-400" />
                <a
                  href="mailto:shcw2026@globalclimateacademy.org"
                  className="hover:text-white transition-colors"
                >
                  shcw2026@globalclimateacademy.org
                </a>
              </div>
            </div>
          </div>

          {/* Explore */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t("footer.links.explore")}</h3>
            <ul className="space-y-3">
              {footerLinks.explore.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Participate */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t("footer.links.participate")}</h3>
            <ul className="space-y-3">
              {footerLinks.participate.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t("footer.links.support")}</h3>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
          <p className="text-sm text-neutral-500">
            {t("footer.copyright")}
          </p>
          <div className="flex items-center space-x-6 text-sm">
            <LanguageSwitcherSimple />
            <Link
              href="/privacy"
              className="text-neutral-500 hover:text-white transition-colors"
            >
              {t("footer.privacy")}
            </Link>
            <Link
              href="/terms"
              className="text-neutral-500 hover:text-white transition-colors"
            >
              {t("footer.terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
