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
  backLogoImageUrl_zh: string;
  backLogoImageUrl_en: string;
  mainContentHtml_zh: string;
  mainContentHtml_en: string;
};

const DEFAULTS: InvitationTemplateSettings = {
  coverImageUrl_zh: "",
  coverImageUrl_en: "",
  bodyBgImageUrl_zh: "",
  bodyBgImageUrl_en: "",
  backBgImageUrl_zh: "",
  backBgImageUrl_en: "",
  backLogoImageUrl_zh: "",
  backLogoImageUrl_en: "",
  mainContentHtml_zh: "",
  mainContentHtml_en: "",
};

function normalizeSettings(raw: unknown): InvitationTemplateSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULTS };
  }
  const r = raw as Record<string, unknown>;
  return {
    coverImageUrl_zh: typeof r.coverImageUrl_zh === "string" ? r.coverImageUrl_zh : "",
    coverImageUrl_en: typeof r.coverImageUrl_en === "string" ? r.coverImageUrl_en : "",
    bodyBgImageUrl_zh: typeof r.bodyBgImageUrl_zh === "string" ? r.bodyBgImageUrl_zh : "",
    bodyBgImageUrl_en: typeof r.bodyBgImageUrl_en === "string" ? r.bodyBgImageUrl_en : "",
    backBgImageUrl_zh: typeof r.backBgImageUrl_zh === "string" ? r.backBgImageUrl_zh : "",
    backBgImageUrl_en: typeof r.backBgImageUrl_en === "string" ? r.backBgImageUrl_en : "",
    backLogoImageUrl_zh: typeof r.backLogoImageUrl_zh === "string" ? r.backLogoImageUrl_zh : "",
    backLogoImageUrl_en: typeof r.backLogoImageUrl_en === "string" ? r.backLogoImageUrl_en : "",
    mainContentHtml_zh: typeof r.mainContentHtml_zh === "string" ? r.mainContentHtml_zh : "",
    mainContentHtml_en: typeof r.mainContentHtml_en === "string" ? r.mainContentHtml_en : "",
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
      description: "邀请函三页图片和正文内容模板配置",
      descriptionEn: "Configuration for invitation letter template images and body content",
      extra: next as unknown as Prisma.InputJsonValue,
    },
    update: {
      extra: next as unknown as Prisma.InputJsonValue,
    },
  });

  return next;
}
