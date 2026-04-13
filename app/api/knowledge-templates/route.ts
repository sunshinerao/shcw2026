import { NextRequest, NextResponse } from "next/server";
import { KnowledgeTemplateType } from "@prisma/client";
import { requireInsightAdmin } from "@/lib/insight-auth";
import { getTemplatesByType, initializeDefaultTemplates } from "@/lib/knowledge-template-db";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireInsightAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await initializeDefaultTemplates();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (type && Object.values(KnowledgeTemplateType).includes(type as KnowledgeTemplateType)) {
      const templates = await getTemplatesByType(type as KnowledgeTemplateType);
      return NextResponse.json({ success: true, data: templates });
    }

    const [formalTemplates, webTemplates] = await Promise.all([
      getTemplatesByType(KnowledgeTemplateType.FORMAL_DOCUMENT),
      getTemplatesByType(KnowledgeTemplateType.WEBPAGE_DISPLAY),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        formalTemplates,
        webTemplates,
      },
    });
  } catch (error) {
    console.error("List knowledge templates error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch templates" }, { status: 500 });
  }
}
