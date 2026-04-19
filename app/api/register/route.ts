import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generatePassCode, generateClimatePassportId } from "@/lib/utils";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";
import { normalizeSalutationValue } from "@/lib/user-form-options";
import { normalizeUserEmail, normalizeUserName } from "@/lib/user-identity";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      password,
      phone,
      country,
      title,
      salutation,
      bio,
      role = "ATTENDEE",
      organization,
      locale,
    } = body;
    const requestLocale = resolveRequestLocale(req, locale);
    const normalizedName = normalizeUserName(name || "");
    const normalizedEmail = normalizeUserEmail(email || "");
    const normalizedTitle = typeof title === "string" ? title.trim() : "";
    const normalizedCountry = typeof country === "string" ? country.trim() : "";
    const normalizedOrganizationName = typeof organization?.name === "string" ? organization.name.trim() : "";

    // Validation
    if (!normalizedName || !normalizedEmail || !password || !normalizedTitle || !normalizedCountry || !normalizedOrganizationName) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "registerRequired") },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "invalidEmailFormat") },
        { status: 400 }
      );
    }

    const SELF_REGISTER_ROLES = new Set(["ATTENDEE", "ORGANIZATION", "SPONSOR", "SPEAKER", "MEDIA"]);
    if (!SELF_REGISTER_ROLES.has(role)) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "invalidRole") },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "passwordMin") },
        { status: 400 }
      );
    }

    // Check if email or name already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "emailTaken") },
        { status: 400 }
      );
    }

    const existingNameUser = await prisma.user.findFirst({
      where: {
        name: {
          equals: normalizedName,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (existingNameUser) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "nameTaken") },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate unique pass code
    let passCode = generatePassCode();
    let existingCode = await prisma.user.findUnique({
      where: { passCode },
    });
    let passCodeAttempts = 0;
    while (existingCode) {
      if (++passCodeAttempts >= 10) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "registerFailed") },
          { status: 500 }
        );
      }
      passCode = generatePassCode();
      existingCode = await prisma.user.findUnique({
        where: { passCode },
      });
    }

    // Generate unique climate passport ID
    let climatePassportId = generateClimatePassportId();
    let existingPassport = await prisma.user.findUnique({
      where: { climatePassportId },
    });
    let passportAttempts = 0;
    while (existingPassport) {
      if (++passportAttempts >= 10) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "registerFailed") },
          { status: 500 }
        );
      }
      climatePassportId = generateClimatePassportId();
      existingPassport = await prisma.user.findUnique({
        where: { climatePassportId },
      });
    }

    // Create user with transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: normalizedName,
          email: normalizedEmail,
          password: hashedPassword,
          phone: phone || null,
          country: normalizedCountry,
          title: normalizedTitle,
          salutation: normalizeSalutationValue(salutation),
          bio: bio || null,
          role,
          passCode,
          climatePassportId,
          status: role === "ATTENDEE" ? "ACTIVE" : "PENDING",
        },
      });

      await tx.organization.create({
        data: {
          name: normalizedOrganizationName,
          industry: organization?.industry || null,
          website: organization?.website || null,
          description: organization?.description || null,
          userId: newUser.id,
        },
      });

      return newUser;
    });

    return NextResponse.json({
      success: true,
      message:
        role === "ATTENDEE"
          ? apiMessage(requestLocale, "registerSuccessLogin")
          : apiMessage(requestLocale, "registerSuccessReview"),
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    const requestLocale = resolveRequestLocale(req);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "registerFailed") },
      { status: 500 }
    );
  }
}
