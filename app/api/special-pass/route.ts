import { NextRequest, NextResponse } from "next/server";
import { verifyAuthDev } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { resolveRequestLocale } from "@/lib/api-i18n";

export const dynamic = "force-dynamic";

// GET: 获取当前用户的特别通行证申请列表
export async function GET(req: NextRequest) {
  try {
    const requestLocale = resolveRequestLocale(req);
    const auth = await verifyAuthDev(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "请先登录" : "Please log in first" },
        { status: 401 }
      );
    }

    const passes = await prisma.specialPass.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: passes });
  } catch (error) {
    console.error("Get special passes error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: 提交特别通行证申请
export async function POST(req: NextRequest) {
  try {
    const requestLocale = resolveRequestLocale(req);
    const auth = await verifyAuthDev(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "请先登录" : "Please log in first" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      entryType,
      country,
      name,
      birthDate,
      gender,
      docNumber,
      docValidFrom,
      docValidTo,
      docPhoto,
      docPhotoBack,
      photo,
      organization,
      jobTitle,
      docType,
      email,
      phoneArea,
      phone,
      contactMethod,
      contactValue,
    } = body;

    // Validate entry type
    if (!entryType || !["DOMESTIC", "INTERNATIONAL"].includes(entryType)) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "无效的入境方式" : "Invalid entry type" },
        { status: 400 }
      );
    }

    // Validate required fields based on entry type
    if (entryType === "DOMESTIC") {
      // Domestic: only name + phone required
      if (!name || !phone) {
        return NextResponse.json(
          {
            success: false,
            error: requestLocale === "zh" ? "请填写姓名和手机号码" : "Please enter your name and phone number",
          },
          { status: 400 }
        );
      }
    } else {
      // International: all fields required
      if (!country || !name || !birthDate || !gender || !docNumber || !docValidFrom || !docValidTo) {
        return NextResponse.json(
          {
            success: false,
            error: requestLocale === "zh" ? "请填写所有必填字段" : "Please fill in all required fields",
          },
          { status: 400 }
        );
      }
    }

    // Check for existing pending application
    const existing = await prisma.specialPass.findFirst({
      where: {
        userId: auth.userId,
        status: "PENDING",
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: requestLocale === "zh"
            ? "您已有一个待审核的申请，请等待审核结果"
            : "You already have a pending application. Please wait for the review result.",
        },
        { status: 409 }
      );
    }

    const pass = await prisma.specialPass.create({
      data: {
        userId: auth.userId,
        entryType,
        country,
        name,
        birthDate,
        gender,
        docNumber,
        docValidFrom,
        docValidTo,
        docPhoto: docPhoto || null,
        docPhotoBack: docPhotoBack || null,
        photo: photo || null,
        organization: organization || null,
        jobTitle: jobTitle || null,
        docType: docType || null,
        email: email || null,
        phoneArea: phoneArea || null,
        phone: phone || null,
        contactMethod: contactMethod || null,
        contactValue: contactValue || null,
      },
    });

    return NextResponse.json({ success: true, data: pass }, { status: 201 });
  } catch (error) {
    console.error("Create special pass error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
