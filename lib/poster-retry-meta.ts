const RETRY_META_REGEX = /^\[\[retry:(\d+)\/(\d+)\]\]\s*/;

export const DEFAULT_POSTER_MAX_RETRIES = 3;

export function clampPosterMaxRetries(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_POSTER_MAX_RETRIES;
  return Math.max(1, Math.min(10, Math.floor(n)));
}

export function parsePosterRetryMeta(errorMessage?: string | null) {
  const raw = errorMessage || "";
  const matched = raw.match(RETRY_META_REGEX);

  if (!matched) {
    return {
      retryCount: 0,
      maxRetries: DEFAULT_POSTER_MAX_RETRIES,
      cleanMessage: raw.trim() || null,
    };
  }

  const retryCount = Number.parseInt(matched[1], 10);
  const maxRetries = Number.parseInt(matched[2], 10);
  const clean = raw.replace(RETRY_META_REGEX, "").trim();

  return {
    retryCount: Number.isFinite(retryCount) ? retryCount : 0,
    maxRetries: Number.isFinite(maxRetries) ? maxRetries : DEFAULT_POSTER_MAX_RETRIES,
    cleanMessage: clean || null,
  };
}

export function formatPosterRetryMeta(retryCount: number, maxRetries: number) {
  return `[[retry:${retryCount}/${maxRetries}]]`;
}

export function composePosterErrorMessage(options: {
  retryCount: number;
  maxRetries: number;
  message?: string | null;
}) {
  const prefix = formatPosterRetryMeta(options.retryCount, options.maxRetries);
  const clean = (options.message || "").trim();
  return clean ? `${prefix} ${clean}` : prefix;
}
