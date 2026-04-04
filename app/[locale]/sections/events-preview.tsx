"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Calendar, Clock, MapPin, ArrowRight, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  eventHostTypeColors,
  getEventDateLabel,
  getEventHostTypeLabel,
  getEventScheduleLabel,
  getEventTypeLabel,
  getLocalizedEventPartners,
  getLocalizedEventSummary,
  getLocalizedEventVenue,
  typeColors,
  type Event,
} from "@/lib/data/events";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

type FeaturedEvent = Event & {
  maxAttendees?: number | null;
  isClosed?: boolean;
};

export function EventsPreviewSection() {
  const t = useTranslations();
  const locale = useLocale();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [events, setEvents] = useState<FeaturedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadFeaturedEvents() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/events?published=true&featured=true&pageSize=100&locale=${locale}`, {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || "Failed to load featured events");
        }

        if (!cancelled) {
          setEvents(payload.data.events || []);
        }
      } catch (error) {
        console.error("Load featured events failed:", error);
        if (!cancelled) {
          setEvents([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadFeaturedEvents();

    return () => {
      cancelled = true;
    };
  }, [locale]);

  const sortedEvents = [...events].sort((a, b) => {
    const byDate = a.startDate.localeCompare(b.startDate);
    if (byDate !== 0) {
      return byDate;
    }

    const byTime = a.startTime.localeCompare(b.startTime);
    if (byTime !== 0) {
      return byTime;
    }

    return a.title.localeCompare(b.title);
  });

  const _now = new Date();
  const todayKey = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;
  const upcomingEvents = sortedEvents.filter((event) => event.endDate.slice(0, 10) >= todayKey);
  const previewEvents = (upcomingEvents.length > 0 ? upcomingEvents : sortedEvents).slice(0, 4);

  const groupedEvents = previewEvents.reduce((acc, event) => {
    const dateKey = event.startDate.slice(0, 10);
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, FeaturedEvent[]>);

  const sortedDates = Object.keys(groupedEvents).sort();

  if (!isLoading && events.length === 0) return null;

  return (
    <section className="py-20 sm:py-28 bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">{t("events.title")}</h2>
            <p className="text-lg text-slate-600">{t("events.subtitle")}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Link href="/events">
              <Button variant="ghost" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                {t("events.viewAll")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center gap-4 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <p>{t("eventsPage.loading")}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedDates.map((date, dateIndex) => (
              <motion.div
                key={date}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.1 * (dateIndex + 1) }}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-lg font-bold text-slate-900">{getEventDateLabel(date, locale)}</h3>
                </div>

                <div className="space-y-4">
                  {groupedEvents[date].map((event, eventIndex) => {
                    const localizedPartners = getLocalizedEventPartners(event, locale);

                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.5, delay: 0.1 * eventIndex + 0.2 }}
                        className="bg-slate-50 rounded-xl p-6 hover:bg-emerald-50/50 transition-colors border border-slate-100 hover:border-emerald-200"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                          <div className="flex items-center gap-4 lg:w-72 shrink-0">
                            <div className="flex items-start text-slate-600">
                              <Clock className="w-4 h-4 mr-2 text-slate-400" />
                              <span className="text-sm font-medium leading-6">{getEventScheduleLabel(event, locale)}</span>
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={event.type} className={typeColors[event.type]}>
                                {getEventTypeLabel(event.type, locale)}
                              </Badge>
                              {event.hostType ? (
                                <Badge className={eventHostTypeColors[event.hostType] || "bg-slate-100 text-slate-700"}>
                                  {getEventHostTypeLabel(event.hostType, locale)}
                                </Badge>
                              ) : null}
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 mb-1">
                              {locale === "en" ? event.titleEn ?? event.title : event.title}
                            </h4>
                            <p className="text-sm text-slate-500 mb-2">{getLocalizedEventSummary(event, locale)}</p>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                              <span className="flex items-center">
                                <MapPin className="w-3.5 h-3.5 mr-1" />
                                {getLocalizedEventVenue(event, locale)}
                              </span>
                              {event.maxAttendees && (
                                <span className="flex items-center">
                                  <Users className="w-3.5 h-3.5 mr-1" />
                                  {t("events.capacity", { count: event.maxAttendees })}
                                </span>
                              )}
                            </div>
                          </div>

                          {localizedPartners.length > 0 && (
                            <div className="lg:w-48 shrink-0">
                              <p className="text-xs text-slate-400 mb-1.5">{t("events.partners")}</p>
                              <div className="flex flex-wrap gap-1">
                                {localizedPartners.slice(0, 3).map((partner) => (
                                  <span
                                    key={partner}
                                    className="text-xs px-2 py-0.5 bg-white text-slate-600 rounded border border-slate-200"
                                  >
                                    {partner}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2 lg:shrink-0">
                            <Link href={`/events/${event.id}`}>
                              <Button variant="ghost" size="sm" className="text-slate-600">
                                {t("events.details")}
                              </Button>
                            </Link>
                            <Link href={`/events/${event.id}/register`}>
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                                {event.isClosed ? t("events.applyAttend") : t("events.register")}
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
