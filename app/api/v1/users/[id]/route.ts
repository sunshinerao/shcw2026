import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma, UserRole, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/openclaw-auth";
import { normalizeUserEmail, normalizeUserName } from "@/lib/user-identity";

const USER_DETAIL_SELECT = {
  id: true,
  email: true,
  name: true,
  avatar: true,
  phone: true,
  title: true,
  bio: true,
  salutation: true,
  role: true,
  status: true,
  staffPermissions: true,
  climatePassportId: true,
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
  registrations: {
    select: {
      id: true,
      status: true,
      createdAt: true,
      event: {
        select: {
          id: true,
          title: true,
          titleEn: true,
          startDate: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  },
} satisfies Prisma.UserSelect;

function parseStaffPermissions(value: string | null): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

function serializeUser<T extends { staffPermissions: string | null }>(user: T) {
  return {
    ...user,
    staffPermissions: parseStaffPermissions(user.staffPermissions),
  };
}

function toNullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyApiKey(req, "users:read");
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: USER_DETAIL_SELECT,
  });

  if (!user) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: serializeUser(user) });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyApiKey(req, "users:write");
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "Request body must be valid JSON" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const userId = params.id;

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!targetUser) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  const normalizedName =
    payload.name !== undefined
      ? normalizeUserName(typeof payload.name === "string" ? payload.name : "")
      : undefined;
  const normalizedEmail =
    payload.email !== undefined
      ? normalizeUserEmail(typeof payload.email === "string" ? payload.email : "")
      : undefined;

  if (payload.name !== undefined && !normalizedName) {
    return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });
  }

  if (payload.email !== undefined && !normalizedEmail) {
    return NextResponse.json({ success: false, error: "email format is invalid" }, { status: 400 });
  }

  if (normalizedEmail && normalizedEmail !== targetUser.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ success: false, error: "email format is invalid" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser && existingUser.id !== userId) {
      return NextResponse.json({ success: false, error: "email is already in use" }, { status: 409 });
    }
  }

  if (normalizedName && normalizedName !== targetUser.name) {
    const existingNameUser = await prisma.user.findFirst({
      where: {
        id: { not: userId },
        name: {
          equals: normalizedName,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (existingNameUser) {
      return NextResponse.json({ success: false, error: "name is already in use" }, { status: 409 });
    }
  }

  if (payload.role !== undefined && !Object.values(UserRole).includes(payload.role as UserRole)) {
    return NextResponse.json({ success: false, error: "role is invalid" }, { status: 400 });
  }

  if (payload.status !== undefined && !Object.values(UserStatus).includes(payload.status as UserStatus)) {
    return NextResponse.json({ success: false, error: "status is invalid" }, { status: 400 });
  }

  let hashedPassword: string | undefined;
  if (payload.password !== undefined) {
    if (typeof payload.password !== "string" || payload.password.length < 8) {
      return NextResponse.json(
        { success: false, error: "password must be at least 8 characters" },
        { status: 400 }
      );
    }

    hashedPassword = await bcrypt.hash(payload.password, 12);
  }

  const rawStaffPermissions = Array.isArray(payload.staffPermissions)
    ? payload.staffPermissions.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : undefined;
  const organization = payload.organization as Record<string, unknown> | undefined;

  const updatedUser = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        ...(normalizedName !== undefined && { name: normalizedName }),
        ...(normalizedEmail !== undefined && { email: normalizedEmail }),
        ...(payload.phone !== undefined && { phone: toNullableString(payload.phone) }),
        ...(payload.title !== undefined && { title: toNullableString(payload.title) }),
        ...(payload.bio !== undefined && { bio: toNullableString(payload.bio) }),
        ...(payload.salutation !== undefined && { salutation: toNullableString(payload.salutation) }),
        ...(payload.role !== undefined && { role: payload.role as UserRole }),
        ...(payload.status !== undefined && { status: payload.status as UserStatus }),
        ...(payload.avatar !== undefined && { avatar: toNullableString(payload.avatar) }),
        ...(hashedPassword && { password: hashedPassword }),
        ...(rawStaffPermissions !== undefined && {
          staffPermissions:
            (payload.role as UserRole | undefined) === UserRole.ADMIN
              ? null
              : rawStaffPermissions.length > 0
                ? JSON.stringify(rawStaffPermissions)
                : null,
        }),
      },
    });

    if (organization && typeof organization === "object") {
      const existingOrganization = await tx.organization.findUnique({ where: { userId } });
      const organizationName = toNullableString(organization.name);

      if (existingOrganization) {
        await tx.organization.update({
          where: { userId },
          data: {
            ...(organization.name !== undefined && { name: organizationName ?? existingOrganization.name }),
            ...(organization.logo !== undefined && { logo: toNullableString(organization.logo) ?? null }),
            ...(organization.website !== undefined && { website: toNullableString(organization.website) ?? null }),
            ...(organization.description !== undefined && { description: toNullableString(organization.description) ?? null }),
            ...(organization.industry !== undefined && { industry: toNullableString(organization.industry) ?? null }),
            ...(organization.size !== undefined && { size: toNullableString(organization.size) ?? null }),
            ...(organization.contactName !== undefined && { contactName: toNullableString(organization.contactName) ?? null }),
            ...(organization.contactEmail !== undefined && { contactEmail: toNullableString(organization.contactEmail) ?? null }),
            ...(organization.contactPhone !== undefined && { contactPhone: toNullableString(organization.contactPhone) ?? null }),
          },
        });
      } else if (organizationName) {
        await tx.organization.create({
          data: {
            userId,
            name: organizationName,
            logo: toNullableString(organization.logo) ?? null,
            website: toNullableString(organization.website) ?? null,
            description: toNullableString(organization.description) ?? null,
            industry: toNullableString(organization.industry) ?? null,
            size: toNullableString(organization.size) ?? null,
            contactName: toNullableString(organization.contactName) ?? null,
            contactEmail: toNullableString(organization.contactEmail) ?? null,
            contactPhone: toNullableString(organization.contactPhone) ?? null,
          },
        });
      }
    }

    return tx.user.findUnique({ where: { id: userId }, select: USER_DETAIL_SELECT });
  });

  return NextResponse.json({
    success: true,
    message: "User updated successfully.",
    data: updatedUser ? serializeUser(updatedUser) : null,
  });
}
