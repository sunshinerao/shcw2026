import * as V1 from "@/app/api/v1/events/[id]/registrations/route";
import { withApiVersioning } from "@/lib/api-versioning";

export async function GET(...args: any[]) {
  const handler = V1.GET as (...input: any[]) => Promise<Response>;
  const response = await handler(...args);
  return withApiVersioning(response, { version: "v2", normalizeJsonErrors: true });
}

export async function PATCH(...args: any[]) {
  const handler = V1.PATCH as (...input: any[]) => Promise<Response>;
  const response = await handler(...args);
  return withApiVersioning(response, { version: "v2", normalizeJsonErrors: true });
}
