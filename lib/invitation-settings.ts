import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const INVITATION_TEMPLATE_KEY = "invitation_template";

export type InvitationTemplateSettings = {
  coverImageUrl_zh: string;
  coverImageUrl_en: string;
  bodyBgImageUrl_zh: string;
  bodyBgImageUrl_en: string;
  backBgImageUrl_zh: string;
  backBgImageUrl_en: string;
  secondTitleTemplate_zh: string;
  secondTitleTemplate_en: string;
  bodyContentHtml_zh: string;
  bodyContentHtml_en: string;
  eventInfoLabel_zh: string;
  eventInfoLabel_en: string;
  eventDateTemplate_zh: string;
  eventDateTemplate_en: string;
  eventTimeTemplate_zh: string;
  eventTimeTemplate_en: string;
  eventVenueTemplate_zh: string;
  eventVenueTemplate_en: string;
  closingText_zh: string;
  closingText_en: string;
  greetingText_zh: string;
  greetingText_en: string;
  signatureHtml_zh: string;
  signatureHtml_en: string;
  footerNoteText_zh: string;
  footerNoteText_en: string;
  footerLinkTemplate_zh: string;
  footerLinkTemplate_en: string;
};

const DEFAULTS: InvitationTemplateSettings = {
  coverImageUrl_zh: "",
  coverImageUrl_en: "",
  bodyBgImageUrl_zh: "",
  bodyBgImageUrl_en: "",
  backBgImageUrl_zh: "",
  backBgImageUrl_en: "",
  secondTitleTemplate_zh: "上海气候周2026: {eventTitle}",
  secondTitleTemplate_en: "Shanghai Climate Week 2026: {eventTitle}",
  bodyContentHtml_zh:
    '<p class="salutation">{salutationBlock}</p>\n\n<p>全球气候治理正加速从“承诺时代”迈向“系统性行动时代”。</p>\n\n<p>在这一关键历史节点，上海气候周2026将于2026年4月20日至28日在中国上海隆重举行。本届主题为“东方既白”，旨在以东方视角与全球协同，开启气候行动的新阶段。</p>\n\n<p>我们诚挚地邀请您出席“{eventTitle}”，期待与您在上海相会。</p>',
  bodyContentHtml_en:
    '<p class="salutation">{salutationBlock}</p>\n\n<p>Global climate governance is accelerating its transition from an era of commitments to an era of systemic action.</p>\n\n<p>At this pivotal moment in history, Shanghai Climate Week 2026 will be held from April 20 to 28, 2026 in Shanghai, China. This year\'s theme, “Eastern Dawn,” reflects an Eastern perspective in fostering global climate collaboration and opening a new chapter of climate action.</p>\n\n<p>We sincerely invite you to attend "{eventTitle}" and look forward to welcoming you in Shanghai.</p>',
  eventInfoLabel_zh: "活动信息：",
  eventInfoLabel_en: "Event Information:",
  eventDateTemplate_zh: "日期：{eventDate}",
  eventDateTemplate_en: "Date: {eventDate}",
  eventTimeTemplate_zh: "时间：{eventTime}",
  eventTimeTemplate_en: "Time: {eventTime}",
  eventVenueTemplate_zh: "地点：{eventVenue}",
  eventVenueTemplate_en: "Venue: {eventVenue}",
  closingText_zh: "谨此诚邀，期待您的莅临。",
  closingText_en: "We sincerely look forward to your presence.",
  greetingText_zh: "致以问候，",
  greetingText_en: "With warm regards,",
  signatureHtml_zh: "上海气候周执行委员会<br />2026年3月",
  signatureHtml_en: "Shanghai Climate Week Executive Committee<br />March 2026",
  footerNoteText_zh: "如蒙应允出席，请通过以下网络链接或者扫描二维码确认您的讯息：",
  footerNoteText_en: "Please confirm your attendance via the link below or by scanning the QR code:",
  footerLinkTemplate_zh: "{eventUrl}",
  footerLinkTemplate_en: "{eventUrl}",
};

function normalizeSettings(raw: unknown): InvitationTemplateSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULTS };
  }
  const r = raw as Record<string, unknown>;
  const bodyContentHtml_zh =
    typeof r.bodyContentHtml_zh === "string"
      ? r.bodyContentHtml_zh
      : typeof r.mainContentHtml_zh === "string"
        ? r.mainContentHtml_zh
        : DEFAULTS.bodyContentHtml_zh;
  const bodyContentHtml_en =
    typeof r.bodyContentHtml_en === "string"
      ? r.bodyContentHtml_en
      : typeof r.mainContentHtml_en === "string"
        ? r.mainContentHtml_en
        : DEFAULTS.bodyContentHtml_en;

  const valueOf = (key: keyof InvitationTemplateSettings): string =>
    typeof r[key] === "string" ? (r[key] as string) : DEFAULTS[key];

  return {
    coverImageUrl_zh: valueOf("coverImageUrl_zh"),
    coverImageUrl_en: valueOf("coverImageUrl_en"),
    bodyBgImageUrl_zh: valueOf("bodyBgImageUrl_zh"),
    bodyBgImageUrl_en: valueOf("bodyBgImageUrl_en"),
    backBgImageUrl_zh: valueOf("backBgImageUrl_zh"),
    backBgImageUrl_en: valueOf("backBgImageUrl_en"),
    secondTitleTemplate_zh: valueOf("secondTitleTemplate_zh"),
    secondTitleTemplate_en: valueOf("secondTitleTemplate_en"),
    bodyContentHtml_zh,
    bodyContentHtml_en,
    eventInfoLabel_zh: valueOf("eventInfoLabel_zh"),
    eventInfoLabel_en: valueOf("eventInfoLabel_en"),
    eventDateTemplate_zh: valueOf("eventDateTemplate_zh"),
    eventDateTemplate_en: valueOf("eventDateTemplate_en"),
    eventTimeTemplate_zh: valueOf("eventTimeTemplate_zh"),
    eventTimeTemplate_en: valueOf("eventTimeTemplate_en"),
    eventVenueTemplate_zh: valueOf("eventVenueTemplate_zh"),
    eventVenueTemplate_en: valueOf("eventVenueTemplate_en"),
    closingText_zh: valueOf("closingText_zh"),
    closingText_en: valueOf("closingText_en"),
    greetingText_zh: valueOf("greetingText_zh"),
    greetingText_en: valueOf("greetingText_en"),
    signatureHtml_zh: valueOf("signatureHtml_zh"),
    signatureHtml_en: valueOf("signatureHtml_en"),
    footerNoteText_zh: valueOf("footerNoteText_zh"),
    footerNoteText_en: valueOf("footerNoteText_en"),
    footerLinkTemplate_zh: valueOf("footerLinkTemplate_zh"),
    footerLinkTemplate_en: valueOf("footerLinkTemplate_en"),
  };
}

export async function getInvitationTemplateSettings(): Promise<InvitationTemplateSettings> {
  const content = await prisma.siteContent.findUnique({
    where: { key: INVITATION_TEMPLATE_KEY },
  });
  return normalizeSettings(content?.extra);
}

export async function updateInvitationTemplateSettings(
  input: Partial<InvitationTemplateSettings>
): Promise<InvitationTemplateSettings> {
  const existing = await getInvitationTemplateSettings();
  const next: InvitationTemplateSettings = { ...existing };

  const fields = Object.keys(DEFAULTS) as (keyof InvitationTemplateSettings)[];
  for (const field of fields) {
    if (input[field] !== undefined && typeof input[field] === "string") {
      next[field] = input[field] as string;
    }
  }

  await prisma.siteContent.upsert({
    where: { key: INVITATION_TEMPLATE_KEY },
    create: {
      key: INVITATION_TEMPLATE_KEY,
      title: "邀请函模板配置",
      titleEn: "Invitation Template Settings",
      description: "邀请函三页图片和第2页文案模板配置",
      descriptionEn: "Configuration for invitation letter images and page 2 content templates",
      extra: next as unknown as Prisma.InputJsonValue,
    },
    update: {
      extra: next as unknown as Prisma.InputJsonValue,
    },
  });

  return next;
}
