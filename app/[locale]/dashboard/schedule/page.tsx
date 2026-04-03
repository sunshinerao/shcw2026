"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Calendar, Clock, MapPin, ExternalLink, Heart, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getEventDateRangeLabel, getEventTimeSummaryLabel, getEventTypeLabel, type Event } from "@/lib/data/events";
import { Link } from "@/i18n/routing";
import { toast } from "sonner";

interface ScheduleEvent {
  id: string;
  title: string;
  titleEn: string;
  startDate: string;
  dateLabel: string;
  timeLabel: string;
  venue: string;
  venueEn: string;
  type: Event["type"];
  image?: string;
  status: "registered" | "wishlist";
  checkedIn?: boolean;
  pointsEarned?: number;
}

const typeColors: Record<string, string> = {
  ceremony: "bg-amber-100 text-amber-700",
  workshop: "bg-green-100 text-green-700",
  forum: "bg-blue-100 text-blue-700",
  conference: "bg-purple-100 text-purple-700",
  networking: "bg-pink-100 text-pink-700",
};

export default function SchedulePage() {
  const t = useTranslations("dashboardSchedulePage");
  const locale = useLocale();
  const [registeredEvents, setRegisteredEvents] = useState<ScheduleEvent[]>([]);
  const [wishlistEvents, setWishlistEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // 获取用户活动数据
  const fetchSchedule = useCallback(async () => {
    try {
      const response = await fetch(`/api/user/registrations?locale=${locale}`);
      const data = await response.json();
      
      if (data.success) {
        // 处理报名数据
        const registrations = data.data.registrations.map((reg: any) => ({
          id: reg.event.id,
          registrationId: reg.id,
          title: reg.event.title,
          titleEn: reg.event.titleEn || reg.event.title,
          startDate: reg.event.startDate,
          dateLabel: getEventDateRangeLabel(reg.event, locale),
          timeLabel: getEventTimeSummaryLabel(reg.event, locale),
          venue: reg.event.venue,
          venueEn: reg.event.venueEn || reg.event.venue,
          type: reg.event.type,
          image: reg.event.image,
          status: "registered" as const,
          checkedIn: !!reg.checkedInAt,
          pointsEarned: reg.pointsEarned,
        }));

        // 处理收藏数据
        const wishlist = data.data.wishlist.map((item: any) => ({
          id: item.event.id,
          wishlistId: item.id,
          title: item.event.title,
          titleEn: item.event.titleEn || item.event.title,
          startDate: item.event.startDate,
          dateLabel: getEventDateRangeLabel(item.event, locale),
          timeLabel: getEventTimeSummaryLabel(item.event, locale),
          venue: item.event.venue,
          venueEn: item.event.venueEn || item.event.venue,
          type: item.event.type,
          image: item.event.image,
          status: "wishlist" as const,
        }));

        setRegisteredEvents(registrations);
        setWishlistEvents(wishlist);
      }
    } catch (error) {
      toast.error(t("messages.loadError"));
    } finally {
      setLoading(false);
    }
  }, [locale, t]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // 取消收藏
  const removeFromWishlist = async (eventId: string) => {
    try {
      const response = await fetch("/api/user/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, action: "remove_wishlist", eventId }),
      });

      if (response.ok) {
        toast.success(t("messages.removeSuccess"));
        fetchSchedule();
      } else {
        toast.error(t("messages.actionError"));
      }
    } catch (error) {
      toast.error(t("messages.actionError"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{t("title")}</h1>
        <p className="text-slate-600">{t("subtitle")}</p>
      </motion.div>

      {/* Registered Events */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="w-2 h-6 bg-emerald-500 rounded-full mr-3" />
              {t("registered", { count: registeredEvents.length })}
              {registeredEvents.length > 0 && (
                <Badge className="ml-2 bg-emerald-100 text-emerald-700">
                  {registeredEvents.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {registeredEvents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500 mb-4">{t("emptyRegistered")}</p>
                <Link href="/events">
                  <Button className="bg-emerald-600 hover:bg-emerald-700">{t("browseEvents")}</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {registeredEvents.map((event) => (
                  <EventCard 
                    key={event.id} 
                    event={event} 
                    isRegistered 
                    locale={locale}
                    t={t}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Wishlist */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="w-2 h-6 bg-rose-500 rounded-full mr-3" />
              {t("wishlist", { count: wishlistEvents.length })}
              {wishlistEvents.length > 0 && (
                <Badge className="ml-2 bg-rose-100 text-rose-700">
                  {wishlistEvents.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {wishlistEvents.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                {t("emptyWishlist")}
              </div>
            ) : (
              <div className="space-y-4">
                {wishlistEvents.map((event) => (
                  <EventCard 
                    key={event.id} 
                    event={event} 
                    locale={locale}
                    t={t}
                    onRemove={() => removeFromWishlist(event.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

interface EventCardProps {
  event: ScheduleEvent;
  isRegistered?: boolean;
  locale: string;
  t: any;
  onRemove?: () => void;
}

function EventCard({ event, isRegistered, locale, t, onRemove }: EventCardProps) {
  const eventDate = new Date(event.startDate);
  const monthLabel = locale === "en"
    ? eventDate.toLocaleString("en-US", { month: "short" })
    : `${eventDate.getMonth() + 1}月`;
  const day = eventDate.getDate();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:shadow-sm transition-all">
      <div className="flex items-start gap-4 mb-4 sm:mb-0">
        <div className="w-14 h-14 bg-emerald-50 rounded-xl flex flex-col items-center justify-center text-emerald-700 shrink-0">
          <span className="text-xs font-medium">{monthLabel}</span>
          <span className="text-lg font-bold">{day}</span>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-900">
              {locale === "en" ? event.titleEn : event.title}
            </h3>
            <Badge className={typeColors[event.type]}>
              {getEventTypeLabel(event.type, locale)}
            </Badge>
            
            {/* 已入场标记 */}
            {isRegistered && event.checkedIn && (
              <Badge className="bg-green-100 text-green-700">
                <CheckCircle className="w-3 h-3 mr-1" />
                {t("badges.checkedIn")}
              </Badge>
            )}
          </div>
          
          {/* 已获得积分 */}
          {isRegistered && event.checkedIn && event.pointsEarned && event.pointsEarned > 0 && (
            <div className="text-sm text-emerald-600 font-medium mb-1">
              {t("badges.pointsEarned", { points: event.pointsEarned })}
            </div>
          )}
          
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {event.dateLabel}
            </span>
            <span className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {event.timeLabel}
            </span>
            <span className="flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              {locale === "en" ? event.venueEn : event.venue}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isRegistered ? (
          <Link href="/dashboard/pass">
            <Button size="sm" variant="outline">
              {t("viewPass")}
            </Button>
          </Link>
        ) : (
          <>
            <Link href={`/events/${event.id}/register`}>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                {t("registerNow")}
              </Button>
            </Link>
            {onRemove && (
              <Button size="sm" variant="ghost" onClick={onRemove}>
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              </Button>
            )}
          </>
        )}
        <Link href={`/events/${event.id}`}>
          <Button size="sm" variant="ghost">
            <ExternalLink className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
