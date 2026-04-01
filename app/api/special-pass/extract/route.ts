import { NextRequest, NextResponse } from "next/server";
import { verifyAuthDev } from "@/lib/auth-helpers";
import { resolveRequestLocale } from "@/lib/api-i18n";
import { getSystemSettingsForServer } from "@/lib/system-settings";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_MIME_WHITELIST = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

type ExtractResult = {
  name?: string;
  birthDate?: string;
  gender?: "M" | "F";
  docNumber?: string;
  docValidFrom?: string;
  docValidTo?: string;
  countryCode?: string;
  countryName?: string;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDate(value: unknown): string {
  const text = normalizeText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function normalizeGender(value: unknown): "M" | "F" | undefined {
  const text = normalizeText(value).toUpperCase();
  if (text === "M" || text === "F") {
    return text;
  }
  return undefined;
}

function parseDataUrl(dataUrl: string): { mimeType: string; base64Payload: string } | null {
  const matched = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!matched) {
    return null;
  }

  const mimeType = matched[1].toLowerCase();
  const base64Payload = matched[2].replace(/\s+/g, "");
  return { mimeType, base64Payload };
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // ignore and continue
  }

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return null;
    }
  }

  return null;
}

function toExtractResult(parsed: Record<string, unknown>): ExtractResult {
  const name = normalizeText(parsed.name);
  const birthDate = normalizeDate(parsed.birthDate);
  const gender = normalizeGender(parsed.gender);
  const docNumber = normalizeText(parsed.docNumber);
  const docValidFrom = normalizeDate(parsed.docValidFrom);
  const docValidTo = normalizeDate(parsed.docValidTo);
  const countryCode = normalizeText(parsed.countryCode).toUpperCase();
  const countryName = normalizeText(parsed.countryName);

  const result: ExtractResult = {};
  if (name) result.name = name;
  if (birthDate) result.birthDate = birthDate;
  if (gender) result.gender = gender;
  if (docNumber) result.docNumber = docNumber;
  if (docValidFrom) result.docValidFrom = docValidFrom;
  if (docValidTo) result.docValidTo = docValidTo;
  if (countryCode) result.countryCode = countryCode;
  if (countryName) result.countryName = countryName;

  return result;
}

export async function POST(req: NextRequest) {
  const requestLocale = resolveRequestLocale(req);

  try {
    const auth = await verifyAuthDev(req);
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "请先登录" : "Please log in first" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const imageDataUrl = normalizeText(body.imageDataUrl);
    const entryType = normalizeText(body.entryType);
    const docType = normalizeText(body.docType);
    const side = normalizeText(body.side) || "front";

    if (!imageDataUrl) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "缺少证件图片" : "Missing document image" },
        { status: 400 }
      );
    }

    if (!entryType || !["DOMESTIC", "INTERNATIONAL"].includes(entryType)) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "入境类型无效" : "Invalid entry type" },
        { status: 400 }
      );
    }

    if (!docType) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "请先选择证件类型" : "Please select document type first" },
        { status: 400 }
      );
    }

    const parsedDataUrl = parseDataUrl(imageDataUrl);
    if (!parsedDataUrl) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "图片格式无效" : "Invalid image format" },
        { status: 400 }
      );
    }

    if (!IMAGE_MIME_WHITELIST.has(parsedDataUrl.mimeType)) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "仅支持 JPG/JPEG/PNG" : "Only JPG/JPEG/PNG are supported" },
        { status: 400 }
      );
    }

    const size = Buffer.byteLength(parsedDataUrl.base64Payload, "base64");
    if (size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "图片大小不能超过5MB" : "Image size must be less than 5MB" },
        { status: 400 }
      );
    }

    const settings = await getSystemSettingsForServer();
    const apiKey = settings.openaiApiKey || process.env.OPENAI_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "未配置AI识别服务" : "AI recognition service is not configured" },
        { status: 400 }
      );
    }

    const prompt = [
      "Extract identity fields from the uploaded document image.",
      "Return JSON only.",
      "Use these keys only: name, birthDate, gender, docNumber, docValidFrom, docValidTo, countryCode, countryName.",
      "If a field is not visible, return an empty string for that field.",
      "birthDate/docValidFrom/docValidTo must be YYYY-MM-DD if identifiable.",
      "gender must be M or F.",
      `entryType: ${entryType}`,
      `docType: ${docType}`,
      `side: ${side}`,
    ].join("\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: settings.openaiModel,
        temperature: 0,
        messages: [
          {
            role: "system",
            content: "You are a document information extraction engine. Output valid JSON only.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        {
          success: false,
          error:
            requestLocale === "zh"
              ? `证件识别失败: ${response.status}`
              : `Document recognition failed: ${response.status}`,
          detail,
        },
        { status: 502 }
      );
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "识别结果为空" : "Recognition result is empty" },
        { status: 502 }
      );
    }

    const parsed = extractJsonObject(content);
    if (!parsed) {
      return NextResponse.json(
        { success: false, error: requestLocale === "zh" ? "识别结果解析失败" : "Failed to parse recognition result" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      data: toExtractResult(parsed),
    });
  } catch (error) {
    console.error("Special pass extract doc error:", error);
    return NextResponse.json(
      { success: false, error: requestLocale === "zh" ? "识别服务异常" : "Recognition service error" },
      { status: 500 }
    );
  }
}
