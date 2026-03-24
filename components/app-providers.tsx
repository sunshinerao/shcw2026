"use client";

import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "sonner";
import { SessionProvider } from "@/components/session-provider";

export function AppProviders({
  children,
  locale,
  messages,
  now,
  timeZone,
}: {
  children: React.ReactNode;
  locale: string;
  messages: Record<string, unknown>;
  now: Date;
  timeZone: string;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      now={now}
      timeZone={timeZone}
    >
      <SessionProvider>
        {children}
        <Toaster position="top-right" richColors />
      </SessionProvider>
    </NextIntlClientProvider>
  );
}