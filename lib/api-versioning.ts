export type ApiVersionHeaderOptions = {
  version: "v1" | "v2";
  deprecated?: boolean;
  sunset?: string;
  replacement?: string;
};

export type ApiVersionPolicyOptions = ApiVersionHeaderOptions & {
  normalizeJsonErrors?: boolean;
  defaultErrorCode?: string;
};

function inferErrorCode(status: number): string {
  if (status === 400) return "BAD_REQUEST";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 422) return "UNPROCESSABLE_ENTITY";
  if (status >= 500) return "INTERNAL_ERROR";
  return "API_ERROR";
}

export function withApiVersionHeaders(response: Response, options: ApiVersionHeaderOptions): Response {
  const headers = new Headers(response.headers);
  headers.set("X-API-Version", options.version);

  if (options.deprecated) {
    headers.set("X-API-Deprecated", "true");
    if (options.sunset) {
      headers.set("Sunset", options.sunset);
    }
    if (options.replacement) {
      headers.set("X-API-Replacement", options.replacement);
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function withApiVersioning(response: Response, options: ApiVersionPolicyOptions): Promise<Response> {
  const base = withApiVersionHeaders(response, options);

  if (!options.normalizeJsonErrors || base.ok) {
    return base;
  }

  const contentType = (base.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("application/json")) {
    return base;
  }

  try {
    const payload = await base.clone().json();
    if (!payload || typeof payload !== "object") {
      return base;
    }

    const body = payload as Record<string, unknown>;
    if (body.success !== false) {
      return base;
    }

    const existingCode = body.code;
    if (typeof existingCode === "string" && existingCode.trim().length > 0) {
      return base;
    }

    const normalized = {
      ...body,
      code: options.defaultErrorCode || inferErrorCode(base.status),
    };

    const headers = new Headers(base.headers);
    headers.set("content-type", "application/json; charset=utf-8");

    return new Response(JSON.stringify(normalized), {
      status: base.status,
      statusText: base.statusText,
      headers,
    });
  } catch {
    return base;
  }
}
