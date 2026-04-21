import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageInsights } from "@/lib/permissions";

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+)(;base64)?,([\s\S]+)$/);
  if (!match) return null;

  const mimeType = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const payload = match[3] || "";

  try {
    const buffer = isBase64
      ? Buffer.from(payload, "base64")
      : Buffer.from(decodeURIComponent(payload), "utf-8");
    return { mimeType, buffer };
  } catch {
    return null;
  }
}

function guessFileExtension(mimeType: string, fileFormat: string | null) {
  const normalizedFormat = (fileFormat || "").toLowerCase();
  if (normalizedFormat) return normalizedFormat;
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "text/plain") return "txt";
  if (mimeType === "text/markdown" || mimeType === "text/x-markdown") return "md";
  if (mimeType === "application/json") return "json";
  if (mimeType === "text/csv") return "csv";
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (mimeType === "application/msword") return "doc";
  return "bin";
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const asset = await prisma.knowledgeAsset.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
      select: {
        id: true,
        slug: true,
        title: true,
        titleEn: true,
        status: true,
        downloadEnabled: true,
        fileUrl: true,
        fileFormat: true,
      },
    });

    if (!asset?.fileUrl) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    const isInsightAdmin = session?.user?.role ? canManageInsights(session.user.role, session.user.staffPermissions) : false;
    const canAccess = isInsightAdmin || (asset.status === "PUBLISHED" && asset.downloadEnabled);

    if (!canAccess) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    if (!asset.fileUrl.startsWith("data:")) {
      return NextResponse.redirect(asset.fileUrl);
    }

    const parsed = parseDataUrl(asset.fileUrl);
    if (!parsed) {
      return NextResponse.json({ success: false, error: "Invalid file" }, { status: 400 });
    }

    const extension = guessFileExtension(parsed.mimeType, asset.fileFormat);
    const fileBaseName = (asset.titleEn || asset.title || asset.slug || "knowledge-asset")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "knowledge-asset";

    return new NextResponse(parsed.buffer, {
      status: 200,
      headers: {
        "Content-Type": parsed.mimeType,
        "Content-Length": parsed.buffer.length.toString(),
        "Content-Disposition": `inline; filename="${fileBaseName}.${extension}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error("Get insight file error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch file" }, { status: 500 });
  }
}