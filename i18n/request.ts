import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "@/i18n/routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const messages = (await import(`@/messages/${locale}.json`)).default;

  return {
    locale,
    messages,
    now: new Date(),
    timeZone: "Asia/Shanghai",
  };
});
