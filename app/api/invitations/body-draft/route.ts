import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInvitationTemplateSettings } from "@/lib/invitation-settings";
import { buildInvitationBodyDraft } from "@/lib/invitation-template";
import { getLocalizedSalutationLabel } from "@/lib/user-form-options";

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
    };

    const lang = body.language === "en" ? "en" : "zh";
    const event = body.eventId
      ? await prisma.event.findUnique({
          where: { id: body.eventId },
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
        })
      : null;

    const settings = await getInvitationTemplateSettings();
    const eventTitle = lang === "en" ? event?.titleEn || event?.title || "" : event?.title || "";
    const eventDate = event?.startDate
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
    const eventTime = event?.startTime && event?.endTime
      ? `${event.startTime} – ${event.endTime}`
      : event?.startTime || "";
    const eventVenue = lang === "en" ? event?.venueEn || event?.venue || "" : event?.venue || "";
    const salutation = getLocalizedSalutationLabel(body.salutation, lang);

    const draft = buildInvitationBodyDraft({
      settings,
      language: lang,
      vars: {
        eventTitle,
        guestName: body.guestName?.trim() || "",
        salutation,
        guestTitle: body.guestTitle,
        guestOrg: body.guestOrg,
        eventDate,
        eventTime,
        eventVenue,
        eventUrl: event?.id ? `/${lang}/events/${event.id}` : "",
      },
      eventBodyTemplate:
        lang === "en" ? event?.invitationContentHtml_en : event?.invitationContentHtml_zh,
    });

    return NextResponse.json({
      success: true,
      data: {
        draftText: draft.text,
        draftHtml: draft.html,
        source: draft.source,
      },
    });
  } catch (error) {
    console.error("Generate invitation body draft error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate invitation body draft" },
      { status: 500 }
    );
  }
}