import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/openclaw-auth";

const VALID_TIERS = new Set(["platinum", "gold", "silver", "bronze", "partner"]);

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

/**
 * GET /api/v1/partners/[id]
 * PATCH /api/v1/partners/[id]
 * DELETE /api/v1/partners/[id]
 */

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyApiKey(req, "partners:read");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const partner = await prisma.sponsor.findUnique({ where: { id: params.id } });
  if (!partner) return NextResponse.json({ success: false, error: "Partner not found" }, { status: 404 });

  return NextResponse.json({ success: true, data: partner });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyApiKey(req, "partners:write");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const existing = await prisma.sponsor.findUnique({ where: { id: params.id }, select: { id: true, name: true, tier: true } });
  if (!existing) return NextResponse.json({ success: false, error: "Partner not found" }, { status: 404 });

  const body = await req.json();
  const update: Record<string, unknown> = {};

  const stringFields = ["name", "nameEn", "logo", "website", "description", "descriptionEn"];
  for (const key of stringFields) {
    if (body[key] !== undefined) update[key] = normalizeText(body[key]);
  }

  if (body.tier !== undefined) {
    if (!VALID_TIERS.has(body.tier)) {
      return NextResponse.json({ success: false, error: `tier must be one of: ${[...VALID_TIERS].join(", ")}` }, { status: 400 });
    }
    update.tier = body.tier;
  }

  if (typeof body.order === "number") update.order = body.order;
  if (typeof body.isActive === "boolean") update.isActive = body.isActive;
  if (typeof body.showOnHomepage === "boolean") update.showOnHomepage = body.showOnHomepage;

  // Duplicate name check if name or tier is being changed
  const newName = (update.name as string | null | undefined) ?? existing.name;
  const newTier = (update.tier as string | undefined) ?? existing.tier;
  const dup = await prisma.sponsor.findFirst({
    where: { name: { equals: newName, mode: "insensitive" }, tier: newTier, NOT: { id: params.id } },
    select: { id: true },
  });
  if (dup) {
    return NextResponse.json(
      { success: false, error: `Another "${newTier}" partner with name "${newName}" already exists (id: ${dup.id})` },
      { status: 409 }
    );
  }

  const updated = await prisma.sponsor.update({ where: { id: params.id }, data: update });

  return NextResponse.json({ success: true, data: updated, message: "Partner updated" });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyApiKey(req, "partners:write");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const existing = await prisma.sponsor.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!existing) return NextResponse.json({ success: false, error: "Partner not found" }, { status: 404 });

  await prisma.sponsor.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true, message: `Partner "${existing.name}" deleted` });
}
