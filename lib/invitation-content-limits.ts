export type InvitationLimitLanguage = "zh" | "en";

export const INVITATION_BODY_CHAR_LIMITS: Record<InvitationLimitLanguage, number> = {
  zh: 560,
  en: 2000,
};

const TEMPLATE_PLACEHOLDER_SAMPLES: Record<InvitationLimitLanguage, Record<string, string>> = {
  zh: {
    eventTitle: "上海气候周2026亚太水安全创新协作年会",
    guestName: "张三",
    salutation: "先生",
    guestTitle: "副总裁",
    guestOrg: "全球气候创新中心",
    guestTitleAndOrg: "副总裁，全球气候创新中心",
    eventDate: "2026年4月21日（星期二）",
    eventTime: "09:00 AM – 18:00 PM",
    eventVenue: "上海海上世界木棉花酒店",
    eventUrl: "https://shcw2026.shanghaiclimateweek.org.cn/zh/events/example",
    salutationBlock: "尊敬的张三先生，",
  },
  en: {
    eventTitle: "Asia-Pacific Water Security Innovation Collaboration Annual Conference",
    guestName: "John Smith",
    salutation: "Mr.",
    guestTitle: "Senior Advisor",
    guestOrg: "Global Climate Innovation Center",
    guestTitleAndOrg: "Senior Advisor, Global Climate Innovation Center",
    eventDate: "April 21, 2026",
    eventTime: "09:00 AM – 06:00 PM",
    eventVenue: "Kapok Hotel at Shanghai Maritime World",
    eventUrl: "https://shcw2026.shanghaiclimateweek.org.cn/en/events/example",
    salutationBlock: "Dear Mr. John Smith,\nSenior Advisor, Global Climate Innovation Center",
  },
};

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function stripHtmlToText(value: string): string {
  const normalized = value
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<\/div>\s*<div[^>]*>/gi, "\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<div[^>]*>/gi, "")
    .replace(/<\/p>/gi, "")
    .replace(/<\/div>/gi, "")
    .replace(/<[^>]+>/g, "");

  return decodeHtml(normalized).replace(/\r\n/g, "\n").trim();
}

export function getInvitationBodyCharLimit(language: InvitationLimitLanguage): number {
  return INVITATION_BODY_CHAR_LIMITS[language];
}

export function getInvitationRequestBodyCharLimit(
  language: InvitationLimitLanguage,
  guestName?: string | null,
  guestTitle?: string | null
): number {
  if (language === "en") {
    return getInvitationBodyCharLimit("en")
      + (guestName?.trim().length || 0)
      + (guestTitle?.trim().length || 0);
  }

  return getInvitationBodyCharLimit("zh") + (guestName?.trim().length || 0);
}

export function countInvitationBodyChars(value: string): number {
  return value.replace(/\r\n/g, "\n").length;
}

export function estimateInvitationTemplateVisibleChars(
  template: string,
  language: InvitationLimitLanguage
): number {
  const samples = TEMPLATE_PLACEHOLDER_SAMPLES[language];
  let rendered = template;

  for (const [key, sample] of Object.entries(samples)) {
    rendered = rendered.replaceAll(`{${key}}`, sample);
  }

  return countInvitationBodyChars(stripHtmlToText(rendered));
}