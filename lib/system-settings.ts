import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const SYSTEM_SETTINGS_KEY = "system_settings";
const ENCRYPTION_PREFIX = "enc:v1";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

type StoredSettingsExtra = {
  openaiApiKeyEncrypted?: string | null;
  openaiModel?: string | null;
  aiHighlightsEnabled?: boolean;
  autoGenerateHighlightsOnSave?: boolean;
  highlightCount?: number;
  newsEnabled?: boolean;
};

export type SystemSettings = {
  openaiApiKey: string | null;
  openaiModel: string;
  aiHighlightsEnabled: boolean;
  autoGenerateHighlightsOnSave: boolean;
  highlightCount: number;
  newsEnabled: boolean;
};

export type AdminSystemSettings = Omit<SystemSettings, "openaiApiKey"> & {
  hasOpenaiApiKey: boolean;
  openaiApiKeyMasked: string | null;
};

function getEncryptionSecret(): string | null {
  return process.env.SYSTEM_SETTINGS_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || null;
}

function deriveAesKey(secret: string) {
  return createHash("sha256").update(secret).digest();
}

function encryptSecret(plainText: string): string {
  const secret = getEncryptionSecret();
  if (!secret) {
    throw new Error("SYSTEM_SETTINGS_ENCRYPTION_KEY or NEXTAUTH_SECRET is required to store API keys safely");
  }

  const key = deriveAesKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [ENCRYPTION_PREFIX, iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
}

function decryptSecret(payload: string | null | undefined): string | null {
  if (!payload) {
    return null;
  }

  // Format: enc:v1:<ivBase64>:<tagBase64>:<dataBase64>
  // Keep backward compatibility in case older payloads used a different prefix layout.
  let ivBase64: string | undefined;
  let tagBase64: string | undefined;
  let dataBase64: string | undefined;

  if (payload.startsWith(`${ENCRYPTION_PREFIX}:`)) {
    const parts = payload.split(":");
    ivBase64 = parts[2];
    tagBase64 = parts[3];
    dataBase64 = parts[4];
  } else {
    const legacy = payload.split(":");
    if (legacy.length >= 4) {
      ivBase64 = legacy[1];
      tagBase64 = legacy[2];
      dataBase64 = legacy[3];
    }
  }

  if (!ivBase64 || !tagBase64 || !dataBase64) {
    return null;
  }

  const secret = getEncryptionSecret();
  if (!secret) {
    return null;
  }

  try {
    const key = deriveAesKey(secret);
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivBase64, "base64"));
    decipher.setAuthTag(Buffer.from(tagBase64, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataBase64, "base64")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

function normalizeHighlightCount(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 5;
  }

  return Math.min(6, Math.max(3, Math.floor(value)));
}

function normalizeExtra(extra: unknown): StoredSettingsExtra {
  if (!extra || typeof extra !== "object" || Array.isArray(extra)) {
    return {};
  }

  const raw = extra as StoredSettingsExtra;
  return {
    openaiApiKeyEncrypted: typeof raw.openaiApiKeyEncrypted === "string" ? raw.openaiApiKeyEncrypted : null,
    openaiModel: typeof raw.openaiModel === "string" && raw.openaiModel.trim().length > 0 ? raw.openaiModel.trim() : DEFAULT_OPENAI_MODEL,
    aiHighlightsEnabled: raw.aiHighlightsEnabled === true,
    autoGenerateHighlightsOnSave: raw.autoGenerateHighlightsOnSave !== false,
    highlightCount: normalizeHighlightCount(raw.highlightCount),
    newsEnabled: raw.newsEnabled !== false,
  };
}

function maskApiKey(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const safe = value.trim();
  if (safe.length <= 8) {
    return "********";
  }

  return `${safe.slice(0, 4)}...${safe.slice(-4)}`;
}

function sanitizeOpenAiApiKey(value: string): string {
  const trimmed = value.trim();
  const unquoted = trimmed.replace(/^["'`]+|["'`]+$/g, "");
  return unquoted.replace(/\s+/g, "");
}

async function validateOpenAiCredentials(apiKey: string, model: string): Promise<void> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 8,
      temperature: 0,
      messages: [{ role: "user", content: "ping" }],
    }),
    cache: "no-store",
  });

  if (response.ok) {
    return;
  }

  let code: string | undefined;
  let message: string | undefined;

  try {
    const payload = await response.json();
    code = payload?.error?.code;
    message = payload?.error?.message;
  } catch {
    message = await response.text();
  }

  if (code === "invalid_api_key") {
    throw new Error("OpenAI API Key 无效，请确认后重新粘贴。");
  }

  if (code === "model_not_found") {
    throw new Error(`OpenAI 模型不可用: ${model}`);
  }

  throw new Error(message || `OpenAI 校验失败（HTTP ${response.status}）`);
}

async function readSettingsExtra(): Promise<StoredSettingsExtra> {
  const content = await prisma.siteContent.findUnique({ where: { key: SYSTEM_SETTINGS_KEY } });
  return normalizeExtra(content?.extra);
}

export async function getSystemSettingsForServer(): Promise<SystemSettings> {
  const extra = await readSettingsExtra();

  return {
    openaiApiKey: decryptSecret(extra.openaiApiKeyEncrypted) || null,
    openaiModel: extra.openaiModel || DEFAULT_OPENAI_MODEL,
    aiHighlightsEnabled: extra.aiHighlightsEnabled === true,
    autoGenerateHighlightsOnSave: extra.autoGenerateHighlightsOnSave !== false,
    highlightCount: normalizeHighlightCount(extra.highlightCount),
    newsEnabled: extra.newsEnabled !== false,
  };
}

export async function getSystemSettingsForAdmin(): Promise<AdminSystemSettings> {
  const serverSettings = await getSystemSettingsForServer();

  return {
    hasOpenaiApiKey: Boolean(serverSettings.openaiApiKey),
    openaiApiKeyMasked: maskApiKey(serverSettings.openaiApiKey),
    openaiModel: serverSettings.openaiModel,
    aiHighlightsEnabled: serverSettings.aiHighlightsEnabled,
    autoGenerateHighlightsOnSave: serverSettings.autoGenerateHighlightsOnSave,
    highlightCount: serverSettings.highlightCount,
    newsEnabled: serverSettings.newsEnabled,
  };
}

export type UpdateSystemSettingsInput = {
  openaiApiKey?: string | null;
  openaiModel?: string;
  aiHighlightsEnabled?: boolean;
  autoGenerateHighlightsOnSave?: boolean;
  highlightCount?: number;
  newsEnabled?: boolean;
};

export async function updateSystemSettings(input: UpdateSystemSettingsInput) {
  const existing = await readSettingsExtra();
  const next: StoredSettingsExtra = {
    ...existing,
  };

  const nextModel =
    input.openaiModel !== undefined
      ? input.openaiModel.trim() || DEFAULT_OPENAI_MODEL
      : next.openaiModel || DEFAULT_OPENAI_MODEL;

  if (input.openaiApiKey !== undefined) {
    const sanitized = sanitizeOpenAiApiKey(input.openaiApiKey || "");
    if (sanitized) {
      await validateOpenAiCredentials(sanitized, nextModel);
      next.openaiApiKeyEncrypted = encryptSecret(sanitized);
    } else {
      next.openaiApiKeyEncrypted = null;
    }
  }

  if (input.openaiModel !== undefined) {
    next.openaiModel = nextModel;

    const existingKey = decryptSecret(next.openaiApiKeyEncrypted);
    if (existingKey) {
      await validateOpenAiCredentials(existingKey, nextModel);
    }
  }

  if (input.aiHighlightsEnabled !== undefined) {
    next.aiHighlightsEnabled = Boolean(input.aiHighlightsEnabled);
  }

  if (input.autoGenerateHighlightsOnSave !== undefined) {
    next.autoGenerateHighlightsOnSave = Boolean(input.autoGenerateHighlightsOnSave);
  }

  if (input.highlightCount !== undefined) {
    next.highlightCount = normalizeHighlightCount(input.highlightCount);
  }

  if (input.newsEnabled !== undefined) {
    next.newsEnabled = Boolean(input.newsEnabled);
  }

  await prisma.siteContent.upsert({
    where: { key: SYSTEM_SETTINGS_KEY },
    create: {
      key: SYSTEM_SETTINGS_KEY,
      title: "System Settings",
      titleEn: "System Settings",
      description: "Admin-managed runtime system settings",
      descriptionEn: "Admin-managed runtime system settings",
      extra: next,
    },
    update: {
      extra: next,
    },
  });

  return getSystemSettingsForAdmin();
}
