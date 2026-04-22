import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import * as XLSX from "xlsx";
import { authOptions } from "@/lib/auth";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";
import { isAdminRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const requestLocale = resolveRequestLocale(req);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "unauthorized") },
        { status: 401 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!currentUser || !isAdminRole(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "forbidden") },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        points: true,
        climatePassportId: true,
        passCode: true,
        createdAt: true,
        organization: {
          select: {
            name: true,
            title: true,
            industry: true,
          },
        },
        _count: {
          select: {
            registrations: true,
            checkIns: true,
          },
        },
      },
    });

    const roleLabels: Record<string, { zh: string; en: string }> = {
      VISITOR: { zh: "访客", en: "Visitor" },
      ATTENDEE: { zh: "参会观众", en: "Attendee" },
      ORGANIZATION: { zh: "机构代表", en: "Organization" },
      SPEAKER: { zh: "演讲嘉宾", en: "Speaker" },
      MEDIA: { zh: "媒体", en: "Media" },
      SPONSOR: { zh: "赞助商", en: "Sponsor" },
      ADMIN: { zh: "管理员", en: "Admin" },
      EVENT_MANAGER: { zh: "活动管理员", en: "Event Manager" },
      SPECIAL_PASS_MANAGER: { zh: "特别通行证管理员", en: "Special Pass Manager" },
      STAFF: { zh: "工作人员", en: "Staff" },
      VERIFIER: { zh: "验证人员", en: "Verifier" },
    };

    const statusLabels: Record<string, { zh: string; en: string }> = {
      ACTIVE: { zh: "已激活", en: "Active" },
      PENDING: { zh: "待审核", en: "Pending" },
      SUSPENDED: { zh: "已禁用", en: "Suspended" },
    };

    const dateFormatOptions: Intl.DateTimeFormatOptions = {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    };

    const rows = users.map((user) => {
      const roleLabel = roleLabels[user.role]?.[requestLocale] ?? user.role;
      const statusLabel = statusLabels[user.status]?.[requestLocale] ?? user.status;
      const registeredAt = user.createdAt.toLocaleString(
        requestLocale === "zh" ? "zh-CN" : "en-US",
        dateFormatOptions
      );

      if (requestLocale === "zh") {
        return {
          "姓名": user.name,
          "邮箱": user.email,
          "角色": roleLabel,
          "状态": statusLabel,
          "积分": user.points,
          "气候护照ID": user.climatePassportId ?? "",
          "通行码": user.passCode ?? "",
          "所属机构": user.organization?.name ?? "",
          "职位": user.organization?.title ?? "",
          "行业": user.organization?.industry ?? "",
          "报名活动数": user._count.registrations,
          "签到次数": user._count.checkIns,
          "注册时间": registeredAt,
        };
      }

      return {
        "Name": user.name,
        "Email": user.email,
        "Role": roleLabel,
        "Status": statusLabel,
        "Points": user.points,
        "Climate Passport ID": user.climatePassportId ?? "",
        "Pass Code": user.passCode ?? "",
        "Organization": user.organization?.name ?? "",
        "Job Title": user.organization?.title ?? "",
        "Industry": user.organization?.industry ?? "",
        "Registrations": user._count.registrations,
        "Check-ins": user._count.checkIns,
        "Registered At": registeredAt,
      };
    });

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(
      workbook,
      sheet,
      requestLocale === "zh" ? "用户列表" : "Users"
    );

    const fileBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const filename = `users-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export users error:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "internalServerError") },
      { status: 500 }
    );
  }
}
