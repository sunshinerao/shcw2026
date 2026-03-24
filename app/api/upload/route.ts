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
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/upload
 * Upload an invitation letter file (admin/event manager only)
 * Form data: file (the file), invitationId (optional - auto-update the invitation)
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
    const invitationId = formData.get("invitationId") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "uploadNoFile") },
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
    const ext = path.extname(file.name) || ".pdf";
    const safeName = `${randomUUID()}${ext}`;

    // Save to public/uploads/invitations/
    const uploadDir = path.join(process.cwd(), "public", "uploads", "invitations");
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, safeName);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // Generate download URL (relative, served by Next.js static)
    const fileUrl = `/uploads/invitations/${safeName}`;

    // If invitationId is provided, update the invitation with the file URL and mark as UPLOADED
    if (invitationId) {
      await prisma.invitationRequest.update({
        where: { id: invitationId },
        data: {
          letterFileUrl: fileUrl,
          status: "UPLOADED",
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: { url: fileUrl, filename: file.name },
    });
  } catch (error) {
    console.error("Upload file error:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "uploadFailed") },
      { status: 500 }
    );
  }
}
