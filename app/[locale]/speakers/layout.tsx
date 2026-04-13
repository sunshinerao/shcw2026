import { notFound } from "next/navigation";
import { getSystemSettingsForServer } from "@/lib/system-settings";

export default async function SpeakersLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSystemSettingsForServer().catch(() => null);
  if (settings?.speakersEnabled === false) {
    notFound();
  }
  return <>{children}</>;
}
