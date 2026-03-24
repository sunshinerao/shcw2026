import { HeroSection } from "./sections/hero";
import { StatsSection } from "./sections/stats";
import { NarrativeSection } from "./sections/narrative";
import { TracksSection } from "./sections/tracks";
import { EventsPreviewSection } from "./sections/events-preview";
import { PartnersSection } from "./sections/partners";
import { CTASection } from "./sections/cta";

export default function Home() {
  return (
    <>
      <HeroSection />
      <StatsSection />
      <NarrativeSection />
      <TracksSection />
      <EventsPreviewSection />
      <PartnersSection />
      <CTASection />
    </>
  );
}
