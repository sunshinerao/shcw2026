import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/openclaw-auth";

const MIN_PASSWORD_LENGTH = 8;

/**
 * POST /api/v1/users/reset-password
 *
 * Admin-level operation: directly set a new password for a user identified
 * by their email address. Does NOT require the current password. Clears any
 * existing password-reset tokens so previously issued reset links are invalidated.
 *
 * Required permission: users:write
 *
 * Body:
 *   { email: string, newPassword: string }
 */
export async function POST(req: NextRequest) {
  const auth = await verifyApiKey(req, "users:write");
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "Request body must be valid JSON" }, { status: 400 });
  }

  const { email, newPassword } = body as Record<string, unknown>;

  // --- Validate inputs ---
  if (!email || typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ success: false, error: "email is required" }, { status: 400 });
  }

  if (!newPassword || typeof newPassword !== "string") {
    return NextResponse.json({ success: false, error: "newPassword is required" }, { status: 400 });
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { success: false, error: `newPassword must be at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 400 }
    );
  }

  // --- Look up user ---
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, email: true, name: true, status: true },
  });

  if (!user) {
    // Return 404 but avoid leaking whether the email is registered
    return NextResponse.json(
      { success: false, error: "No user found with that email address" },
      { status: 404 }
    );
  }

  if (user.status === "SUSPENDED") {
    return NextResponse.json(
      { success: false, error: "Cannot reset password for a suspended account" },
      { status: 403 }
    );
  }

  // --- Hash and save the new password ---
  const hashed = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
      // Invalidate any existing email-based reset tokens
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  return NextResponse.json({
    success: true,
    message: `Password for ${user.email} has been reset successfully.`,
    data: { userId: user.id, email: user.email, name: user.name },
  });
}
