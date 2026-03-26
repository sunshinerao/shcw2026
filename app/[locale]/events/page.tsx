"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, Users, ArrowRight, Filter, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { getEventTypeLabel, typeColors, getEventLayerLabel, getEventHostTypeLabel, eventLayerColors, eventHostTypeColors } from "@/lib/data/events";

type EventType = "forum" | "workshop" | "ceremony" | "conference" | "networking";

type PublicEvent = {
  id: string;
  title: string;
  titleEn?: string | null;
  description: string;
  descriptionEn?: string | null;
  shortDesc?: string | null;
  shortDescEn?: string | null;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  venue: string;
  venueEn?: string | null;
  address?: string | null;
  city?: string | null;
  type: EventType;
  eventLayer?: string | null;
  hostType?: string | null;
  trackId?: string | null;
  maxAttendees?: number | null;
  isFeatured: boolean;
};

function formatEventDateLabel(dateValue: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(dateValue));
}

function getLocalizedTitle(event: PublicEvent, locale: string) {
  return locale === "en" ? event.titleEn || event.title : event.title;
}

function getLocalizedSummary(event: PublicEvent, locale: string) {
  if (locale === "en") {
    return event.shortDescEn || event.descriptionEn || event.shortDesc || event.description;
  }

  return event.shortDesc || event.description;
}

export default function EventsPage() {
  const t = useTranslations("eventsPage");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [activeFilter, setActiveFilter] = useState("all");
  const [layerFilter, setLayerFilter] = useState("all");
  const [hostTypeFilter, setHostTypeFilter] = useState("all");
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const categoryFilters = [
    { key: "all", label: t("filters.all") },
    { key: "ceremony", label: t("filters.ceremony") },
    { key: "forum", label: t("filters.forum") },
    { key: "conference", label: t("filters.conference") },
    { key: "workshop", label: t("filters.workshop") },
    { key: "networking", label: t("filters.networking") },
  ];

  const layerOptions = [
    { key: "all", label: t("layerFilter.all") },
    { key: "INSTITUTION", label: t("layerFilter.INSTITUTION") },
    { key: "ECONOMY", label: t("layerFilter.ECONOMY") },
    { key: "ROOT", label: t("layerFilter.ROOT") },
    { key: "ACCELERATOR", label: t("layerFilter.ACCELERATOR") },
    { key: "COMPREHENSIVE", label: t("layerFilter.COMPREHENSIVE") },
  ];

  const hostTypeOptions = [
    { key: "all", label: t("hostTypeFilter.all") },
    { key: "OFFICIAL", label: t("hostTypeFilter.OFFICIAL") },
    { key: "CO_HOSTED", label: t("hostTypeFilter.CO_HOSTED") },
    { key: "REGISTERED", label: t("hostTypeFilter.REGISTERED") },
    { key: "SIDE_EVENT", label: t("hostTypeFilter.SIDE_EVENT") },
    { key: "COMMUNITY", label: t("hostTypeFilter.COMMUNITY") },
  ];

  useEffect(() => {
    let cancelled = false;
    const track = searchParams.get("track");
    const city = searchParams.get("city");

    async function loadEvents() {
      try {
        setIsLoading(true);
        setError("");

        const params = new URLSearchParams({ published: "true", locale });
        if (track) {
          params.set("track", track);
        }
        if (city) {
          params.set("city", city);
        }

        const response = await fetch(`/api/events?${params.toString()}`, {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || t("loadError"));
        }

        if (!cancelled) {
          setEvents(payload.data.events || []);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : t("loadError"));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadEvents();

    return () => {
      cancelled = true;
    };
  }, [locale, searchParams, t]);

  const filteredEvents = events.filter((event) => {
    if (activeFilter !== "all" && event.type !== activeFilter) return false;
    if (layerFilter !== "all" && event.eventLayer !== layerFilter) return false;
    if (hostTypeFilter !== "all" && event.hostType !== hostTypeFilter) return false;
    return true;
  });

  const groupedEvents = filteredEvents.reduce<Record<string, PublicEvent[]>>((acc, event) => {
    const dateKey = event.startDate.slice(0, 10);

    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }

    acc[dateKey].push(event);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedEvents).sort();

  return (
    <div className="min-h-screen bg-slate-50 pt-16 lg:pt-20">
      <section className="bg-slate-900 py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              {t("hero.title")}
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">{t("hero.subtitle")}</p>
          </motion.div>
        </div>
      </section>

      <section className="sticky top-16 lg:top-20 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            <Filter className="w-5 h-5 text-slate-400 mr-2 shrink-0" />
            {categoryFilters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeFilter === filter.key
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {filter.label}
              </button>
            ))}

            <span className="w-px h-6 bg-slate-200 mx-2 shrink-0" />

            <div className="relative shrink-0">
              <select
                value={layerFilter}
                onChange={(e) => setLayerFilter(e.target.value)}
                className={`appearance-none pl-3 pr-8 py-2 rounded-full text-sm font-medium cursor-pointer transition-all ${
                  layerFilter !== "all"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {layerOptions.map((opt) => (
                  <option key={opt.key} value={opt.key} className="text-slate-900 bg-white">
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
            </div>

            <div className="relative shrink-0">
              <select
                value={hostTypeFilter}
                onChange={(e) => setHostTypeFilter(e.target.value)}
                className={`appearance-none pl-3 pr-8 py-2 rounded-full text-sm font-medium cursor-pointer transition-all ${
                  hostTypeFilter !== "all"
                    ? "bg-amber-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {hostTypeOptions.map((opt) => (
                  <option key={opt.key} value={opt.key} className="text-slate-900 bg-white">
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center gap-4 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p>{t("loading")}</p>
            </div>
          ) : error ? (
            <div className="py-20 text-center space-y-4">
              <p className="text-slate-500">{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                {t("retry")}
              </Button>
            </div>
          ) : sortedDates.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-500">{t("emptyState")}</p>
            </div>
          ) : (
            <div className="space-y-12">
              {sortedDates.map((date, dateIndex) => (
                <motion.div
                  key={date}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: dateIndex * 0.1 }}
                >
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        {formatEventDateLabel(date, locale)}
                      </h2>
                      <p className="text-sm text-slate-500">
                        {t("eventCount", { count: groupedEvents[date].length })}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {groupedEvents[date].map((event, eventIndex) => {
                      const hostTypeBorderColor: Record<string, string> = {
                        OFFICIAL: "border-l-red-500",
                        CO_HOSTED: "border-l-sky-500",
                        REGISTERED: "border-l-lime-500",
                        SIDE_EVENT: "border-l-fuchsia-500",
                        COMMUNITY: "border-l-yellow-500",
                      };
                      const borderClass = event.hostType
                        ? hostTypeBorderColor[event.hostType] || "border-l-slate-300"
                        : "border-l-transparent";

                      return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: eventIndex * 0.05 }}
                        className={`bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow border-l-4 ${borderClass}`}
                      >
                        {event.hostType ? (
                          <div className="mb-3">
                            <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-semibold ${eventHostTypeColors[event.hostType] || "bg-slate-100 text-slate-700"}`}>
                              {getEventHostTypeLabel(event.hostType, locale)}
                            </span>
                          </div>
                        ) : null}
                        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                          <div className="lg:w-48 shrink-0">
                            <div className="flex items-center text-slate-600 mb-2">
                              <Clock className="w-4 h-4 mr-2 text-slate-400" />
                              <span className="font-medium">
                                {event.startTime} - {event.endTime}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <Badge className={typeColors[event.type]}>
                                {getEventTypeLabel(event.type, locale)}
                              </Badge>
                              {event.eventLayer ? (
                                <Badge className={eventLayerColors[event.eventLayer] || "bg-slate-100 text-slate-700"}>
                                  {getEventLayerLabel(event.eventLayer, locale)}
                                </Badge>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-slate-900 mb-2 hover:text-emerald-600 transition-colors">
                              <Link href={`/events/${event.id}`}>{getLocalizedTitle(event, locale)}</Link>
                            </h3>
                            <p className="text-slate-600 mb-3">{getLocalizedSummary(event, locale)}</p>
                            <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                              <span className="flex items-center">
                                <MapPin className="w-4 h-4 mr-1" />
                                {event.venue}
                              </span>
                              {event.maxAttendees ? (
                                <span className="flex items-center">
                                  <Users className="w-4 h-4 mr-1" />
                                  {t("capacity", { count: event.maxAttendees })}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 lg:shrink-0">
                            <Link href={`/events/${event.id}`}>
                              <Button variant="ghost" size="sm">
                                {t("details")}
                              </Button>
                            </Link>
                            <Link href={`/events/${event.id}/register`}>
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                                {t("register")}
                                <ArrowRight className="w-4 h-4 ml-1" />
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
    </div>
  );
}
