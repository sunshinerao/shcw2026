import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function getSession(req: NextRequest) {
  const token = await getToken({ 
    req: req as any, 
    secret: process.env.NEXTAUTH_SECRET || "shcw2026-secret-key-development-only"
  });
  return token;
}
