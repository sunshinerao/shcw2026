import { HeroSection } from "./sections/hero";
import { StatsSection } from "./sections/stats";
import { NarrativeSection } from "./sections/narrative";
import { TracksSection } from "./sections/tracks";
import { SpeakersSection } from "./sections/speakers";
import { EventsPreviewSection } from "./sections/events-preview";
import { NewsSection } from "./sections/news";
import { PartnersSection } from "./sections/partners";
import { CTASection } from "./sections/cta";

export default function Home() {
  return (
    <>
      <HeroSection />
      <StatsSection />
      <NarrativeSection />
      <TracksSection />
      <SpeakersSection />
      <EventsPreviewSection />
      <NewsSection />
      <PartnersSection />
      <CTASection />
    </>
  );
}
