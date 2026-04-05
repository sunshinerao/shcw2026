import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const SIGNATURE_PRESETS_KEY = "invitation_signature_presets";

export type SignaturePresetType = "single" | "dual";

/**
 * A signature preset for English invitations.
 * type "single": one signatory (optionally with an image above the text).
 * type "dual":   two signatories side-by-side — A on the right, B on the left (per reference template).
 */
export type SignaturePreset = {
  id: string;
  label: string;
  type: SignaturePresetType;
  // --- single signatory ---
  singleImageUrl?: string;
  singleHtml?: string;
  // --- dual signatories (A = right, B = left) ---
  signatoryAImageUrl?: string;
  signatoryAHtml?: string;
  signatoryBImageUrl?: string;
  signatoryBHtml?: string;
};

type PresetsStore = {
  defaultPresetId: string;
  presets: SignaturePreset[];
};

const DEFAULT_PRESETS: PresetsStore = {
  defaultPresetId: "default-single",
  presets: [
    {
      id: "default-single",
      label: "Executive Committee (Single)",
      type: "single",
      singleHtml: "Shanghai Climate Week Executive Committee<br />March 2026",
    },
  ],
};

function isValidPreset(p: unknown): p is SignaturePreset {
  if (!p || typeof p !== "object" || Array.isArray(p)) return false;
  const r = p as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.label === "string" &&
    (r.type === "single" || r.type === "dual")
  );
}

function normalizePresetsStore(raw: unknown): PresetsStore {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return structuredClone(DEFAULT_PRESETS);
  }
  const r = raw as Record<string, unknown>;
  const presets: SignaturePreset[] = Array.isArray(r.presets)
    ? (r.presets as unknown[]).filter(isValidPreset)
    : structuredClone(DEFAULT_PRESETS.presets);

  const defaultPresetId =
    typeof r.defaultPresetId === "string"
      ? r.defaultPresetId
      : (presets[0]?.id ?? DEFAULT_PRESETS.defaultPresetId);

  return { defaultPresetId, presets };
}

export async function getSignaturePresetsStore(): Promise<PresetsStore> {
  const content = await prisma.siteContent.findUnique({
    where: { key: SIGNATURE_PRESETS_KEY },
  });
  return normalizePresetsStore(content?.extra);
}

export async function getDefaultSignaturePreset(): Promise<SignaturePreset | null> {
  const store = await getSignaturePresetsStore();
  return (
    store.presets.find((p) => p.id === store.defaultPresetId) ??
    store.presets[0] ??
    null
  );
}

export async function getSignaturePresetById(
  id: string
): Promise<SignaturePreset | null> {
  const store = await getSignaturePresetsStore();
  return store.presets.find((p) => p.id === id) ?? null;
}

export async function saveSignaturePresetsStore(
  store: PresetsStore
): Promise<PresetsStore> {
  await prisma.siteContent.upsert({
    where: { key: SIGNATURE_PRESETS_KEY },
    create: {
      key: SIGNATURE_PRESETS_KEY,
      title: "邀请函签名预设",
      titleEn: "Invitation Signature Presets",
      description: "英文邀请函签名预设配置（支持单签/双签）",
      descriptionEn:
        "Signature preset configuration for English invitations (single/dual signatory)",
      extra: store as unknown as Prisma.InputJsonValue,
    },
    update: {
      extra: store as unknown as Prisma.InputJsonValue,
    },
  });
  return store;
}
