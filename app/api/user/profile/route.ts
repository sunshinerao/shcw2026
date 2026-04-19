import { NextRequest, NextResponse } from "next/server";
import { verifyAuthDev } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";
import { normalizeSalutationValue } from "@/lib/user-form-options";

export const dynamic = "force-dynamic";

function getMissingRequiredFields(input: {
  name?: string | null;
  title?: string | null;
  country?: string | null;
  organizationName?: string | null;
}) {
  const missing: string[] = [];

  if (!input.name?.trim()) missing.push("name");
  if (!input.title?.trim()) missing.push("title");
  if (!input.country?.trim()) missing.push("country");
  if (!input.organizationName?.trim()) missing.push("organizationName");

  return missing;
}

// GET: 获取当前用户资料
export async function GET(req: NextRequest) {
  try {
    const requestLocale = resolveRequestLocale(req);
    const auth = await verifyAuthDev(req);
    
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "unauthorized") },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        phone: true,
        title: true,
        bio: true,
        salutation: true,
        country: true,
        role: true,
        status: true,
        passCode: true,
        climatePassportId: true,
        points: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            logo: true,
            website: true,
            description: true,
            industry: true,
            size: true,
            contactName: true,
            contactEmail: true,
            contactPhone: true,
          },
        },
        _count: {
          select: {
            registrations: true,
            checkins: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "userNotFound") },
        { status: 404 }
      );
    }

    const missingRequiredFields = getMissingRequiredFields({
      name: user.name,
      title: user.title,
      country: user.country,
      organizationName: user.organization?.name,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        profileComplete: missingRequiredFields.length === 0,
        missingRequiredFields,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    const requestLocale = resolveRequestLocale(req);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "profileFetchFailed") },
      { status: 500 }
    );
  }
}

// PUT: 更新用户资料
export async function PUT(req: NextRequest) {
  try {
    const requestLocale = resolveRequestLocale(req);
    const auth = await verifyAuthDev(req);
    
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "unauthorized") },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, phone, title, bio, avatar, salutation, country, organization } = body;

    const existingUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        name: true,
        title: true,
        country: true,
        organization: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "userNotFound") },
        { status: 404 }
      );
    }

    if (name !== undefined && name.trim() === "") {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "nameRequired") },
        { status: 400 }
      );
    }

    const nextName = name !== undefined ? String(name).trim() : existingUser.name?.trim() || "";
    const nextTitle = title !== undefined ? String(title).trim() : existingUser.title?.trim() || "";
    const nextCountry = country !== undefined ? String(country).trim() : existingUser.country?.trim() || "";
    const nextOrganizationName = organization && typeof organization === "object" && "name" in organization
      ? String(organization.name || "").trim()
      : existingUser.organization?.name?.trim() || "";

    const missingRequiredFields = getMissingRequiredFields({
      name: nextName,
      title: nextTitle,
      country: nextCountry,
      organizationName: nextOrganizationName,
    });

    if (missingRequiredFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: apiMessage(requestLocale, "registerRequired"),
          missingRequiredFields,
        },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: auth.userId },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(phone !== undefined && { phone: phone || null }),
          ...(title !== undefined && { title: title?.trim() || null }),
          ...(bio !== undefined && { bio: bio || null }),
          ...(avatar !== undefined && { avatar: avatar || null }),
          ...(salutation !== undefined && { salutation: normalizeSalutationValue(salutation) }),
          ...(country !== undefined && { country: country?.trim() || null }),
        },
      });

      // Update or create organization if provided
      if (organization) {
        const existingOrg = await tx.organization.findUnique({
          where: { userId: auth.userId },
        });

        if (existingOrg) {
          await tx.organization.update({
            where: { userId: auth.userId },
            data: {
              ...(organization.name !== undefined && { name: String(organization.name || "").trim() }),
              ...(organization.industry !== undefined && { industry: organization.industry || null }),
              ...(organization.website !== undefined && { website: organization.website || null }),
              ...(organization.description !== undefined && { description: organization.description || null }),
            },
          });
        } else if (organization.name) {
          await tx.organization.create({
            data: {
              name: String(organization.name || "").trim(),
              industry: organization.industry || null,
              website: organization.website || null,
              description: organization.description || null,
              userId: auth.userId,
            },
          });
        }
      }

      return user;
    });

    const userWithOrg = await prisma.user.findUnique({
      where: { id: updatedUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        phone: true,
        title: true,
        bio: true,
        salutation: true,
        country: true,
        role: true,
        status: true,
        passCode: true,
        climatePassportId: true,
        points: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            logo: true,
            website: true,
            description: true,
            industry: true,
            size: true,
            contactName: true,
            contactEmail: true,
            contactPhone: true,
          },
        },
      },
    });

    const nextMissingRequiredFields = getMissingRequiredFields({
      name: userWithOrg?.name,
      title: userWithOrg?.title,
      country: userWithOrg?.country,
      organizationName: userWithOrg?.organization?.name,
    });

    return NextResponse.json({
      success: true,
      message: apiMessage(requestLocale, "profileUpdateSuccess"),
      data: {
        ...userWithOrg,
        profileComplete: nextMissingRequiredFields.length === 0,
        missingRequiredFields: nextMissingRequiredFields,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    const requestLocale = resolveRequestLocale(req);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "profileUpdateFailed") },
      { status: 500 }
    );
  }
}
