/**
 * lib/invitation-ai-enhancer.ts
 *
 * Uses OpenAI to generate a personalized invitation body paragraph when the guest
 * has filled in their purpose of attendance (参会目的).
 *
 * Result is returned as an HTML string (one or two <p> elements) that replaces the
 * template body. If AI is unavailable or fails, returns null and the caller falls
 * back to the template body.
 *
 * Priority: customMainContent > AI-enhanced body > event template > global template
 */

import { getSystemSettingsForServer } from "@/lib/system-settings";

export interface InvitationAiEnhancerParams {
  language: "zh" | "en";
  /** Rendered template body (HTML) – used as context for tone and format */
  templateBodyHtml: string;
  guestName: string;
  guestTitle?: string | null;
  guestOrg?: string | null;
  /** Guest's personal bio from the user profile */
  guestBio?: string | null;
  /** 参会目的 entered by the guest */
  purpose: string;
  eventTitle: string;
  /** Chinese event description / shortDesc for zh; English for en */
  eventDescription?: string | null;
  eventShortDesc?: string | null;
  /** Maximum number of characters (plain-text) the body may contain */
  charLimit: number;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function buildZhPrompt(params: InvitationAiEnhancerParams): string {
  const guestDesc = [params.guestTitle, params.guestOrg].filter(Boolean).join("，");
  const lines: string[] = [
    "你是一位专业的国际会议邀请函撰写专家。",
    "请根据以下信息，为邀请函撰写一段简洁、正式的中文正文（1–2段，不超过" + params.charLimit + "个字）。",
    "要求：",
    "- 采用庄重的书面语，体现对嘉宾专业价值的高度认可",
    "- 明确提及嘉宾在本次峰会的参与形式/贡献（来自\u300C参会目的\u300D字段）",
    "- 可简要呼应嘉宾背景（职务/机构），突出其参与的意义",
    "- 可结合会议主题/描述，增强邀请的针对性",
    "- 结尾不加问候语或签名",
    "- 仅输出两个 <p>…</p> 段落，不加任何其他内容",
    "",
    "活动名称：" + params.eventTitle,
  ];
  if (params.eventShortDesc) lines.push("会议简介：" + params.eventShortDesc);
  if (params.eventDescription) lines.push("详细介绍：" + params.eventDescription);
  lines.push("嘉宾姓名：" + params.guestName);
  if (guestDesc) lines.push("嘉宾身份：" + guestDesc);
  if (params.guestBio) lines.push("嘉宾背景：" + params.guestBio);
  lines.push("参会目的：" + params.purpose);
  lines.push("");
  lines.push("参考原模板正文（仅供语气参考，不要直接复制）：");
  lines.push(stripHtml(params.templateBodyHtml));
  return lines.join("\n");
}

function buildEnPrompt(params: InvitationAiEnhancerParams): string {
  const guestDesc = [params.guestTitle, params.guestOrg].filter(Boolean).join(", ");
  const lines: string[] = [
    "You are an expert writer of formal international conference invitation letters.",
    "Write a concise, formal English invitation body (1–2 paragraphs, plain text length ≤" + params.charLimit + " characters).",
    "Requirements:",
    "- Use a warm yet formal register that conveys genuine appreciation for the guest's expertise",
    "- Explicitly reference the guest's role/contribution at the event (derived from their stated purpose)",
    "- Optionally weave in the guest's professional background to underscore the significance of their participation",
    "- Align with the conference theme where relevant",
    "- Do NOT include salutation, closing, or signature",
    "- Output exactly two <p>…</p> HTML paragraphs, nothing else",
    "",
    "Event name: " + params.eventTitle,
  ];
  if (params.eventShortDesc) lines.push("Event overview: " + params.eventShortDesc);
  if (params.eventDescription) lines.push("Description: " + params.eventDescription);
  lines.push("Guest name: " + params.guestName);
  if (guestDesc) lines.push("Guest background: " + guestDesc);
  if (params.guestBio) lines.push("Guest bio: " + params.guestBio);
  lines.push("Purpose of attendance: " + params.purpose);
  lines.push("");
  lines.push("Reference template body (use only to match tone and structure, do NOT copy verbatim):");
  lines.push(stripHtml(params.templateBodyHtml));
  return lines.join("\n");
}

function extractParagraphs(raw: string): string | null {
  // Try to extract <p>…</p> blocks if the model returned them.
  const matches = raw.match(/<p[^>]*>[\s\S]*?<\/p>/gi);
  if (matches && matches.length > 0) {
    return matches.join("\n");
  }

  // If model returned plain text, wrap each non-empty paragraph in <p>.
  const paras = raw
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (paras.length > 0) {
    return paras.map((p) => `<p>${p}</p>`).join("\n");
  }

  return null;
}

/**
 * Generate an AI-enhanced invitation body based on the guest's purpose and context.
 *
 * @returns HTML string with <p> paragraphs, or null if AI is unavailable / fails.
 */
export async function generateAiEnhancedInvitationBody(
  params: InvitationAiEnhancerParams
): Promise<string | null> {
  if (!params.purpose?.trim()) return null;

  let apiKey: string;
  let model: string;
  try {
    const settings = await getSystemSettingsForServer();
    apiKey = settings.openaiApiKey || process.env.OPENAI_API_KEY || "";
    model = settings.openaiModel || "gpt-4o-mini";
  } catch {
    apiKey = process.env.OPENAI_API_KEY || "";
    model = "gpt-4o-mini";
  }

  if (!apiKey) return null;

  const userPrompt =
    params.language === "zh" ? buildZhPrompt(params) : buildEnPrompt(params);

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 600,
        messages: [
          {
            role: "system",
            content:
              params.language === "zh"
                ? "你是一位专业国际会议邀请函撰写专家，擅长中英文正式商务写作。仅输出指定格式的 HTML 段落。"
                : "You are an expert writer of formal international conference invitation letters. Output only the requested HTML paragraphs.",
          },
          { role: "user", content: userPrompt },
        ],
      }),
      cache: "no-store",
    });
  } catch {
    return null;
  }

  if (!response.ok) return null;

  let completion: unknown;
  try {
    completion = await response.json();
  } catch {
    return null;
  }

  const content =
    (completion as { choices?: { message?: { content?: string } }[] })
      ?.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) return null;

  return extractParagraphs(content.trim());
}
