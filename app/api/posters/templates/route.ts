import { NextRequest, NextResponse } from "next/server";
import { PosterTemplateType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePosterAdmin } from "@/lib/poster-auth";

export async function GET(req: NextRequest) {
  try {
    const admin = await requirePosterAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    const templates = await prisma.posterTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ templateType: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error("List poster templates error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requirePosterAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { templateName, templateType, aspectRatio, layoutJson, background, fontConfig, isActive, sortOrder } = body;

    if (!templateName?.trim() || !templateType || !aspectRatio || !layoutJson) {
      return NextResponse.json({ success: false, error: "templateName, templateType, aspectRatio and layoutJson are required" }, { status: 400 });
    }

    if (!Object.values(PosterTemplateType).includes(templateType)) {
      return NextResponse.json({ success: false, error: "Invalid templateType" }, { status: 400 });
    }

    const created = await prisma.posterTemplate.create({
      data: {
        templateName: templateName.trim(),
        templateType,
        aspectRatio: aspectRatio.trim(),
        layoutJson,
        background: background?.trim() || null,
        fontConfig: fontConfig || null,
        isActive: typeof isActive === "boolean" ? isActive : true,
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("Create poster template error:", error);
    return NextResponse.json({ success: false, error: "Failed to create template" }, { status: 500 });
  }
}
