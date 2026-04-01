import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import * as XLSX from "xlsx";
import { SpecialPassStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";
import { canManageSpecialPassApplications } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function requireManager(requestLocale: "zh" | "en") {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: apiMessage(requestLocale, "unauthorized") }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || !canManageSpecialPassApplications(user.role)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "adminOrSpecialPassManagerOnly") },
        { status: 403 }
      ),
    };
  }

  return { ok: true as const };
}

function getStatusLabel(status: SpecialPassStatus, locale: "zh" | "en") {
  const labels = {
    zh: {
      PENDING: "待审核",
      APPROVED: "已批准",
      REJECTED: "已拒绝",
    },
    en: {
      PENDING: "Pending",
      APPROVED: "Approved",
      REJECTED: "Rejected",
    },
  };

  return labels[locale][status] || status;
}

export async function GET(req: NextRequest) {
  const requestLocale = resolveRequestLocale(req);

  try {
    const permission = await requireManager(requestLocale);
    if (!permission.ok) {
      return permission.response;
    }

    const passes = await prisma.specialPass.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = passes.map((pass) => {
      if (requestLocale === "zh") {
        return {
          "申请时间": pass.createdAt.toISOString(),
          "状态": getStatusLabel(pass.status, requestLocale),
          "入境方式": pass.entryType === "INTERNATIONAL" ? "国际入境" : "境内入场",
          "姓名": pass.name,
          "国家/地区": pass.country,
          "邮箱": pass.email || "",
          "电话区号": pass.phoneArea || "",
          "电话": pass.phone || "",
          "证件类型": pass.docType || "",
          "证件号码": pass.docNumber,
          "单位": pass.organization || "",
          "职务": pass.jobTitle || "",
          "申请用户": pass.user.name,
          "申请用户邮箱": pass.user.email,
          "审核人": pass.reviewedBy || "",
          "审核时间": pass.reviewedAt ? pass.reviewedAt.toISOString() : "",
          "审核备注": pass.adminNotes || "",
        };
      }

      return {
        "Applied At": pass.createdAt.toISOString(),
        "Status": getStatusLabel(pass.status, requestLocale),
        "Entry Type": pass.entryType,
        "Name": pass.name,
        "Country": pass.country,
        "Email": pass.email || "",
        "Phone Area": pass.phoneArea || "",
        "Phone": pass.phone || "",
        "Document Type": pass.docType || "",
        "Document Number": pass.docNumber,
        "Organization": pass.organization || "",
        "Job Title": pass.jobTitle || "",
        "Applicant User": pass.user.name,
        "Applicant Email": pass.user.email,
        "Reviewed By": pass.reviewedBy || "",
        "Reviewed At": pass.reviewedAt ? pass.reviewedAt.toISOString() : "",
        "Review Notes": pass.adminNotes || "",
      };
    });

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, requestLocale === "zh" ? "特别通行证" : "Special Pass");

    const fileBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const filename = requestLocale === "zh"
      ? `special-pass-${new Date().toISOString().slice(0, 10)}.xlsx`
      : `special-pass-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export special pass error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
