import { NextRequest, NextResponse } from "next/server";
import { verifyAuthDev } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { resolveRequestLocale } from "@/lib/api-i18n";

export const dynamic = "force-dynamic";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_MIME_WHITELIST = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validateImageDataUrl(dataUrl: string): { ok: boolean; error?: string } {
  if (!dataUrl) {
    return { ok: true };
  }

  const matched = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!matched) {
    return { ok: false, error: "invalid_format" };
  }

  const mimeType = matched[1].toLowerCase();
  if (!IMAGE_MIME_WHITELIST.has(mimeType)) {
    return { ok: false, error: "invalid_type" };
  }

  const base64Payload = matched[2].replace(/\s+/g, "");
  const size = Buffer.byteLength(base64Payload, "base64");
  if (size > MAX_IMAGE_SIZE) {
    return { ok: false, error: "too_large" };
  }

  return { ok: true };
}

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
      select: {
        id: true,
        entryType: true,
        status: true,
        name: true,
        country: true,
        createdAt: true,
      },
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

    const normalizedCountry = normalizeText(country);
    const normalizedName = normalizeText(name);
    const normalizedBirthDate = normalizeText(birthDate);
    const normalizedGender = normalizeText(gender);
    const normalizedDocNumber = normalizeText(docNumber);
    const normalizedDocValidFrom = normalizeText(docValidFrom);
    const normalizedDocValidTo = normalizeText(docValidTo);
    const normalizedDocType = normalizeText(docType);
    const normalizedEmail = normalizeText(email);
    const normalizedPhoneArea = normalizeText(phoneArea);
    const normalizedPhone = normalizeText(phone);

    const normalizedDocPhoto = normalizeText(docPhoto);
    const normalizedDocPhotoBack = normalizeText(docPhotoBack);
    const normalizedPhoto = normalizeText(photo);

    // Validate entry type
    if (!entryType || !["DOMESTIC", "INTERNATIONAL"].includes(entryType)) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "无效的入境方式" : "Invalid entry type" },
        { status: 400 }
      );
    }

    const docPhotoValidation = validateImageDataUrl(normalizedDocPhoto);
    if (!docPhotoValidation.ok) {
      return NextResponse.json(
        {
          success: false,
          error: requestLocale === "zh" ? "证件照片格式不正确或超过5MB" : "Document photo format is invalid or exceeds 5MB",
        },
        { status: 400 }
      );
    }

    const docPhotoBackValidation = validateImageDataUrl(normalizedDocPhotoBack);
    if (!docPhotoBackValidation.ok) {
      return NextResponse.json(
        {
          success: false,
          error: requestLocale === "zh" ? "证件背面照片格式不正确或超过5MB" : "Back-side document photo format is invalid or exceeds 5MB",
        },
        { status: 400 }
      );
    }

    const photoValidation = validateImageDataUrl(normalizedPhoto);
    if (!photoValidation.ok) {
      return NextResponse.json(
        {
          success: false,
          error: requestLocale === "zh" ? "个人照片格式不正确或超过5MB" : "Profile photo format is invalid or exceeds 5MB",
        },
        { status: 400 }
      );
    }

    if (
      normalizedDocValidFrom &&
      normalizedDocValidTo &&
      normalizedDocValidFrom > normalizedDocValidTo
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            requestLocale === "zh"
              ? "证件有效期开始日期不能晚于结束日期"
              : "Document validity start date cannot be later than end date",
        },
        { status: 400 }
      );
    }

    // Validate required fields based on entry type
    if (entryType === "DOMESTIC") {
      if (!normalizedName || !normalizedPhone || !normalizedEmail) {
        return NextResponse.json(
          {
            success: false,
            error:
              requestLocale === "zh"
                ? "请填写境内申请必填信息（姓名、手机号码、电子邮箱）"
                : "Please complete required domestic fields (name, phone, email)",
          },
          { status: 400 }
        );
      }
    } else {
      if (
        !normalizedCountry ||
        !normalizedName ||
        !normalizedBirthDate ||
        !normalizedGender ||
        !normalizedDocNumber ||
        !normalizedDocValidFrom ||
        !normalizedDocValidTo ||
        !normalizedDocType ||
        !normalizedDocPhoto ||
        !normalizedPhoto ||
        !normalizedEmail ||
        !normalizedPhone
      ) {
        return NextResponse.json(
          {
            success: false,
            error: requestLocale === "zh" ? "请填写所有必填字段" : "Please fill in all required fields",
          },
          { status: 400 }
        );
      }

      if (!["M", "F"].includes(normalizedGender.toUpperCase())) {
        return NextResponse.json(
          {
            success: false,
            error: requestLocale === "zh" ? "性别字段无效" : "Gender field is invalid",
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
        country: normalizedCountry,
        name: normalizedName,
        birthDate: normalizedBirthDate,
        gender: normalizedGender,
        docNumber: normalizedDocNumber,
        docValidFrom: normalizedDocValidFrom,
        docValidTo: normalizedDocValidTo,
        docPhoto: normalizedDocPhoto || null,
        docPhotoBack: normalizedDocPhotoBack || null,
        photo: normalizedPhoto || null,
        organization: normalizeText(organization) || null,
        jobTitle: normalizeText(jobTitle) || null,
        docType: normalizedDocType || null,
        email: normalizedEmail || null,
        phoneArea: normalizedPhoneArea || null,
        phone: normalizedPhone || null,
        contactMethod: normalizeText(contactMethod) || null,
        contactValue: normalizeText(contactValue) || null,
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
