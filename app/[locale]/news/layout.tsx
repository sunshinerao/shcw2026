import { notFound } from "next/navigation";
import { getSystemSettingsForServer } from "@/lib/system-settings";

export default async function NewsLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSystemSettingsForServer().catch(() => null);
  if (settings?.newsEnabled === false) {
    notFound();
  }
  return <>{children}</>;
}
