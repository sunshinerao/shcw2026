"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import {
  Calendar,
  Clock,
  MapPin,
  Mic,
  Users,
  ArrowLeft,
  Share2,
  Heart,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getEventTypeLabel, typeColors, getEventLayerLabel, getEventHostTypeLabel, eventLayerColors, eventHostTypeColors } from "@/lib/data/events";
import { Link } from "@/i18n/routing";
import { normalizeAgendaDateKey } from "@/lib/agenda";
import { toast } from "sonner";

type EventType = "forum" | "workshop" | "ceremony" | "conference" | "networking";

type AgendaSpeaker = {
  id: string;
  name: string;
  nameEn?: string | null;
  avatar?: string | null;
  title: string;
  titleEn?: string | null;
  organization: string;
  organizationEn?: string | null;
  isKeynote: boolean;
};

type AgendaItem = {
  id: string;
  title: string;
  description?: string | null;
  agendaDate: string;
  startTime: string;
  endTime: string;
  type: string;
  venue?: string | null;
  order: number;
  speakers: AgendaSpeaker[];
};

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
  type: EventType;
  eventLayer?: string | null;
  hostType?: string | null;
  maxAttendees?: number | null;
  isFeatured: boolean;
  highlights?: string[] | null;
  highlightsEn?: string[] | null;
  agendaItems?: AgendaItem[];
};

function parseHighlights(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function formatEventDateLabel(dateValue: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(dateValue));
}

function formatAgendaDateLabel(dateValue: string, locale: string) {
  const normalized = normalizeAgendaDateKey(dateValue);
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(`${normalized}T12:00:00`));
}

function getLocalizedTitle(event: PublicEvent, locale: string) {
  return locale === "en" ? event.titleEn || event.title : event.title;
}

function getLocalizedDescription(event: PublicEvent, locale: string) {
  if (locale === "en") {
    return event.shortDescEn || event.descriptionEn || event.shortDesc || event.description;
  }

  return event.shortDesc || event.description;
}

function getFullDescription(event: PublicEvent, locale: string) {
  if (locale === "en") {
    return event.descriptionEn || event.description;
  }

  return event.description;
}

export default function EventDetailPage() {
  const t = useTranslations("eventDetailPage");
  const eventListT = useTranslations("eventsPage");
  const locale = useLocale() as "zh" | "en";
  const params = useParams();
  const { status } = useSession();
  const eventId = params.id as string;
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const highlights = useMemo(() => {
    if (event) {
      const dynamicHighlights =
        locale === "en" ? parseHighlights(event.highlightsEn) : parseHighlights(event.highlights);

      if (dynamicHighlights.length > 0) {
        return dynamicHighlights;
      }
    }

    return t.raw("about.highlights") as string[];
  }, [event, locale, t]);

  useEffect(() => {
    let cancelled = false;

    async function loadEvent() {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch(`/api/events/${eventId}?locale=${locale}`, {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || t("loadError"));
        }

        if (!cancelled) {
          setEvent(payload.data);
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

    void loadEvent();

    return () => {
      cancelled = true;
    };
  }, [eventId, locale, t]);

  useEffect(() => {
    let cancelled = false;

    async function loadUserActivity() {
      if (status !== "authenticated") {
        if (!cancelled) {
          setIsSaved(false);
          setIsRegistered(false);
        }
        return;
      }

      try {
        const response = await fetch(`/api/user/registrations?locale=${locale}`, {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          return;
        }

        if (!cancelled) {
          const wishlist = Array.isArray(payload.data?.wishlist) ? payload.data.wishlist : [];
          const registrations = Array.isArray(payload.data?.registrations)
            ? payload.data.registrations
            : [];

          setIsSaved(wishlist.some((item: { event?: { id?: string } }) => item.event?.id === eventId));
          setIsRegistered(
            registrations.some((item: { event?: { id?: string } }) => item.event?.id === eventId)
          );
        }
      } catch {
        if (!cancelled) {
          setIsSaved(false);
          setIsRegistered(false);
        }
      }
    }

    void loadUserActivity();

    return () => {
      cancelled = true;
    };
  }, [eventId, locale, status]);

  const groupedAgendaItems = useMemo(() => {
    if (!event?.agendaItems?.length) {
      return [] as Array<{ date: string; items: AgendaItem[] }>;
    }

    const groups = new Map<string, AgendaItem[]>();
    event.agendaItems.forEach((item) => {
      const key = normalizeAgendaDateKey(item.agendaDate);
      groups.set(key, [...(groups.get(key) || []), item]);
    });

    return Array.from(groups.entries()).map(([date, items]) => ({ date, items }));
  }, [event]);

  const handleSave = async () => {
    if (!event || isSaving || isRegistered) {
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch("/api/user/registrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          locale,
          action: isSaved ? "remove_wishlist" : "add_wishlist",
          eventId: event.id,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || t("loadError"));
      }

      setIsSaved(!isSaved);
      toast.success(isSaved ? t("register.unsaveSuccess") : t("register.saveSuccess"));
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : t("loadError"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!event) {
      return;
    }

    const shareData = {
      title: getLocalizedTitle(event, locale),
      text: getLocalizedDescription(event, locale),
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        return;
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t("register.shareSuccess"));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 pt-20">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p>{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (!event) {
    const hasError = Boolean(error);

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 pt-20">
        <div className="text-center max-w-md px-6">
          <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {hasError ? t("loadError") : t("notFound.title")}
          </h1>
          <p className="text-slate-500 mb-6">{hasError ? error : t("notFound.description")}</p>
          {hasError ? (
            <Button onClick={() => window.location.reload()}>{t("retry")}</Button>
          ) : (
            <Link href="/events">
              <Button>{t("notFound.back")}</Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  const localizedTitle = getLocalizedTitle(event, locale);
  const localizedDescription = getLocalizedDescription(event, locale);
  const fullDescription = getFullDescription(event, locale);

  return (
    <div className="min-h-screen bg-slate-50 pt-16 lg:pt-20">
      <section className="bg-slate-900 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link href="/events" className="inline-flex items-center text-slate-400 hover:text-white mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("backToEvents")}
            </Link>

            <div className="flex flex-wrap gap-2 mb-4">
              {event.hostType ? (
                <span className={`inline-flex items-center px-4 py-1.5 rounded-md text-sm font-bold tracking-wide ${eventHostTypeColors[event.hostType] || "bg-slate-100 text-slate-700"}`}>
                  {getEventHostTypeLabel(event.hostType, locale)}
                </span>
              ) : null}
              <Badge className={typeColors[event.type]}>{getEventTypeLabel(event.type, locale)}</Badge>
              {event.eventLayer ? (
                <Badge className={eventLayerColors[event.eventLayer] || "bg-slate-100 text-slate-700"}>
                  {getEventLayerLabel(event.eventLayer, locale)}
                </Badge>
              ) : null}
              {event.isFeatured ? (
                <Badge className="bg-amber-100 text-amber-700">{t("featured")}</Badge>
              ) : null}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              {localizedTitle}
            </h1>

            <p className="text-lg text-slate-300 max-w-3xl">{localizedDescription}</p>
          </motion.div>
        </div>
      </section>

      <section className="bg-white border-b border-slate-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center text-slate-600">
              <Calendar className="w-4 h-4 mr-2 text-emerald-600" />
              {formatEventDateLabel(event.startDate, locale)}
              {event.endDate && event.endDate.slice(0, 10) !== event.startDate.slice(0, 10) && (
                <> - {formatEventDateLabel(event.endDate, locale)}</>
              )}
            </div>
            <div className="flex items-center text-slate-600">
              <Clock className="w-4 h-4 mr-2 text-emerald-600" />
              {event.startTime} - {event.endTime}
            </div>
            <div className="flex items-center text-slate-600">
              <MapPin className="w-4 h-4 mr-2 text-emerald-600" />
              {locale === "en" ? event.venueEn || event.venue : event.venue}
            </div>
            {event.maxAttendees ? (
              <div className="flex items-center text-slate-600">
                <Users className="w-4 h-4 mr-2 text-emerald-600" />
                {eventListT("capacity", { count: event.maxAttendees })}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Tabs defaultValue="about" className="w-full">
                <TabsList className="w-full justify-start bg-white border border-slate-200 p-1 mb-6">
                  <TabsTrigger value="about" className="flex-1">{t("tabs.about")}</TabsTrigger>
                  <TabsTrigger value="agenda" className="flex-1">{t("tabs.agenda")}</TabsTrigger>
                  <TabsTrigger value="speakers" className="flex-1">{t("tabs.speakers")}</TabsTrigger>
                </TabsList>

                <TabsContent value="about" className="mt-0">
                  <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">{t("about.title")}</h2>
                    <div className="prose prose-slate max-w-none">
                      <p className="text-slate-600 leading-relaxed mb-4">{fullDescription}</p>
                      <h3 className="text-lg font-bold text-slate-900 mt-6 mb-3">{t("about.highlightsTitle")}</h3>
                      <ul className="space-y-2 text-slate-600">
                        {highlights.map((highlight) => (
                          <li key={highlight} className="flex items-start">
                            <CheckCircle className="w-5 h-5 text-emerald-600 mr-2 mt-0.5 shrink-0" />
                            {highlight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="agenda" className="mt-0">
                  <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">{t("agenda.title")}</h2>
                    <div className="space-y-4">
                      {groupedAgendaItems.length > 0 ? (
                        groupedAgendaItems.map((group) => (
                          <div key={group.date} className="space-y-3">
                            <div className="sticky top-20 z-10 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
                              {formatAgendaDateLabel(group.date, locale)}
                            </div>
                            {group.items.map((item) => (
                              <div key={item.id} className="flex gap-4 p-4 rounded-xl bg-slate-50">
                                <div className="w-32 shrink-0 text-sm font-medium text-slate-500">
                                  {item.startTime} - {item.endTime}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <h4 className="font-semibold text-slate-900">{item.title}</h4>
                                    <Badge variant="outline" className="shrink-0 text-xs">
                                      {t.has(`agenda.types.${item.type}`) ? t(`agenda.types.${item.type}` as Parameters<typeof t>[0]) : item.type}
                                    </Badge>
                                  </div>
                                  {item.description && (
                                    <p className="text-sm text-slate-600 mb-2">{item.description}</p>
                                  )}
                                  {item.venue && (
                                    <p className="text-xs text-slate-400 mb-2">
                                      <MapPin className="inline w-3 h-3 mr-1" />
                                      {item.venue}
                                    </p>
                                  )}
                                  {item.speakers.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                      <Mic className="h-3.5 w-3.5 text-slate-400" />
                                      {item.speakers.map((speaker) => (
                                        <div key={speaker.id} className="flex items-center gap-1.5 rounded-full bg-white pl-1 pr-2.5 py-0.5 border border-slate-200">
                                          <Avatar className="h-5 w-5">
                                            <AvatarImage src={speaker.avatar || undefined} />
                                            <AvatarFallback className="text-[10px]">
                                              {(locale === "en" && speaker.nameEn ? speaker.nameEn : speaker.name).charAt(0)}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="text-xs font-medium text-slate-700">
                                            {locale === "en" && speaker.nameEn ? speaker.nameEn : speaker.name}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-8">{t("agenda.empty")}</p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="speakers" className="mt-0">
                  <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">{t("speakersTitle")}</h2>
                    {(() => {
                      const allSpeakers = new Map<string, AgendaSpeaker>();
                      event.agendaItems?.forEach((item) =>
                        item.speakers.forEach((s) => allSpeakers.set(s.id, s))
                      );
                      const speakers = Array.from(allSpeakers.values());

                      if (speakers.length === 0) {
                        return (
                          <p className="text-sm text-slate-500 text-center py-8">{t("speakersEmpty")}</p>
                        );
                      }

                      return (
                        <div className="grid sm:grid-cols-2 gap-4">
                          {speakers.map((speaker) => {
                            const name = locale === "en" && speaker.nameEn ? speaker.nameEn : speaker.name;
                            const title = locale === "en" && speaker.titleEn ? speaker.titleEn : speaker.title;
                            const org = locale === "en" && speaker.organizationEn ? speaker.organizationEn : speaker.organization;

                            return (
                              <div key={speaker.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-emerald-200 transition-colors">
                                <Avatar className="w-14 h-14 shrink-0">
                                  <AvatarImage src={speaker.avatar || undefined} />
                                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-lg font-semibold">
                                    {name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-slate-900 truncate">{name}</h4>
                                    {speaker.isKeynote && (
                                      <Badge className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0">Keynote</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-slate-600 truncate">{title}</p>
                                  <p className="text-xs text-slate-400 truncate">{org}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-36 space-y-4">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">{t("register.title")}</h3>
                  <p className="text-sm text-slate-500 mb-4">{t("register.description")}</p>
                  {isRegistered ? (
                    <Button className="w-full mb-3" disabled>
                      {t("register.registered")}
                    </Button>
                  ) : (
                    <Link href={`/events/${eventId}/register`} className="block">
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 mb-3">
                        {eventListT("register")}
                      </Button>
                    </Link>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className={`flex-1 ${isSaved ? "text-red-500 border-red-200 bg-red-50" : ""}`}
                      onClick={handleSave}
                      disabled={isSaving || isRegistered}
                    >
                      <Heart className={`w-4 h-4 mr-2 ${isSaved ? "fill-current" : ""}`} />
                      {isSaved ? t("register.saved") : t("register.save")}
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={handleShare}>
                      <Share2 className="w-4 h-4 mr-2" />
                      {t("register.share")}
                    </Button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">{t("locationTitle")}</h3>
                  <div className="aspect-video bg-gradient-to-br from-emerald-50 to-blue-50 rounded-xl mb-4 flex flex-col items-center justify-center border border-slate-200 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" />
                        </pattern>
                        <rect width="100" height="100" fill="url(#grid)" />
                      </svg>
                    </div>
                    <MapPin className="w-10 h-10 text-emerald-500 mb-2" />
                    <p className="text-sm text-slate-500 text-center px-4">{event.venue}</p>
                  </div>
                  <p className="font-medium text-slate-900 mb-1">{event.venue}</p>
                  {event.address ? <p className="text-sm text-slate-500 mb-3">{event.address}</p> : null}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue} ${event.address || ""}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="outline" className="w-full" size="sm">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {t("viewMap")}
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
