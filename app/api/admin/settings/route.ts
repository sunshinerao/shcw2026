import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSystemSettingsForAdmin, updateSystemSettings } from "@/lib/system-settings";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { authorized: false as const, status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    return { authorized: false as const, status: 403 };
  }

  return { authorized: true as const };
}

export async function GET() {
  try {
    const permission = await requireAdmin();
    if (!permission.authorized) {
      return NextResponse.json(
        { success: false, error: permission.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: permission.status }
      );
    }

    const settings = await getSystemSettingsForAdmin();

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("Get admin settings error:", error);
    return NextResponse.json({ success: false, error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const permission = await requireAdmin();
    if (!permission.authorized) {
      return NextResponse.json(
        { success: false, error: permission.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: permission.status }
      );
    }

    const body = await req.json();

    const settings = await updateSystemSettings({
      openaiApiKey: body.openaiApiKey,
      openaiModel: typeof body.openaiModel === "string" ? body.openaiModel : undefined,
      aiHighlightsEnabled:
        typeof body.aiHighlightsEnabled === "boolean" ? body.aiHighlightsEnabled : undefined,
      autoGenerateHighlightsOnSave:
        typeof body.autoGenerateHighlightsOnSave === "boolean"
          ? body.autoGenerateHighlightsOnSave
          : undefined,
      highlightCount: typeof body.highlightCount === "number" ? body.highlightCount : undefined,
      newsEnabled: typeof body.newsEnabled === "boolean" ? body.newsEnabled : undefined,
    });

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("Update admin settings error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save settings",
      },
      { status: 500 }
    );
  }
}
