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
 * GET /api/v1/partners — list all active partners/sponsors
 * POST /api/v1/partners — create a partner/sponsor
 */

export async function GET(req: NextRequest) {
  const auth = await verifyApiKey(req, "partners:read");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const tier = searchParams.get("tier");
  const activeOnly = searchParams.get("activeOnly") !== "false"; // default true

  const where: Record<string, unknown> = {};
  if (tier && VALID_TIERS.has(tier)) where.tier = tier;
  if (activeOnly) where.isActive = true;

  const partners = await prisma.sponsor.findMany({
    where,
    orderBy: [{ tier: "asc" }, { order: "asc" }],
  });

  return NextResponse.json({ success: true, data: partners, count: partners.length });
}

export async function POST(req: NextRequest) {
  const auth = await verifyApiKey(req, "partners:write");
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { name, nameEn, logo, website, description, descriptionEn, tier, order, isActive, showOnHomepage } = body;

  if (!name?.trim()) return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });
  if (!logo?.trim()) return NextResponse.json({ success: false, error: "logo (URL) is required" }, { status: 400 });
  if (!tier || !VALID_TIERS.has(tier)) {
    return NextResponse.json(
      { success: false, error: `tier must be one of: ${[...VALID_TIERS].join(", ")}` },
      { status: 400 }
    );
  }

  // Duplicate name check within same tier
  const existing = await prisma.sponsor.findFirst({
    where: { name: { equals: name.trim(), mode: "insensitive" }, tier },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { success: false, error: `A "${tier}" partner with name "${name.trim()}" already exists (id: ${existing.id})` },
      { status: 409 }
    );
  }

  const partner = await prisma.sponsor.create({
    data: {
      name: name.trim(),
      nameEn: normalizeText(nameEn),
      logo: logo.trim(),
      website: normalizeText(website),
      description: normalizeText(description),
      descriptionEn: normalizeText(descriptionEn),
      tier,
      order: typeof order === "number" ? order : 0,
      isActive: isActive !== false,
      showOnHomepage: showOnHomepage === true,
    },
  });

  return NextResponse.json({ success: true, data: partner, message: "Partner created" }, { status: 201 });
}
