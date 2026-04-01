import { getSystemSettingsForServer } from "@/lib/system-settings";

type EventTranslationInput = {
  title?: string | null;
  description?: string | null;
  shortDesc?: string | null;
  venue?: string | null;
  city?: string | null;
};

type EventTranslationOutput = {
  titleEn?: string;
  descriptionEn?: string;
  shortDescEn?: string;
  venueEn?: string;
  cityEn?: string;
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
  const city = normalizeText(input.city);

  if (title) payload.title = title;
  if (description) payload.description = description;
  if (shortDesc) payload.shortDesc = shortDesc;
  if (venue) payload.venue = venue;
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
  const cityEn = normalizeText(typeof parsed.city === "string" ? parsed.city : null);

  if (titleEn) output.titleEn = titleEn;
  if (descriptionEn) output.descriptionEn = descriptionEn;
  if (shortDescEn) output.shortDescEn = shortDescEn;
  if (venueEn) output.venueEn = venueEn;
  if (cityEn) output.cityEn = cityEn;

  return output;
}
