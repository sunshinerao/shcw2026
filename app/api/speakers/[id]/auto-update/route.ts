import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSystemSettingsForServer } from "@/lib/system-settings";
import { canManageSpeakers } from "@/lib/permissions";

type AutoUpdateSuggestion = {
  organization?: string | null;
  organizationEn?: string | null;
  title?: string | null;
  titleEn?: string | null;
  bio?: string | null;
  bioEn?: string | null;
  avatarUrl?: string | null;
};

type ResponsesPayload = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

function extractResponsesText(payload: ResponsesPayload): string | null {
  if (typeof payload.output_text === "string" && payload.output_text.trim().length > 0) {
    return payload.output_text;
  }

  for (const item of payload.output || []) {
    for (const block of item.content || []) {
      if (typeof block.text === "string" && block.text.trim().length > 0) {
        return block.text;
      }
    }
  }

  return null;
}

function sanitizeSuggestion(raw: AutoUpdateSuggestion, includeAvatar: boolean): AutoUpdateSuggestion {
  const next: AutoUpdateSuggestion = {
    organization: typeof raw.organization === "string" ? raw.organization.trim() : null,
    organizationEn: typeof raw.organizationEn === "string" ? raw.organizationEn.trim() : null,
    title: typeof raw.title === "string" ? raw.title.trim() : null,
    titleEn: typeof raw.titleEn === "string" ? raw.titleEn.trim() : null,
    bio: typeof raw.bio === "string" ? raw.bio.trim() : null,
    bioEn: typeof raw.bioEn === "string" ? raw.bioEn.trim() : null,
  };

  if (includeAvatar && typeof raw.avatarUrl === "string" && raw.avatarUrl.trim().length > 0) {
    next.avatarUrl = raw.avatarUrl.trim();
  }

  return next;
}

function parseSuggestion(content: string): AutoUpdateSuggestion {
  let raw = content.trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    raw = fenced[1].trim();
  }

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("No JSON object found in AI response");
  }

  return JSON.parse(raw.slice(start, end + 1)) as AutoUpdateSuggestion;
}

async function fetchSpeakerInfo(params: {
  apiKey: string;
  model: string;
  name: string;
  nameEn: string | null;
  organization: string;
  linkedinUrl: string | null;
  includeAvatar: boolean;
}): Promise<AutoUpdateSuggestion> {
  const displayName = params.nameEn ? `${params.name} (${params.nameEn})` : params.name;
  const linkedinHint = params.linkedinUrl ? ` LinkedIn URL hint: ${params.linkedinUrl}.` : "";
  const avatarField = params.includeAvatar
    ? "- avatarUrl: direct public image URL for a professional headshot. Prefer LinkedIn CDN image URL or official organization page image URL. Must be a direct image URL ending with .jpg/.jpeg/.png/.webp when possible; if unavailable return null."
    : "";

  const prompt = `Find reliable professional profile information for this speaker:\nName: ${displayName}\nOrganization hint: ${params.organization}.${linkedinHint}\n\nReturn ONLY valid JSON with fields below (unknown => null):\n- organization\n- organizationEn\n- title\n- titleEn\n- bio (Chinese, factual, 2-4 sentences)\n- bioEn (English, factual, 2-4 sentences)\n${avatarField}\n\nRules: no fabrication, no markdown, JSON only.`;

  let content: string | null = null;

  // Prefer Responses API with web search tool.
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    const responsesRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        tools: [{ type: "web_search_preview" }],
        temperature: 0.1,
        input: prompt,
      }),
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (responsesRes.ok) {
      const payload = await responsesRes.json() as ResponsesPayload;
      const parsed = extractResponsesText(payload);
      if (parsed) {
        content = parsed;
      }
    }
  } catch {
    // fallback below
  }

  // Fallback to chat completions if responses API unavailable.
  if (!content) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        temperature: 0.2,
        messages: [
          { role: "system", content: "You are a factual assistant. Return JSON only." },
          { role: "user", content: prompt },
        ],
      }),
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!chatRes.ok) {
      const errorText = await chatRes.text();
      throw new Error(`OpenAI request failed: ${chatRes.status} ${errorText}`);
    }

    const payload = await chatRes.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const message = payload.choices?.[0]?.message?.content;
    if (typeof message !== "string" || !message.trim()) {
      throw new Error("OpenAI response does not contain content");
    }
    content = message;
  }

  return sanitizeSuggestion(parseSuggestion(content), params.includeAvatar);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !canManageSpeakers(user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const settings = await getSystemSettingsForServer();
    const apiKey = settings.openaiApiKey || process.env.OPENAI_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "OpenAI API key is not configured" },
        { status: 400 },
      );
    }

    const speaker = await prisma.speaker.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        nameEn: true,
        organization: true,
        linkedin: true,
        avatar: true,
      },
    });

    if (!speaker) {
      return NextResponse.json({ success: false, error: "Speaker not found" }, { status: 404 });
    }

    const includeAvatar = !speaker.avatar;

    const suggestion = await fetchSpeakerInfo({
      apiKey,
      model: settings.openaiModel,
      name: speaker.name,
      nameEn: speaker.nameEn ?? null,
      organization: speaker.organization,
      linkedinUrl: speaker.linkedin ?? null,
      includeAvatar,
    });

    return NextResponse.json({
      success: true,
      data: suggestion,
      meta: {
        includeAvatar,
      },
    });
  } catch (error) {
    console.error("Auto-update speaker error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to auto-update speaker",
      },
      { status: 500 },
    );
  }
}
