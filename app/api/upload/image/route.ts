import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { authOptions } from "@/lib/auth";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";
import { canManageEvents } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_CATEGORIES = new Set(["speakers", "sponsors"]);

/**
 * POST /api/upload/image
 * Upload an image for speakers (avatar) or sponsors (logo).
 * Form data: file (the image), category ("speakers" | "sponsors")
 */
export async function POST(req: NextRequest) {
  const requestLocale = resolveRequestLocale(req);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "unauthorized") },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !canManageEvents(user.role)) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "forbidden") },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = formData.get("category") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "uploadNoFile") },
        { status: 400 }
      );
    }

    if (!category || !ALLOWED_CATEGORIES.has(category)) {
      return NextResponse.json(
        { success: false, error: "Invalid category. Must be 'speakers' or 'sponsors'." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "uploadInvalidType") },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "uploadTooLarge") },
        { status: 400 }
      );
    }

    // Generate safe filename
    const ext = path.extname(file.name) || ".png";
    const safeName = `${randomUUID()}${ext}`;

    // Save to public/uploads/<category>/
    const uploadDir = path.join(process.cwd(), "public", "uploads", category);
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, safeName);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const fileUrl = `/uploads/${category}/${safeName}`;

    return NextResponse.json({
      success: true,
      data: { url: fileUrl, filename: file.name },
    });
  } catch (error) {
    console.error("Upload image error:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "uploadFailed") },
      { status: 500 }
    );
  }
}
