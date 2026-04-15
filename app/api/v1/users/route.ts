import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma, UserRole, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/openclaw-auth";
import { generatePassCode, generateClimatePassportId } from "@/lib/utils";
import { normalizeUserEmail, normalizeUserName } from "@/lib/user-identity";

const ALLOWED_SORT_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "name",
  "email",
  "role",
  "status",
  "organization",
]);

const USER_LIST_SELECT = {
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

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function generateUniquePassCode() {
  let passCode = generatePassCode();

  while (await prisma.user.findUnique({ where: { passCode }, select: { id: true } })) {
    passCode = generatePassCode();
  }

  return passCode;
}

async function generateUniqueClimatePassportId() {
  let climatePassportId = generateClimatePassportId();

  while (await prisma.user.findUnique({ where: { climatePassportId }, select: { id: true } })) {
    climatePassportId = generateClimatePassportId();
  }

  return climatePassportId;
}

export async function GET(req: NextRequest) {
  const auth = await verifyApiKey(req, "users:read");
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("pageSize") || "20", 10)));
  const search = (searchParams.get("search") || "").trim();
  const roleParams = searchParams.getAll("role");
  const statusParam = searchParams.get("status");
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const where: Prisma.UserWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { title: { contains: search, mode: "insensitive" } },
      { organization: { is: { name: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const validRoles = roleParams.filter((role) =>
    Object.values(UserRole).includes(role as UserRole)
  ) as UserRole[];
  if (validRoles.length === 1) {
    where.role = validRoles[0];
  } else if (validRoles.length > 1) {
    where.role = { in: validRoles };
  }

  if (statusParam && Object.values(UserStatus).includes(statusParam as UserStatus)) {
    where.status = statusParam as UserStatus;
  }

  const resolvedSortBy = ALLOWED_SORT_FIELDS.has(sortBy) ? sortBy : "createdAt";
  const orderBy: Prisma.UserOrderByWithRelationInput =
    resolvedSortBy === "organization"
      ? { organization: { name: sortOrder } }
      : ({ [resolvedSortBy]: sortOrder } as Prisma.UserOrderByWithRelationInput);

  const [users, total, statsTotal, statsActive, statsPending, statsSpeakers, statsVerifiers] = await Promise.all([
    prisma.user.findMany({
      where,
      select: USER_LIST_SELECT,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
    prisma.user.count(),
    prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
    prisma.user.count({ where: { status: UserStatus.PENDING } }),
    prisma.user.count({ where: { role: UserRole.SPEAKER } }),
    prisma.user.count({ where: { role: UserRole.VERIFIER } }),
  ]);

  return NextResponse.json({
    success: true,
    data: users.map((user) => serializeUser(user)),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
    stats: {
      total: statsTotal,
      active: statsActive,
      pending: statsPending,
      speakers: statsSpeakers,
      verifiers: statsVerifiers,
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await verifyApiKey(req, "users:write");
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "Request body must be valid JSON" }, { status: 400 });
  }

  const requestBody = body as Record<string, unknown>;
  const normalizedName = normalizeUserName(
    typeof requestBody.name === "string" ? requestBody.name : ""
  );
  const normalizedEmail = normalizeUserEmail(
    typeof requestBody.email === "string" ? requestBody.email : ""
  );
  const password = typeof requestBody.password === "string" ? requestBody.password : "";
  const role = Object.values(UserRole).includes(requestBody.role as UserRole)
    ? (requestBody.role as UserRole)
    : UserRole.ATTENDEE;
  const status = Object.values(UserStatus).includes(requestBody.status as UserStatus)
    ? (requestBody.status as UserStatus)
    : UserStatus.ACTIVE;

  if (!normalizedName || !normalizedEmail || !password) {
    return NextResponse.json(
      { success: false, error: "name, email, and password are required" },
      { status: 400 }
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return NextResponse.json({ success: false, error: "email format is invalid" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { success: false, error: "password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const [existingUser, existingNameUser] = await Promise.all([
    prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } }),
    prisma.user.findFirst({
      where: {
        name: { equals: normalizedName, mode: "insensitive" },
      },
      select: { id: true },
    }),
  ]);

  if (existingUser) {
    return NextResponse.json({ success: false, error: "email is already in use" }, { status: 409 });
  }

  if (existingNameUser) {
    return NextResponse.json({ success: false, error: "name is already in use" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const passCode = await generateUniquePassCode();
  const climatePassportId = await generateUniqueClimatePassportId();
  const payload = body as Record<string, unknown>;
  const organization = payload.organization as Record<string, unknown> | undefined;
  const rawStaffPermissions = Array.isArray(payload.staffPermissions)
    ? payload.staffPermissions.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  const createdUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        password: hashedPassword,
        phone: toNullableString(payload.phone),
        title: toNullableString(payload.title),
        bio: toNullableString(payload.bio),
        salutation: toNullableString(payload.salutation),
        role,
        status,
        avatar: toNullableString(payload.avatar),
        passCode,
        climatePassportId,
        staffPermissions:
          role !== UserRole.ADMIN && rawStaffPermissions.length > 0
            ? JSON.stringify(rawStaffPermissions)
            : null,
      },
      select: USER_LIST_SELECT,
    });

    if (organization && typeof organization === "object" && toNullableString(organization.name)) {
      await tx.organization.create({
        data: {
          userId: user.id,
          name: toNullableString(organization.name)!,
          logo: toNullableString(organization.logo),
          website: toNullableString(organization.website),
          description: toNullableString(organization.description),
          industry: toNullableString(organization.industry),
          size: toNullableString(organization.size),
          contactName: toNullableString(organization.contactName),
          contactEmail: toNullableString(organization.contactEmail),
          contactPhone: toNullableString(organization.contactPhone),
        },
      });
    }

    return tx.user.findUnique({ where: { id: user.id }, select: USER_LIST_SELECT });
  });

  return NextResponse.json(
    {
      success: true,
      data: createdUser ? serializeUser(createdUser) : null,
      message: "User created successfully.",
    },
    { status: 201 }
  );
}
