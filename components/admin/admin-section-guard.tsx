"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { canAccessAdminSection, getAdminLandingPath, type AdminSectionKey } from "@/lib/permissions";

export function AdminSectionGuard({
  section,
  children,
}: {
  section: AdminSectionKey;
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const canAccess = canAccessAdminSection(role, section);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    if (!canAccess) {
      router.replace(getAdminLandingPath(role));
    }
  }, [canAccess, role, router, status]);

  if (status !== "authenticated" || !canAccess) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
        {locale === "en" ? "Redirecting..." : "正在跳转..."}
      </div>
    );
  }

  return <>{children}</>;
}