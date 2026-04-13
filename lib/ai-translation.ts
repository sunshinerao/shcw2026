import { getSystemSettingsForServer } from "@/lib/system-settings";

type EventTranslationInput = {
  title?: string | null;
  description?: string | null;
  shortDesc?: string | null;
  venue?: string | null;
  address?: string | null;
  city?: string | null;
};

type EventTranslationOutput = {
  titleEn?: string;
  descriptionEn?: string;
  shortDescEn?: string;
  venueEn?: string;
  addressEn?: string;
  cityEn?: string;
};

type InsightTranslationInput = {
  title?: string | null;
  subtitle?: string | null;
  summary?: string | null;
  content?: string | null;
};

type InsightTranslationOutput = {
  titleEn?: string;
  subtitleEn?: string;
  summaryEn?: string;
  contentEn?: string;
};

function normalizeText(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Continue to fenced-json recovery.
  }

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return null;
    }
  }

  return null;
}

export async function translateMissingEventFieldsToEnglish(
  input: EventTranslationInput
): Promise<EventTranslationOutput> {
  const payload: Record<string, string> = {};

  const title = normalizeText(input.title);
  const description = normalizeText(input.description);
  const shortDesc = normalizeText(input.shortDesc);
  const venue = normalizeText(input.venue);
  const address = normalizeText(input.address);
  const city = normalizeText(input.city);

  if (title) payload.title = title;
  if (description) payload.description = description;
  if (shortDesc) payload.shortDesc = shortDesc;
  if (venue) payload.venue = venue;
  if (address) payload.address = address;
  if (city) payload.city = city;

  if (Object.keys(payload).length === 0) {
    return {};
  }

  const settings = await getSystemSettingsForServer();
  const apiKey = settings.openaiApiKey || process.env.OPENAI_API_KEY || "";
  if (!apiKey) {
    return {};
  }

  const model = settings.openaiModel;
  const prompt = [
    "Translate the JSON values from Chinese to natural English.",
    "Keep proper nouns and brand names accurate.",
    "Return JSON only with the same keys.",
    "Input JSON:",
    JSON.stringify(payload),
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "You are a professional bilingual editor. Output valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return {};
  }

  const completion = await response.json();
  const content = completion?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    return {};
  }

  const parsed = extractJsonObject(content);
  if (!parsed) {
    return {};
  }

  const output: EventTranslationOutput = {};
  const titleEn = normalizeText(typeof parsed.title === "string" ? parsed.title : null);
  const descriptionEn = normalizeText(typeof parsed.description === "string" ? parsed.description : null);
  const shortDescEn = normalizeText(typeof parsed.shortDesc === "string" ? parsed.shortDesc : null);
  const venueEn = normalizeText(typeof parsed.venue === "string" ? parsed.venue : null);
  const addressEn = normalizeText(typeof parsed.address === "string" ? parsed.address : null);
  const cityEn = normalizeText(typeof parsed.city === "string" ? parsed.city : null);

  if (titleEn) output.titleEn = titleEn;
  if (descriptionEn) output.descriptionEn = descriptionEn;
  if (shortDescEn) output.shortDescEn = shortDescEn;
  if (venueEn) output.venueEn = venueEn;
  if (addressEn) output.addressEn = addressEn;
  if (cityEn) output.cityEn = cityEn;

  return output;
}

/**
 * Translate a record of string values (e.g. speaker topics) from Chinese to English.
 * Keys are preserved as-is in the output.
 */
export async function translateRecordValuesToEnglish(
  record: Record<string, string>
): Promise<Record<string, string>> {
  const entries = Object.entries(record).filter(([, v]) => v && v.trim());
  if (entries.length === 0) return {};

  const settings = await getSystemSettingsForServer();
  const apiKey = settings.openaiApiKey || process.env.OPENAI_API_KEY || "";
  if (!apiKey) return {};

  // Use numeric indices as keys to avoid confusion with UUIDs
  const indexToKey: Record<string, string> = {};
  const payload: Record<string, string> = {};
  entries.forEach(([key, value], i) => {
    indexToKey[String(i)] = key;
    payload[String(i)] = value;
  });

  const model = settings.openaiModel;
  const prompt = [
    "Translate the JSON values from Chinese to natural English.",
    "Keep proper nouns and brand names accurate.",
    "Return JSON only with the same numeric keys.",
    "Input JSON:",
    JSON.stringify(payload),
  ].join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: "You are a professional bilingual editor. Output valid JSON only." },
          { role: "user", content: prompt },
        ],
      }),
      cache: "no-store",
    });

    if (!response.ok) return {};
    const completion = await response.json();
    const content = completion?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return {};
    const parsed = extractJsonObject(content);
    if (!parsed) return {};

    const out: Record<string, string> = {};
    Object.entries(parsed).forEach(([idx, val]) => {
      const originalKey = indexToKey[idx];
      if (originalKey && typeof val === "string" && val.trim()) {
        out[originalKey] = val.trim();
      }
    });
    return out;
  } catch {
    return {};
  }
}

export async function translateMissingInsightFieldsToEnglish(
  input: InsightTranslationInput
): Promise<InsightTranslationOutput> {
  const payload: Record<string, string> = {};

  const title = normalizeText(input.title);
  const subtitle = normalizeText(input.subtitle);
  const summary = normalizeText(input.summary);
  const content = normalizeText(input.content);

  if (title) payload.title = title;
  if (subtitle) payload.subtitle = subtitle;
  if (summary) payload.summary = summary;
  if (content) payload.content = content;

  if (Object.keys(payload).length === 0) {
    return {};
  }

  const settings = await getSystemSettingsForServer();
  const apiKey = settings.openaiApiKey || process.env.OPENAI_API_KEY || "";
  if (!apiKey) {
    return {};
  }

  const model = settings.openaiModel;
  const prompt = [
    "Translate the JSON values from Chinese to natural English.",
    "Keep proper nouns and brand names accurate.",
    "If a value already appears to be English, keep it as-is.",
    "Return JSON only with the same keys.",
    "Input JSON:",
    JSON.stringify(payload),
  ].join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "You are a professional bilingual editor. Output valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return {};
    }

    const completion = await response.json();
    const contentRaw = completion?.choices?.[0]?.message?.content;
    if (typeof contentRaw !== "string" || !contentRaw.trim()) {
      return {};
    }

    const parsed = extractJsonObject(contentRaw);
    if (!parsed) {
      return {};
    }

    const output: InsightTranslationOutput = {};
    const titleEn = normalizeText(typeof parsed.title === "string" ? parsed.title : null);
    const subtitleEn = normalizeText(typeof parsed.subtitle === "string" ? parsed.subtitle : null);
    const summaryEn = normalizeText(typeof parsed.summary === "string" ? parsed.summary : null);
    const contentEn = normalizeText(typeof parsed.content === "string" ? parsed.content : null);

    if (titleEn) output.titleEn = titleEn;
    if (subtitleEn) output.subtitleEn = subtitleEn;
    if (summaryEn) output.summaryEn = summaryEn;
    if (contentEn) output.contentEn = contentEn;

    return output;
  } catch {
    return {};
  }
}
