import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSystemSettingsForServer } from "@/lib/system-settings";

type GenerationLocale = "zh" | "en";

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function extractHighlights(raw: string, fallbackCount: number): string[] {
  try {
    const parsed = JSON.parse(raw) as { highlights?: unknown };
    const direct = toStringArray(parsed.highlights);
    if (direct.length > 0) {
      return direct.slice(0, fallbackCount);
    }
  } catch {
    // ignore and attempt to recover from fenced JSON
  }

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(raw.slice(start, end + 1)) as { highlights?: unknown };
      const recovered = toStringArray(parsed.highlights);
      if (recovered.length > 0) {
        return recovered.slice(0, fallbackCount);
      }
    } catch {
      return [];
    }
  }

  return [];
}

function buildPrompt(params: {
  locale: GenerationLocale;
  title: string;
  description: string;
  agendaLines: string[];
  speakerLines: string[];
  count: number;
}) {
  const { locale, title, description, agendaLines, speakerLines, count } = params;

  if (locale === "zh") {
    return `请根据以下活动信息生成 ${count} 条活动亮点。\n\n要求：\n1. 每条 14-32 个中文字符\n2. 不要空话，突出具体价值\n3. 不要出现夸张词（如“史上最强”）\n4. 只输出 JSON\n\n活动标题：${title}\n活动描述：${description}\n\n议程要点：\n${agendaLines.join("\n") || "- 暂无"}\n\n嘉宾要点：\n${speakerLines.join("\n") || "- 暂无"}\n\n输出格式：\n{"highlights":["亮点1","亮点2","亮点3","亮点4","亮点5"]}`;
  }

  return `Generate ${count} event highlights based on the following information.\n\nRequirements:\n1. Each highlight should be 8-20 words\n2. Be concrete and informative\n3. Avoid exaggerated marketing claims\n4. Output JSON only\n\nTitle: ${title}\nDescription: ${description}\n\nAgenda:\n${agendaLines.join("\n") || "- None"}\n\nSpeakers:\n${speakerLines.join("\n") || "- None"}\n\nOutput format:\n{"highlights":["Highlight 1","Highlight 2","Highlight 3","Highlight 4","Highlight 5"]}`;
}

async function generateHighlightsWithOpenAI(params: {
  apiKey: string;
  model: string;
  locale: GenerationLocale;
  title: string;
  description: string;
  agendaLines: string[];
  speakerLines: string[];
  count: number;
}): Promise<string[]> {
  const prompt = buildPrompt(params);

  let response: Response | null = null;
  let lastNetworkError: unknown = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${params.apiKey}`,
        },
        body: JSON.stringify({
          model: params.model,
          temperature: 0.4,
          messages: [
            {
              role: "system",
              content: "You are a concise event copywriter. Return valid JSON only.",
            },
            { role: "user", content: prompt },
          ],
        }),
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      break;
    } catch (error) {
      clearTimeout(timeout);
      lastNetworkError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }
  }

  if (!response) {
    const cause =
      lastNetworkError instanceof Error
        ? lastNetworkError.message
        : "Unknown network error";
    throw new Error(`OpenAI network request failed after retries: ${cause}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI response does not contain message content");
  }

  const highlights = extractHighlights(content, params.count);
  if (highlights.length < 3) {
    throw new Error("OpenAI returned insufficient highlights");
  }

  return highlights.slice(0, params.count);
}

/**
 * POST /api/events/[id]/generate-highlights
 * Generate AI highlights for an event.
 * Body: { reason?: "manual" | "save" }
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    const body = await req.json().catch(() => ({}));
    const reason = body?.reason === "save" ? "save" : "manual";

    const settings = await getSystemSettingsForServer();

    if (!settings.aiHighlightsEnabled) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "ai_disabled",
      });
    }

    if (reason === "save" && !settings.autoGenerateHighlightsOnSave) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "auto_generate_disabled",
      });
    }

    const apiKey = settings.openaiApiKey || process.env.OPENAI_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "OpenAI API key is not configured" },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: {
        agendaItems: {
          include: {
            speakers: {
              select: {
                name: true,
                nameEn: true,
                title: true,
                titleEn: true,
                organization: true,
                organizationEn: true,
              },
            },
          },
          orderBy: [{ agendaDate: "asc" }, { order: "asc" }, { startTime: "asc" }],
          take: 12,
        },
      },
    });

    if (!event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    const canManageEvent =
      user?.role === "ADMIN" ||
      (user?.role === "EVENT_MANAGER" && event.managerUserId === user.id);

    if (!canManageEvent) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const agendaLinesZh = event.agendaItems.map(
      (item) => `- ${item.startTime}-${item.endTime} ${item.title}${item.description ? `：${item.description}` : ""}`
    );

    const agendaLinesEn = event.agendaItems.map((item) => {
      const title = item.title;
      const desc = item.description;
      return `- ${item.startTime}-${item.endTime} ${title}${desc ? `: ${desc}` : ""}`;
    });

    const speakers = event.agendaItems.flatMap((item) => item.speakers);

    const speakerLinesZh = speakers.slice(0, 12).map((s) => {
      const name = s.name;
      const org = s.organization || "";
      const title = s.title || "";
      return `- ${name}${org ? `，${org}` : ""}${title ? `，${title}` : ""}`;
    });

    const speakerLinesEn = speakers.slice(0, 12).map((s) => {
      const name = s.nameEn || s.name;
      const org = s.organizationEn || s.organization || "";
      const title = s.titleEn || s.title || "";
      return `- ${name}${org ? `, ${org}` : ""}${title ? `, ${title}` : ""}`;
    });

    const zhHighlights = await generateHighlightsWithOpenAI({
      apiKey,
      model: settings.openaiModel,
      locale: "zh",
      title: event.title,
      description: event.description,
      agendaLines: agendaLinesZh,
      speakerLines: speakerLinesZh,
      count: settings.highlightCount,
    });

    const enHighlights = await generateHighlightsWithOpenAI({
      apiKey,
      model: settings.openaiModel,
      locale: "en",
      title: event.titleEn || event.title,
      description: event.descriptionEn || event.description,
      agendaLines: agendaLinesEn,
      speakerLines: speakerLinesEn,
      count: settings.highlightCount,
    });

    await prisma.event.update({
      where: { id: event.id },
      data: {
        highlights: zhHighlights,
        highlightsEn: enHighlights,
        highlightsGeneratedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        highlights: zhHighlights,
        highlightsEn: enHighlights,
      },
    });
  } catch (error) {
    console.error("Generate highlights error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate highlights",
      },
      { status: 500 }
    );
  }
}
