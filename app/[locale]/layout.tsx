import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import {
  getMessages,
  getNow,
  getTimeZone,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { AppProviders } from "@/components/app-providers";
import { routing } from "@/i18n/routing";
import { getSystemSettingsForServer } from "@/lib/system-settings";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      type: "website",
      locale: locale === "en" ? "en_US" : "zh_CN",
    },
    twitter: {
      card: "summary",
      title: t("title"),
      description: t("description"),
    },
  };
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const [messages, now, timeZone, siteSettings] = await Promise.all([
    getMessages(),
    getNow(),
    getTimeZone(),
    getSystemSettingsForServer().catch(() => null),
  ]);

  return (
    <html lang={locale}>
      <body>
        <AppProviders
          locale={locale}
          messages={messages}
          now={now}
          timeZone={timeZone}
        >
          <div className="flex flex-col min-h-screen">
            <Navbar newsEnabled={siteSettings?.newsEnabled !== false} />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
