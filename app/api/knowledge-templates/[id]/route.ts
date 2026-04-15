import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInsightAdmin } from "@/lib/insight-auth";
import { deactivateTemplate, updateTemplate } from "@/lib/knowledge-template-db";
import { normalizeTemplateConfigForSystem } from "@/lib/knowledge-template-import";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireInsightAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const existing = await prisma.knowledgeTemplate.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Template not found" }, { status: 404 });
    }

    const normalized = normalizeTemplateConfigForSystem({
      templateType: existing.templateType as any,
      config: body.config,
      sourceHtml: typeof body.sourceHtml === "string" ? body.sourceHtml : undefined,
    });

    const updated = await updateTemplate(params.id, {
      name: typeof body.name === "string" ? body.name.trim() : undefined,
      nameEn: typeof body.nameEn === "string" ? body.nameEn.trim() : undefined,
      description: typeof body.description === "string" ? body.description.trim() : undefined,
      config: body.config !== undefined ? normalized.config : undefined,
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
      isDefault: typeof body.isDefault === "boolean" ? body.isDefault : undefined,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
    });

    return NextResponse.json({ success: true, data: updated, validation: normalized.validation });
  } catch (error) {
    console.error("Update knowledge template error:", error);
    return NextResponse.json({ success: false, error: "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireInsightAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await deactivateTemplate(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Deactivate knowledge template error:", error);
    return NextResponse.json({ success: false, error: "Failed to deactivate template" }, { status: 500 });
  }
}
