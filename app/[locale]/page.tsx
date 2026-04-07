import { HeroSection } from "./sections/hero";
import { StatsSection } from "./sections/stats";
import { NarrativeSection } from "./sections/narrative";
import { TracksSection } from "./sections/tracks";
import { SpeakersSection } from "./sections/speakers";
import { EventsPreviewSection } from "./sections/events-preview";
import { NewsSection } from "./sections/news";
import { PartnersSection } from "./sections/partners";
import { CTASection } from "./sections/cta";
import { getSystemSettingsForServer } from "@/lib/system-settings";

export default async function Home() {
  const settings = await getSystemSettingsForServer().catch(() => null);
  const newsEnabled = settings?.newsEnabled !== false;

  return (
    <>
      <HeroSection />
      <StatsSection />
      <NarrativeSection />
      <TracksSection />
      <SpeakersSection />
      <EventsPreviewSection />
      {newsEnabled && <NewsSection />}
      <PartnersSection />
      <CTASection />
    </>
  );
}
