import { NextRequest, NextResponse } from "next/server";
import { KnowledgeTemplateType } from "@prisma/client";
import { requireInsightAdmin } from "@/lib/insight-auth";
import { createTemplate } from "@/lib/knowledge-template-db";
import { importFigmaHtmlAsFormalTemplate } from "@/lib/knowledge-template-import";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireInsightAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const contentType = req.headers.get("content-type") || "";
    let body: Record<string, any> = {};

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const uploaded = form.get("file");
      const sourceHtmlFromFile = uploaded && typeof uploaded === "object" && "text" in uploaded && typeof uploaded.text === "function"
        ? await uploaded.text()
        : "";

      body = {
        createTemplate: ["true", "1", "yes"].includes(String(form.get("createTemplate") || "").toLowerCase()),
        name: String(form.get("name") || ""),
        nameEn: String(form.get("nameEn") || ""),
        code: String(form.get("code") || ""),
        description: String(form.get("description") || ""),
        sourceHtml: sourceHtmlFromFile || String(form.get("sourceHtml") || ""),
        isDefault: ["true", "1", "yes"].includes(String(form.get("isDefault") || "").toLowerCase()),
        config: { formal: {} },
      };
    } else {
      body = await req.json();
    }

    const sourceHtml = typeof body.sourceHtml === "string" ? body.sourceHtml.trim() : "";
    if (!sourceHtml) {
      return NextResponse.json({ success: false, error: "sourceHtml is required" }, { status: 400 });
    }

    const imported = importFigmaHtmlAsFormalTemplate({
      sourceHtml,
      baseConfig: body?.config?.formal || {},
    });

    if (!body.createTemplate) {
      return NextResponse.json({
        success: true,
        data: {
          config: { formal: imported.config },
          validation: imported.validation,
        },
      });
    }

    const code = typeof body.code === "string" && body.code.trim()
      ? body.code.trim()
      : `formal_import_${Date.now()}`;
    const name = typeof body.name === "string" && body.name.trim()
      ? body.name.trim()
      : "Imported Figma Formal Template";

    const created = await createTemplate({
      code,
      name,
      nameEn: typeof body.nameEn === "string" ? body.nameEn.trim() : name,
      description: typeof body.description === "string"
        ? body.description.trim()
        : "Imported from Figma HTML and normalized by the formal template engine",
      templateType: KnowledgeTemplateType.FORMAL_DOCUMENT,
      config: { formal: imported.config },
      isDefault: Boolean(body.isDefault),
    });

    return NextResponse.json({
      success: true,
      data: created,
      validation: imported.validation,
    }, { status: 201 });
  } catch (error) {
    console.error("Import knowledge template HTML error:", error);
    return NextResponse.json({ success: false, error: "Failed to import HTML template" }, { status: 500 });
  }
}
