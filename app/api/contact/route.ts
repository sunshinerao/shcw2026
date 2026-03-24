import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";
import { ContactCategory } from "@prisma/client";

// Map frontend inquiry types to Prisma ContactCategory enum
const CATEGORY_MAP: Record<string, ContactCategory> = {
  general: "GENERAL",
  partnership: "PARTNERSHIP",
  speaker: "SPEAKER",
  media: "MEDIA",
  sponsor: "SPONSOR",
  volunteer: "VOLUNTEER",
  other: "OTHER",
};

export async function POST(req: NextRequest) {
  const locale = resolveRequestLocale(req);

  try {
    const body = await req.json();
    const {
      inquiryType,
      name,
      email,
      subject,
      message,
      // optional sub-form fields
      organizationName,
      organizationType,
      partnershipTier,
      website,
      speakerTitle,
      speakerOrganization,
      topic,
      experience,
      outlet,
      mediaType,
      mediaRole,
      pressCard,
    } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { success: false, error: apiMessage(locale, "contactRequired") },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: apiMessage(locale, "invalidEmailRequired") },
        { status: 400 }
      );
    }

    const category = CATEGORY_MAP[inquiryType || "general"];
    if (!category) {
      return NextResponse.json(
        { success: false, error: apiMessage(locale, "contactInvalidCategory") },
        { status: 400 }
      );
    }

    // Build metadata object for sub-form fields
    const metadata: Record<string, string> = {};
    if (category === "PARTNERSHIP") {
      if (organizationName) metadata.organizationName = organizationName;
      if (organizationType) metadata.organizationType = organizationType;
      if (partnershipTier) metadata.partnershipTier = partnershipTier;
      if (website) metadata.website = website;
    } else if (category === "SPEAKER") {
      if (speakerTitle) metadata.speakerTitle = speakerTitle;
      if (speakerOrganization) metadata.organization = speakerOrganization;
      if (topic) metadata.topic = topic;
      if (experience) metadata.experience = experience;
    } else if (category === "MEDIA") {
      if (outlet) metadata.outlet = outlet;
      if (mediaType) metadata.mediaType = mediaType;
      if (mediaRole) metadata.role = mediaRole;
      if (pressCard) metadata.pressCard = pressCard;
    }

    const organization =
      organizationName || speakerOrganization || outlet || undefined;

    // Link message to logged-in user if available
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || undefined;

    await prisma.contactMessage.create({
      data: {
        name,
        email,
        organization,
        category,
        subject,
        message,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: apiMessage(locale, "contactSuccess"),
    });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(locale, "contactFailed") },
      { status: 500 }
    );
  }
}
