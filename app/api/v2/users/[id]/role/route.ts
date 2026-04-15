import * as V1 from "@/app/api/v1/users/[id]/role/route";
import { withApiVersioning } from "@/lib/api-versioning";

export async function PUT(...args: any[]) {
  const handler = V1.PUT as (...input: any[]) => Promise<Response>;
  const response = await handler(...args);
  return withApiVersioning(response, { version: "v2", normalizeJsonErrors: true });
}
