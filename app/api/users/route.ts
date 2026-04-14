import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import bcrypt from "bcryptjs";
import { Prisma, UserRole, UserStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { apiMessage, resolveRequestLocale, type ApiLocale } from "@/lib/api-i18n";
import { prisma } from "@/lib/prisma";
import { generatePassCode, generateClimatePassportId } from "@/lib/utils";
import { normalizeUserEmail, normalizeUserName } from "@/lib/user-identity";

const ALLOWED_SORT_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "name",
  "email",
  "role",
  "status",
  "passCode",
  "organization",
]);

async function requireSessionUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
}

function unauthorizedResponse(locale: ApiLocale) {
  return NextResponse.json(
    { success: false, error: apiMessage(locale, "unauthorized") },
    { status: 401 }
  );
}

function staffOrAdminOnlyResponse(locale: ApiLocale) {
  return NextResponse.json(
    { success: false, error: apiMessage(locale, "staffOrAdminOnly") },
    { status: 403 }
  );
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
  const requestLocale = resolveRequestLocale(req);

  try {
    const currentUser = await requireSessionUser();

    if (!currentUser) {
      return unauthorizedResponse(requestLocale);
    }

    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.STAFF) {
      return staffOrAdminOnlyResponse(requestLocale);
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      50,
      Math.max(1, Number.parseInt(searchParams.get("pageSize") || "20", 10))
    );
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

    const validRoles = roleParams.filter((r) => Object.values(UserRole).includes(r as UserRole)) as UserRole[];
    if (validRoles.length === 1) {
      where.role = validRoles[0];
    } else if (validRoles.length > 1) {
      where.role = { in: validRoles };
    }

    if (statusParam && Object.values(UserStatus).includes(statusParam as UserStatus)) {
      where.status = statusParam as UserStatus;
    }

    const skip = (page - 1) * pageSize;
    const resolvedSortBy = ALLOWED_SORT_FIELDS.has(sortBy) ? sortBy : "createdAt";
    const orderBy: Prisma.UserOrderByWithRelationInput =
      resolvedSortBy === "organization"
        ? { organization: { name: sortOrder } }
        : { [resolvedSortBy]: sortOrder };

    const [users, total, statsTotal, statsActive, statsPending, statsSpeakers, statsVerifiers] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
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
          passCode: true,
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
          _count: {
            select: {
              registrations: true,
              checkins: true,
            },
          },
        },
        orderBy,
        skip,
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
      data: {
        users,
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
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "usersListFetchFailed") },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let requestLocale = resolveRequestLocale(req);

  try {
    const currentUser = await requireSessionUser();

    if (!currentUser) {
      return unauthorizedResponse(requestLocale);
    }

    if (currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "userCreateAdminOnly") },
        { status: 403 }
      );
    }

    const body = await req.json();
    requestLocale = resolveRequestLocale(req, body.locale);

    const {
      name,
      email,
      password,
      phone,
      title,
      bio,
      salutation,
      role = UserRole.ATTENDEE,
      status = UserStatus.ACTIVE,
      avatar,
      organization,
    } = body;

    const normalizedName = normalizeUserName(name || "");
    const normalizedEmail = normalizeUserEmail(email || "");

    if (!normalizedName || !normalizedEmail || !password) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "userCreateRequired") },
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

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "passwordMin") },
        { status: 400 }
      );
    }

    if (!Object.values(UserRole).includes(role)) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "invalidRole") },
        { status: 400 }
      );
    }

    if (!Object.values(UserStatus).includes(status)) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "invalidUserStatus") },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
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

    const hashedPassword = await bcrypt.hash(password, 12);
    const passCode = await generateUniquePassCode();
    const climatePassportId = await generateUniqueClimatePassportId();

    const newUser = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: normalizedName,
          email: normalizedEmail,
          password: hashedPassword,
          phone: phone || null,
          title: title || null,
          bio: bio || null,
          salutation: salutation || null,
          role,
          status,
          avatar: avatar || null,
          passCode,
          climatePassportId,
        },
      });

      if (organization?.name) {
        await tx.organization.create({
          data: {
            name: organization.name,
            logo: organization.logo || null,
            website: organization.website || null,
            description: organization.description || null,
            industry: organization.industry || null,
            size: organization.size || null,
            contactName: organization.contactName || null,
            contactEmail: organization.contactEmail || null,
            contactPhone: organization.contactPhone || null,
            userId: createdUser.id,
          },
        });
      }

      return createdUser;
    });

    const userWithRelations = await prisma.user.findUnique({
      where: { id: newUser.id },
      select: {
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
        passCode: true,
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
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: apiMessage(requestLocale, "userCreateSuccess"),
        data: userWithRelations,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "userCreateFailed") },
      { status: 500 }
    );
  }
}

