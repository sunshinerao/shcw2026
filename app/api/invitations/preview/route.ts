import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInvitationTemplateSettings } from "@/lib/invitation-settings";
import {
  renderInvitationHtml,
  generateQrCodeDataUrl,
  applyMainContentPlaceholders,
} from "@/lib/invitation-renderer";

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
      language?: string;
      eventId?: string;
    };

    const { salutation, guestName, language, eventId } = body;

    if (!guestName?.trim()) {
      return NextResponse.json(
        { success: false, error: "Guest name is required" },
        { status: 400 }
      );
    }

    const lang = language === "en" ? "en" : "zh";

    type EventRow = {
      id: string;
      title: string;
      titleEn: string | null;
      startDate: Date;
      venue: string;
      venueEn: string | null;
      startTime: string;
      endTime: string;
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
          venue: true,
          venueEn: true,
          startTime: true,
          endTime: true,
        },
      });
    }

    const settings = await getInvitationTemplateSettings();
    const baseUrl = getBaseUrl(req);

    const honoredGuestName =
      [salutation?.trim(), guestName.trim()].filter(Boolean).join(" ") + "：";

    const eventTitle =
      lang === "en"
        ? (event?.titleEn || event?.title || "")
        : (event?.title || "");

    const eventDateStr = event?.startDate
      ? lang === "en"
        ? new Date(event.startDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : new Date(event.startDate).toLocaleDateString("zh-CN", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
      : "";

    const eventVenueRaw =
      lang === "en"
        ? (event?.venueEn || event?.venue || "")
        : (event?.venue || "");

    const timeStr =
      event?.startTime && event?.endTime
        ? `${event.startTime} \u2013 ${event.endTime}`
        : (event?.startTime || "");

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

    const rawMainContent =
      lang === "en" ? settings.mainContentHtml_en : settings.mainContentHtml_zh;

    const mainContentHtml = applyMainContentPlaceholders(rawMainContent, {
      eventTitle,
      guestName: guestName.trim(),
      eventDate: eventDateStr,
    });

    const html = renderInvitationHtml({
      language: lang,
      secondTitle: eventTitle,
      honoredGuestName,
      mainContentHtml,
      eventDate: eventDateLabel,
      eventTime: eventTimeLabel,
      eventVenue: eventVenueLabel,
      footerUrl,
      qrCodeDataUrl,
      coverImageUrl:
        lang === "en" ? settings.coverImageUrl_en : settings.coverImageUrl_zh,
      bodyBgImageUrl:
        lang === "en" ? settings.bodyBgImageUrl_en : settings.bodyBgImageUrl_zh,
      backBgImageUrl:
        lang === "en" ? settings.backBgImageUrl_en : settings.backBgImageUrl_zh,
      backLogoImageUrl:
        lang === "en" ? settings.backLogoImageUrl_en : settings.backLogoImageUrl_zh,
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
