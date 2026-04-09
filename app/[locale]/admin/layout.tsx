import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AdminLayoutShell } from "@/components/admin/admin-layout-shell";
import { isAdminConsoleRole, type AppUserRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/${locale}/auth/login?callbackUrl=${encodeURIComponent(`/${locale}/admin`)}`);
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, staffPermissions: true },
  });

  if (!currentUser || !isAdminConsoleRole(currentUser.role)) {
    redirect(`/${locale}`);
  }

  return (
    <AdminLayoutShell role={currentUser.role as AppUserRole} staffPermissions={currentUser.staffPermissions}>{children}</AdminLayoutShell>
  );
}
