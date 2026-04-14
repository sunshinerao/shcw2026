import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { UserRole, UserStatus } from "@prisma/client";
import { apiMessage, resolveRequestLocale, type ApiLocale } from "@/lib/api-i18n";
import { normalizeUserEmail, normalizeUserName } from "@/lib/user-identity";

// 验证用户是否有权限访问
async function checkPermission(
  sessionUserId: string,
  targetUserId: string,
  locale: ApiLocale,
  requiredRoles: UserRole[] = []
) {
  const currentUser = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { role: true },
  });

  if (!currentUser) {
    return { allowed: false, status: 401, error: apiMessage(locale, "userNotFound") };
  }

  // 管理员可以访问所有用户
  if (currentUser.role === UserRole.ADMIN) {
    return { allowed: true, userRole: currentUser.role };
  }

  // 工作人员可以访问非管理员用户
  if (currentUser.role === UserRole.STAFF) {
    if (requiredRoles.includes(UserRole.ADMIN)) {
      return { allowed: false, status: 403, error: apiMessage(locale, "staffOrAdminOnly") };
    }
    return { allowed: true, userRole: currentUser.role };
  }

  // 普通用户只能访问自己的数据
  if (sessionUserId === targetUserId) {
    return { allowed: true, userRole: currentUser.role };
  }

  return { allowed: false, status: 403, error: apiMessage(locale, "staffOrAdminOnly") };
}

// GET: 获取单个用户详情
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestLocale = resolveRequestLocale(req);

  try {
    const { id } = params;

    // 验证用户是否已登录
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "unauthorized") },
        { status: 401 }
      );
    }

    // 检查权限
    const permission = await checkPermission(session.user.id, id, requestLocale);
    if (!permission.allowed) {
      return NextResponse.json(
        { success: false, error: permission.error },
        { status: permission.status }
      );
    }

    // 查询用户详情
    const user = await prisma.user.findUnique({
      where: { id },
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
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "userNotFound") },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "userDetailFetchFailed") },
      { status: 500 }
    );
  }
}

// PUT: 更新用户信息
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let requestLocale = resolveRequestLocale(req);

  try {
    const { id } = params;

    // 验证用户是否已登录
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "unauthorized") },
        { status: 401 }
      );
    }

    // 获取当前用户信息
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "currentUserMissing") },
        { status: 401 }
      );
    }

    const isAdmin = currentUser.role === UserRole.ADMIN;
    const isStaff = currentUser.role === UserRole.STAFF;
    const isSelf = session.user.id === id;

    // 检查权限
    if (!isAdmin && !isStaff && !isSelf) {
      return NextResponse.json(
        { success: false, error: "权限不足" },
        { status: 403 }
      );
    }

    const body = await req.json();
    requestLocale = resolveRequestLocale(req, body.locale);
    const {
      name,
      email,
      phone,
      title,
      bio,
      salutation,
      role,
      status,
      avatar,
      password,
      organization,
      staffPermissions,
    } = body;

    // 检查目标用户是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "userNotFound") },
        { status: 404 }
      );
    }

    // 非管理员权限检查
    if (!isAdmin) {
      // 工作人员不能修改管理员
      if (isStaff && targetUser.role === UserRole.ADMIN) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "targetAdminProtected") },
          { status: 403 }
        );
      }

      // 普通用户只能修改自己的部分字段
      if (!isStaff && !isSelf) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "staffOrAdminOnly") },
          { status: 403 }
        );
      }

      if (role !== undefined || status !== undefined || staffPermissions !== undefined) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "adminOnlyRoleStatus") },
          { status: 403 }
        );
      }

      if (password !== undefined) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "usePasswordFlow") },
          { status: 403 }
        );
      }

      // 普通用户不能修改其他字段以外的敏感信息
      if (!isStaff && !isSelf) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "staffOrAdminOnly") },
          { status: 403 }
        );
      }
    }

    const normalizedName = name !== undefined ? normalizeUserName(name || "") : undefined;
    const normalizedEmail = email !== undefined ? normalizeUserEmail(email || "") : undefined;

    if (name !== undefined && !normalizedName) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "nameRequired") },
        { status: 400 }
      );
    }

    if (email !== undefined && !normalizedEmail) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "invalidEmailFormat") },
        { status: 400 }
      );
    }

    // 验证邮箱格式（如果提供了邮箱）
    if (normalizedEmail && normalizedEmail !== targetUser.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "invalidEmailFormat") },
          { status: 400 }
        );
      }

      // 检查邮箱是否已被其他用户使用
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existingUser && existingUser.id !== id) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "emailInUseByOther") },
          { status: 400 }
        );
      }
    }

    if (normalizedName && normalizedName !== targetUser.name) {
      const existingNameUser = await prisma.user.findFirst({
        where: {
          id: { not: id },
          name: {
            equals: normalizedName,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      if (existingNameUser) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "nameInUseByOther") },
          { status: 400 }
        );
      }
    }

    // 验证角色是否有效（如果提供了角色）
    if (role && !Object.values(UserRole).includes(role)) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "invalidRole") },
        { status: 400 }
      );
    }

    // 验证状态是否有效（如果提供了状态）
    if (status && !Object.values(UserStatus).includes(status)) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "invalidUserStatus") },
        { status: 400 }
      );
    }

    // 加密密码（如果提供了密码）
    let hashedPassword: string | undefined;
    if (password) {
      if (password.length < 8) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "passwordMin") },
          { status: 400 }
        );
      }
      hashedPassword = await bcrypt.hash(password, 12);
    }

    // 更新用户（使用事务）
    const updatedUser = await prisma.$transaction(async (tx) => {
      // 更新用户信息
      const user = await tx.user.update({
        where: { id },
        data: {
          ...(normalizedName !== undefined && { name: normalizedName }),
          ...(normalizedEmail !== undefined && { email: normalizedEmail }),
          ...(phone !== undefined && { phone }),
          ...(title !== undefined && { title }),
          ...(bio !== undefined && { bio }),
          ...(salutation !== undefined && { salutation: salutation || null }),
          ...(role !== undefined && { role }),
          ...(status !== undefined && { status }),
          ...(avatar !== undefined && { avatar }),
          ...(hashedPassword && { password: hashedPassword }),
          ...(staffPermissions !== undefined && isAdmin && {
            staffPermissions: Array.isArray(staffPermissions) ? JSON.stringify(staffPermissions) : null,
          }),
        },
      });

      // 更新或创建机构信息（如果提供了）
      if (organization) {
        const existingOrg = await tx.organization.findUnique({
          where: { userId: id },
        });

        if (existingOrg) {
          // 更新现有机构
          await tx.organization.update({
            where: { userId: id },
            data: {
              ...(organization.name !== undefined && { name: organization.name }),
              ...(organization.logo !== undefined && { logo: organization.logo }),
              ...(organization.website !== undefined && { website: organization.website }),
              ...(organization.description !== undefined && { description: organization.description }),
              ...(organization.industry !== undefined && { industry: organization.industry }),
              ...(organization.size !== undefined && { size: organization.size }),
              ...(organization.contactName !== undefined && { contactName: organization.contactName }),
              ...(organization.contactEmail !== undefined && { contactEmail: organization.contactEmail }),
              ...(organization.contactPhone !== undefined && { contactPhone: organization.contactPhone }),
            },
          });
        } else if (organization.name) {
          // 创建新机构
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
              userId: id,
            },
          });
        }
      }

      return user;
    });

    // 查询更新后的用户（包含机构信息）
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
      },
    });

    return NextResponse.json({
      success: true,
      message: apiMessage(requestLocale, "userUpdateSuccess"),
      data: userWithOrg,
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(resolveRequestLocale(req), "userUpdateFailed") },
      { status: 500 }
    );
  }
}

// DELETE: 删除用户
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestLocale = resolveRequestLocale(req);

  try {
    const { id } = params;

    // 验证用户是否已登录
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "unauthorized") },
        { status: 401 }
      );
    }

    // 获取当前用户信息
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "currentUserMissing") },
        { status: 401 }
      );
    }

    // 检查是否是管理员
    if (currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "userDeleteAdminOnly") },
        { status: 403 }
      );
    }

    // 不能删除自己
    if (session.user.id === id) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "cannotDeleteSelf") },
        { status: 400 }
      );
    }

    // 检查目标用户是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "userNotFound") },
        { status: 404 }
      );
    }

    // 删除用户（级联删除关联数据）
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: apiMessage(requestLocale, "userDeleteSuccess"),
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "userDeleteFailed") },
      { status: 500 }
    );
  }
}
