import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canManageInsights } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const asset = await prisma.knowledgeAsset.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
      select: {
        coverImage: true,
        status: true,
      },
    });

    if (!asset?.coverImage) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    const isInsightAdmin = session?.user?.role ? canManageInsights(session.user.role, session.user.staffPermissions) : false;

    if (!isInsightAdmin && asset.status !== "PUBLISHED") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    if (!asset.coverImage.startsWith("data:")) {
      return NextResponse.redirect(asset.coverImage);
    }

    const parsed = parseDataUrl(asset.coverImage);
    if (!parsed) {
      return NextResponse.json({ success: false, error: "Invalid image" }, { status: 400 });
    }

    return new NextResponse(parsed.buffer, {
      status: 200,
      headers: {
        "Content-Type": parsed.mimeType,
        "Content-Length": parsed.buffer.length.toString(),
        "Cache-Control": isInsightAdmin ? "private, max-age=60" : "public, max-age=300",
      },
    });
  } catch (error) {
    console.error("Get insight cover image error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch cover image" }, { status: 500 });
  }
}