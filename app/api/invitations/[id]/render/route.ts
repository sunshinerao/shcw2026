import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageEvents } from "@/lib/permissions";
import { getInvitationTemplateSettings } from "@/lib/invitation-settings";
import {
  renderInvitationHtml,
  generateQrCodeDataUrl,
} from "@/lib/invitation-renderer";
import { buildInvitationResolvedContent } from "@/lib/invitation-template";
import {
  getDefaultSignaturePreset,
  getSignaturePresetById,
} from "@/lib/invitation-signature-presets";
import { getLocalizedSalutationLabel } from "@/lib/user-form-options";

function getBaseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "localhost:3000";
  return `${proto}://${host}`;
}

/**
 * GET /api/invitations/[id]/render
 * Render the invitation letter for a saved InvitationRequest.
 * Returns the full HTML document (text/html).
 * Accessible by the invitation owner or any admin/event-manager.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });
    if (!currentUser) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const invitation = await prisma.invitationRequest.findUnique({
      where: { id: params.id },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            titleEn: true,
            startDate: true,
            venue: true,
            venueEn: true,
            startTime: true,
            endTime: true,
            invitationContentHtml_zh: true,
            invitationContentHtml_en: true,
          },
        },
      },
    });

    if (!invitation) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const isManager = canManageEvents(currentUser.role);
    const isOwner = invitation.userId === currentUser.id;

    if (!isManager && !isOwner) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const settings = await getInvitationTemplateSettings();
    const baseUrl = getBaseUrl(req);
    const lang = invitation.language === "en" ? "en" : "zh";
    const event = invitation.event;

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
    const localizedSalutation = getLocalizedSalutationLabel(invitation.salutation, lang);
    const resolved = buildInvitationResolvedContent({
      settings,
      language: lang,
      vars: {
        eventTitle,
        guestName: invitation.guestName.trim(),
        salutation: localizedSalutation,
        guestTitle: invitation.guestTitle,
        guestOrg: invitation.guestOrg,
        eventDate: eventDateStr,
        eventTime: timeStr,
        eventVenue: eventVenueRaw,
        eventUrl: footerUrl,
      },
      eventBodyTemplate:
        lang === "en" ? event?.invitationContentHtml_en : event?.invitationContentHtml_zh,
      customMainContent: invitation.customMainContent,
    });

    // Resolve signature preset for EN invitations
    // ?presetId= query param overrides; falls back to the configured default.
    const presetIdParam = req.nextUrl.searchParams.get("presetId");
    const signaturePreset =
      lang === "en"
        ? presetIdParam
          ? await getSignaturePresetById(presetIdParam)
          : await getDefaultSignaturePreset()
        : null;

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
    });

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("Render invitation error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
