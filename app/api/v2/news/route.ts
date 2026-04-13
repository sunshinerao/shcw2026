// Auto-generated V2 compatibility route.
// V2 preserves V1 behavior while adding explicit version headers and error-code normalization.
import * as V1 from "@/app/api/v1/news/route";
import { withApiVersioning } from "@/lib/api-versioning";

export async function GET(...args: any[]) {
  const handler = V1.GET as (...input: any[]) => Promise<Response>;
  const response = await handler(...args);
  return withApiVersioning(response, { version: "v2", normalizeJsonErrors: true });
}

export async function POST(...args: any[]) {
  const handler = V1.POST as (...input: any[]) => Promise<Response>;
  const response = await handler(...args);
  return withApiVersioning(response, { version: "v2", normalizeJsonErrors: true });
}

