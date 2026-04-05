import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/permissions";
import {
  getSignaturePresetsStore,
  saveSignaturePresetsStore,
  type SignaturePreset,
} from "@/lib/invitation-signature-presets";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (!user || !isAdminRole(user.role)) return null;
  return user;
}

/** GET /api/admin/invitation-signature-presets — load all presets */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const store = await getSignaturePresetsStore();
    return NextResponse.json({ success: true, data: store });
  } catch (error) {
    console.error("Get signature presets error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load signature presets" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/invitation-signature-presets
 * Body: { defaultPresetId: string; presets: SignaturePreset[] }
 * Saves the entire presets store.
 */
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as {
      defaultPresetId?: unknown;
      presets?: unknown;
    };

    if (!Array.isArray(body.presets)) {
      return NextResponse.json(
        { success: false, error: "presets must be an array" },
        { status: 400 }
      );
    }

    // Validate each preset
    const presets: SignaturePreset[] = [];
    for (const item of body.presets as unknown[]) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return NextResponse.json(
          { success: false, error: "Invalid preset entry" },
          { status: 400 }
        );
      }
      const p = item as Record<string, unknown>;
      if (typeof p.id !== "string" || !p.id.trim()) {
        return NextResponse.json(
          { success: false, error: "Each preset must have a non-empty id" },
          { status: 400 }
        );
      }
      if (typeof p.label !== "string" || !p.label.trim()) {
        return NextResponse.json(
          { success: false, error: "Each preset must have a non-empty label" },
          { status: 400 }
        );
      }
      if (p.type !== "single" && p.type !== "dual") {
        return NextResponse.json(
          { success: false, error: "Preset type must be 'single' or 'dual'" },
          { status: 400 }
        );
      }
      presets.push({
        id: p.id.trim(),
        label: p.label.trim(),
        type: p.type,
        singleImageUrl: typeof p.singleImageUrl === "string" ? p.singleImageUrl : undefined,
        singleHtml: typeof p.singleHtml === "string" ? p.singleHtml : undefined,
        signatoryAImageUrl:
          typeof p.signatoryAImageUrl === "string" ? p.signatoryAImageUrl : undefined,
        signatoryAHtml: typeof p.signatoryAHtml === "string" ? p.signatoryAHtml : undefined,
        signatoryBImageUrl:
          typeof p.signatoryBImageUrl === "string" ? p.signatoryBImageUrl : undefined,
        signatoryBHtml: typeof p.signatoryBHtml === "string" ? p.signatoryBHtml : undefined,
      });
    }

    // Validate IDs are unique
    const ids = presets.map((p) => p.id);
    if (new Set(ids).size !== ids.length) {
      return NextResponse.json(
        { success: false, error: "Preset IDs must be unique" },
        { status: 400 }
      );
    }

    const defaultPresetId =
      typeof body.defaultPresetId === "string" && body.defaultPresetId.trim()
        ? body.defaultPresetId.trim()
        : (presets[0]?.id ?? "default-single");

    const saved = await saveSignaturePresetsStore({ defaultPresetId, presets });
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error("Save signature presets error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save signature presets" },
      { status: 500 }
    );
  }
}
