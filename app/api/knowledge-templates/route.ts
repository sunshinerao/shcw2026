import { NextRequest, NextResponse } from "next/server";
import { KnowledgeTemplateType } from "@prisma/client";
import { requireInsightAdmin } from "@/lib/insight-auth";
import { createTemplate, getTemplatesByType, initializeDefaultTemplates } from "@/lib/knowledge-template-db";
import { normalizeTemplateConfigForSystem } from "@/lib/knowledge-template-import";
import { SUPPORTED_KNOWLEDGE_TEMPLATE_CODES } from "@/lib/knowledge-type-config";
import { getSystemSettingsForServer } from "@/lib/system-settings";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireInsightAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await initializeDefaultTemplates();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const filterSupported = <T extends { code?: string | null }>(templates: T[]) => templates;

    if (type && Object.values(KnowledgeTemplateType).includes(type as KnowledgeTemplateType)) {
      const templates = await getTemplatesByType(type as KnowledgeTemplateType);
      return NextResponse.json({ success: true, data: filterSupported(templates) });
    }

    const [formalTemplates, webTemplates, systemSettings] = await Promise.all([
      getTemplatesByType(KnowledgeTemplateType.FORMAL_DOCUMENT),
      getTemplatesByType(KnowledgeTemplateType.WEBPAGE_DISPLAY),
      getSystemSettingsForServer(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        formalTemplates: filterSupported(formalTemplates),
        webTemplates: filterSupported(webTemplates),
        typeSettings: systemSettings.knowledgeTypeSettings,
      },
    });
  } catch (error) {
    console.error("List knowledge templates error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireInsightAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { code, name, nameEn, description, templateType, config, isDefault, sourceHtml } = body;

    if (!code || !name || !templateType || !config) {
      return NextResponse.json(
        { success: false, error: "code, name, templateType and config are required" },
        { status: 400 }
      );
    }

    if (!Object.values(KnowledgeTemplateType).includes(templateType as KnowledgeTemplateType)) {
      return NextResponse.json({ success: false, error: "Invalid template type" }, { status: 400 });
    }

    const normalized = normalizeTemplateConfigForSystem({
      templateType: templateType as any,
      config,
      sourceHtml: typeof sourceHtml === "string" ? sourceHtml : undefined,
    });

    const created = await createTemplate({
      code: String(code).trim(),
      name: String(name).trim(),
      nameEn: typeof nameEn === "string" ? nameEn.trim() : undefined,
      description: typeof description === "string" ? description.trim() : undefined,
      templateType: templateType as KnowledgeTemplateType,
      config: normalized.config,
      isDefault: Boolean(isDefault),
    });

    return NextResponse.json({ success: true, data: created, validation: normalized.validation }, { status: 201 });
  } catch (error) {
    console.error("Create knowledge template error:", error);
    return NextResponse.json({ success: false, error: "Failed to create template" }, { status: 500 });
  }
}
