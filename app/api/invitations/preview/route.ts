import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { countInvitationBodyChars, getInvitationRequestBodyCharLimit } from "@/lib/invitation-content-limits";
import { prisma } from "@/lib/prisma";
import { getInvitationTemplateSettings } from "@/lib/invitation-settings";
import {
  renderInvitationHtml,
  generateQrCodeDataUrl,
} from "@/lib/invitation-renderer";
import { buildInvitationResolvedContent } from "@/lib/invitation-template";
import { formatInvitationEventSchedule } from "@/lib/invitation-event-schedule";
import { getDefaultSignaturePreset,
  getSignaturePresetById,
} from "@/lib/invitation-signature-presets";
import { getLocalizedSalutationLabel } from "@/lib/user-form-options";

function getBaseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

/**
 * POST /api/invitations/preview
 * Render a preview of the invitation letter from unsaved form data.
 * Returns the full HTML document (text/html).
 * Any authenticated user may call this.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as {
      salutation?: string;
      guestName?: string;
      guestTitle?: string;
      guestOrg?: string;
      language?: string;
      eventId?: string;
      customMainContent?: string;
      purpose?: string;
      /** EN only: signature preset id to use for this preview */
      signaturePresetId?: string;
      /** EN only: language line text, e.g. "English and Chinese" */
      eventLanguage?: string;
      /** ZH only: show stamp at signature position */
      useStamp?: boolean;
    };

    const { salutation, guestName, guestTitle, guestOrg, language, eventId, customMainContent, purpose, signaturePresetId, eventLanguage, useStamp } = body;

    if (!guestName?.trim()) {
      return NextResponse.json(
        { success: false, error: "Guest name is required" },
        { status: 400 }
      );
    }

    const lang = language === "en" ? "en" : "zh";
    if (
      customMainContent?.trim() &&
      countInvitationBodyChars(customMainContent.trim()) > getInvitationRequestBodyCharLimit(lang, guestName, guestTitle)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: lang === "en"
            ? "Custom body content exceeds the safe character limit"
            : "自定义正文内容超出安全字数上限",
        },
        { status: 400 }
      );
    }

    type EventRow = {
      id: string;
      title: string;
      titleEn: string | null;
      startDate: Date;
      endDate: Date;
      venue: string;
      venueEn: string | null;
      startTime: string;
      endTime: string;
      eventDateSlots?: Array<{
        scheduleDate: Date;
        startTime: string;
        endTime: string;
      }>;
      invitationContentHtml_zh: string | null;
      invitationContentHtml_en: string | null;
      description: string | null;
      descriptionEn: string | null;
      shortDesc: string | null;
      shortDescEn: string | null;
    };

    let event: EventRow | null = null;
    if (eventId) {
      event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          title: true,
          titleEn: true,
          startDate: true,
          endDate: true,
          venue: true,
          venueEn: true,
          startTime: true,
          endTime: true,
          eventDateSlots: {
            select: {
              scheduleDate: true,
              startTime: true,
              endTime: true,
            },
          },
          invitationContentHtml_zh: true,
          invitationContentHtml_en: true,
          description: true,
          descriptionEn: true,
          shortDesc: true,
          shortDescEn: true,
        },
      });
    }

    const settings = await getInvitationTemplateSettings();
    const baseUrl = getBaseUrl(req);

    const eventTitle =
      lang === "en"
        ? (event?.titleEn || event?.title || "")
        : (event?.title || "");

    const { eventDateText: eventDateStr, eventTimeText: timeStr } = formatInvitationEventSchedule({
      language: lang,
      startDate: event?.startDate,
      endDate: event?.endDate,
      startTime: event?.startTime,
      endTime: event?.endTime,
      eventDateSlots: event?.eventDateSlots,
    });

    const eventVenueRaw = event
      ? lang === "en"
        ? (event.venueEn || event.venue || "")
        : (event.venue || "")
      : (lang === "en" ? "See event information on our website" : "详见网站活动信息");

    const eventDateLabel =
      lang === "en" ? `Date: ${eventDateStr}` : `日期：${eventDateStr}`;
    const eventTimeLabel =
      lang === "en" ? `Time: ${timeStr}` : `时间：${timeStr}`;
    const eventVenueLabel =
      lang === "en" ? `Venue: ${eventVenueRaw}` : `地点：${eventVenueRaw}`;

    const footerUrl = event?.id
      ? `${baseUrl}/${lang}/events/${event.id}`
      : baseUrl;

    const qrCodeDataUrl = await generateQrCodeDataUrl(footerUrl);
    const localizedSalutation = getLocalizedSalutationLabel(salutation, lang);
    const resolved = buildInvitationResolvedContent({
      settings,
      language: lang,
      vars: {
        eventTitle,
        guestName: guestName.trim(),
        salutation: localizedSalutation,
        guestTitle,
        guestOrg,
        eventDate: eventDateStr,
        eventTime: timeStr,
        eventVenue: eventVenueRaw,
        eventLanguage: eventLanguage || undefined,
        eventUrl: footerUrl,
      },
      eventBodyTemplate:
        lang === "en" ? event?.invitationContentHtml_en : event?.invitationContentHtml_zh,
      customMainContent,
    });

    // Resolve signature preset for EN invitations
    const signaturePreset =
      lang === "en"
        ? signaturePresetId
          ? await getSignaturePresetById(signaturePresetId)
          : await getDefaultSignaturePreset()
        : null;
    const isEnglish = lang === "en";

    const html = renderInvitationHtml({
      language: lang,
      secondTitle: resolved.secondTitle,
      bodyContentHtml: resolved.bodyContentHtml,
      eventInfoLabel: resolved.eventInfoLabel,
      eventDateText: resolved.eventDateText || eventDateLabel,
      eventTimeText: resolved.eventTimeText || eventTimeLabel,
      eventVenueText: resolved.eventVenueText || eventVenueLabel,
      closingText: resolved.closingText,
      greetingText: resolved.greetingText,
      signatureHtml: resolved.signatureHtml,
      footerNoteText: resolved.footerNoteText,
      footerLinkText: resolved.footerLinkText,
      qrCodeDataUrl,
      coverImageUrl:
        lang === "en" ? settings.coverImageUrl_en : settings.coverImageUrl_zh,
      bodyBgImageUrl:
        lang === "en" ? settings.bodyBgImageUrl_en : settings.bodyBgImageUrl_zh,
      backBgImageUrl:
        lang === "en" ? settings.backBgImageUrl_en : settings.backBgImageUrl_zh,
      signaturePreset,
      eventLanguageText: resolved.eventLanguageText,
      guestName: guestName.trim(),
      stampImageUrl: !isEnglish && useStamp ? (settings.stampImageUrl_zh || undefined) : undefined,
    });

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("Preview invitation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to render preview" },
      { status: 500 }
    );
  }
}
