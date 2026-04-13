import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManagePosters } from "@/lib/permissions";

export async function requirePosterAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, staffPermissions: true },
  });

  return user && canManagePosters(user.role, user.staffPermissions) ? user : null;
}
