import type { InvitationTemplateSettings } from "@/lib/invitation-settings";

export type InvitationTemplateLanguage = "zh" | "en";
export type InvitationBodySource = "global" | "event" | "custom";

export type InvitationTemplateVariables = {
  eventTitle: string;
  guestName: string;
  salutation?: string | null;
  guestTitle?: string | null;
  guestOrg?: string | null;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
  eventLanguage?: string | null;
  eventUrl: string;
};

export type InvitationResolvedContent = {
  secondTitle: string;
  bodyContentHtml: string;
  eventInfoLabel: string;
  eventDateText: string;
  eventTimeText: string;
  eventVenueText: string;
  /** EN-only: language line, e.g. "Language: English and Chinese" */
  eventLanguageText?: string;
  closingText: string;
  greetingText: string;
  signatureHtml: string;
  footerNoteText: string;
  footerLinkText: string;
  bodySource: InvitationBodySource;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function getLocalizedSetting(
  settings: InvitationTemplateSettings,
  fieldBase:
    | "secondTitleTemplate"
    | "bodyContentHtml"
    | "eventInfoLabel"
    | "eventDateTemplate"
    | "eventTimeTemplate"
    | "eventVenueTemplate"
    | "closingText"
    | "greetingText"
    | "signatureHtml"
    | "footerNoteText"
    | "footerLinkTemplate",
  language: InvitationTemplateLanguage
): string {
  return settings[`${fieldBase}_${language}` as keyof InvitationTemplateSettings] as string;
}

function buildGuestTitleOrg(language: InvitationTemplateLanguage, vars: InvitationTemplateVariables): string {
  const parts = [vars.guestTitle?.trim(), vars.guestOrg?.trim()].filter(Boolean) as string[];
  if (parts.length === 0) {
    return "";
  }

  return language === "en" ? parts.join(", ") : parts.join("，");
}

function buildSalutationBlock(language: InvitationTemplateLanguage, vars: InvitationTemplateVariables): string {
  const guestName = vars.guestName.trim();
  const salutation = vars.salutation?.trim() || "";
  const detailLine = buildGuestTitleOrg(language, vars);
  const firstLine = language === "en"
    ? `Dear ${[salutation, guestName].filter(Boolean).join(" ")},`
    : `尊敬的${guestName}${salutation}，`;

  const firstLineHtml = escapeHtml(firstLine);
  if (language === "zh" || !detailLine) {
    return firstLineHtml;
  }

  return `<strong>${firstLineHtml}</strong><br /><strong>${escapeHtml(detailLine)}</strong>`;
}

function templateContainsGuestBlock(template: string): boolean {
  return [
    "{salutationBlock}",
    "{guestName}",
    "{salutation}",
    "{guestTitle}",
    "{guestOrg}",
    "{guestTitleAndOrg}",
  ].some((token) => template.includes(token));
}

function ensureBodyTemplateHasGuestBlock(
  template: string,
  language: InvitationTemplateLanguage,
  vars: InvitationTemplateVariables
): string {
  if (templateContainsGuestBlock(template)) {
    return template;
  }

  if (language === "en") {
    return `<p class="salutation">{salutationBlock}</p>\n\n${template}`;
  }

  return `<p class="salutation">{salutationBlock}</p>\n\n${template}`;
}

export function applyInvitationTemplate(
  template: string,
  language: InvitationTemplateLanguage,
  vars: InvitationTemplateVariables
): string {
  const textVars: Record<string, string> = {
    eventTitle: vars.eventTitle,
    guestName: vars.guestName,
    salutation: vars.salutation?.trim() || "",
    guestTitle: vars.guestTitle?.trim() || "",
    guestOrg: vars.guestOrg?.trim() || "",
    guestTitleAndOrg: buildGuestTitleOrg(language, vars),
    eventDate: vars.eventDate,
    eventTime: vars.eventTime,
    eventVenue: vars.eventVenue,
    eventUrl: vars.eventUrl,
    eventLanguage: vars.eventLanguage ?? "",
  };

  let result = template.replaceAll("{salutationBlock}", buildSalutationBlock(language, vars));
  for (const [key, value] of Object.entries(textVars)) {
    result = result.replaceAll(`{${key}}`, escapeHtml(value));
  }
  return result;
}

function applyInvitationTextTemplate(
  template: string,
  language: InvitationTemplateLanguage,
  vars: InvitationTemplateVariables
): string {
  const textVars: Record<string, string> = {
    eventTitle: vars.eventTitle,
    guestName: vars.guestName,
    salutation: vars.salutation?.trim() || "",
    guestTitle: vars.guestTitle?.trim() || "",
    guestOrg: vars.guestOrg?.trim() || "",
    guestTitleAndOrg: buildGuestTitleOrg(language, vars),
    eventDate: vars.eventDate,
    eventTime: vars.eventTime,
    eventVenue: vars.eventVenue,
    eventUrl: vars.eventUrl,
    eventLanguage: vars.eventLanguage ?? "",
  };

  let result = template.replaceAll("{salutationBlock}", invitationHtmlToPlainText(buildSalutationBlock(language, vars)));
  for (const [key, value] of Object.entries(textVars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

export function invitationPlainTextToHtml(text: string): string {
  const paragraphs = text
    .trim()
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs
    .map((paragraph, index) => {
      const className = index === 0 ? ' class="salutation"' : "";
      return `<p${className}>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`;
    })
    .join("\n");
}

export function invitationHtmlToPlainText(html: string): string {
  const normalized = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<\/div>\s*<div[^>]*>/gi, "\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<div[^>]*>/gi, "")
    .replace(/<\/p>/gi, "")
    .replace(/<\/div>/gi, "")
    .replace(/<[^>]+>/g, "");

  return decodeHtml(normalized)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getEffectiveBodyTemplate(
  settings: InvitationTemplateSettings,
  language: InvitationTemplateLanguage,
  eventBodyTemplate?: string | null
): { template: string; source: Exclude<InvitationBodySource, "custom"> } {
  if (eventBodyTemplate?.trim()) {
    return { template: eventBodyTemplate.trim(), source: "event" };
  }

  return {
    template: getLocalizedSetting(settings, "bodyContentHtml", language),
    source: "global",
  };
}

export function buildInvitationResolvedContent(params: {
  settings: InvitationTemplateSettings;
  language: InvitationTemplateLanguage;
  vars: InvitationTemplateVariables;
  eventBodyTemplate?: string | null;
  customMainContent?: string | null;
}): InvitationResolvedContent {
  const { settings, language, vars, eventBodyTemplate, customMainContent } = params;
  const effectiveBody = getEffectiveBodyTemplate(settings, language, eventBodyTemplate);
  const normalizedBodyTemplate = ensureBodyTemplateHasGuestBlock(effectiveBody.template, language, vars);
  const bodyContentHtml = customMainContent?.trim()
    ? invitationPlainTextToHtml(customMainContent)
    : applyInvitationTemplate(normalizedBodyTemplate, language, vars);

  return {
    secondTitle: applyInvitationTextTemplate(
      getLocalizedSetting(settings, "secondTitleTemplate", language),
      language,
      vars
    ),
    bodyContentHtml,
    eventInfoLabel: applyInvitationTextTemplate(
      getLocalizedSetting(settings, "eventInfoLabel", language),
      language,
      vars
    ),
    eventDateText: applyInvitationTextTemplate(
      getLocalizedSetting(settings, "eventDateTemplate", language),
      language,
      vars
    ),
    eventTimeText: applyInvitationTextTemplate(
      getLocalizedSetting(settings, "eventTimeTemplate", language),
      language,
      vars
    ),
    eventVenueText: applyInvitationTextTemplate(
      getLocalizedSetting(settings, "eventVenueTemplate", language),
      language,
      vars
    ),
    eventLanguageText: language === "en" && vars.eventLanguage
      ? applyInvitationTextTemplate(
          settings.eventLanguageTemplate_en,
          language,
          vars
        )
      : undefined,
    closingText: applyInvitationTextTemplate(
      getLocalizedSetting(settings, "closingText", language),
      language,
      vars
    ),
    greetingText: applyInvitationTextTemplate(
      getLocalizedSetting(settings, "greetingText", language),
      language,
      vars
    ),
    signatureHtml: applyInvitationTemplate(
      getLocalizedSetting(settings, "signatureHtml", language),
      language,
      vars
    ),
    footerNoteText: applyInvitationTextTemplate(
      getLocalizedSetting(settings, "footerNoteText", language),
      language,
      vars
    ),
    footerLinkText: applyInvitationTextTemplate(
      getLocalizedSetting(settings, "footerLinkTemplate", language),
      language,
      vars
    ),
    bodySource: customMainContent?.trim() ? "custom" : effectiveBody.source,
  };
}

export function buildInvitationBodyDraft(params: {
  settings: InvitationTemplateSettings;
  language: InvitationTemplateLanguage;
  vars: InvitationTemplateVariables;
  eventBodyTemplate?: string | null;
}) {
  const { settings, language, vars, eventBodyTemplate } = params;
  const effectiveBody = getEffectiveBodyTemplate(settings, language, eventBodyTemplate);
  const normalizedBodyTemplate = ensureBodyTemplateHasGuestBlock(effectiveBody.template, language, vars);
  const renderedHtml = applyInvitationTemplate(normalizedBodyTemplate, language, vars);

  return {
    source: effectiveBody.source,
    text: invitationHtmlToPlainText(renderedHtml),
  };
}