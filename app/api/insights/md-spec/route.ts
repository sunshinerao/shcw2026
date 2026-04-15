import { NextRequest, NextResponse } from "next/server";
import { requireInsightAdmin } from "@/lib/insight-auth";
import { buildStructuredMarkdownSpec, normalizeKnowledgeAssetType } from "@/lib/knowledge-type-config";
import { getSystemSettingsForServer } from "@/lib/system-settings";

export const dynamic = "force-dynamic";

/**
 * GET /api/insights/md-spec?type=REPORT
 * Download one bilingual, structured markdown source template.
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await requireInsightAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const type = normalizeKnowledgeAssetType(new URL(req.url).searchParams.get("type"));
    const systemSettings = await getSystemSettingsForServer();
    const content = buildStructuredMarkdownSpec(type, systemSettings.knowledgeTypeSettings);
    const filename = `knowledge_asset_spec_${type.toLowerCase()}.md`;

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("MD spec download error:", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
