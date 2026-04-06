import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getSignaturePresetsStore } from "@/lib/invitation-signature-presets";

// GET: List available signature presets (accessible to any authenticated user)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const store = await getSignaturePresetsStore();
    return NextResponse.json({
      success: true,
      data: {
        defaultPresetId: store.defaultPresetId,
        presets: store.presets,
      },
    });
  } catch (error) {
    console.error("Get signature presets error:", error);
    return NextResponse.json({ success: false, error: "Failed to load signature presets" }, { status: 500 });
  }
}
