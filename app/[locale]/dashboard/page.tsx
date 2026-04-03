"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Calendar, Heart, Trophy, CheckCircle2, ArrowRight, MapPin, Loader2, BadgeCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useRouter } from "@/i18n/routing";
import { combineEventDateTime } from "@/lib/climate-passport";
import { getEventDateRangeLabel, getEventTimeSummaryLabel, normalizeEventDateSlots, type EventDateSlot } from "@/lib/data/events";

interface RegistrationItem {
  id: string;
  checkedInAt?: string | null;
  event: {
    id: string;
    title: string;
    titleEn?: string | null;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    venue: string;
    venueEn?: string | null;
    type: string;
    eventDateSlots?: EventDateSlot[];
  };
}

interface WishlistItem {
  id: string;
}

interface ProfileData {
  points: number;
}

export default function DashboardPage() {
  const t = useTranslations("dashboardPage");
  const eventT = useTranslations("eventsPage");
  const locale = useLocale() as "zh" | "en";
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const getEventSlotWindows = (event: RegistrationItem["event"]) =>
    normalizeEventDateSlots(event).map((slot) => ({
      scheduleDate: slot.scheduleDate,
      startAt: combineEventDateTime(slot.scheduleDate, slot.startTime),
      endAt: combineEventDateTime(slot.scheduleDate, slot.endTime),
    }));

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;

    async function fetchDashboardData() {
      try {
        const [registrationsResponse, profileResponse] = await Promise.all([
          fetch(`/api/user/registrations?locale=${locale}`),
          fetch(`/api/user/profile?locale=${locale}`),
        ]);

        const registrationsData = await registrationsResponse.json();
        const profileData = await profileResponse.json();

        if (!active) {
          return;
        }

        if (registrationsData.success) {
          setRegistrations(registrationsData.data.registrations || []);
          setWishlist(registrationsData.data.wishlist || []);
        }

        if (profileData.success) {
          setProfile({ points: profileData.data.points || 0 });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchDashboardData();

    return () => {
      active = false;
    };
  }, [locale, status]);

  const upcomingEvents = useMemo(() => {
    return registrations
      .filter((registration) => {
        const slotWindows = getEventSlotWindows(registration.event);
        const lastSlot = slotWindows[slotWindows.length - 1];
        return Boolean(lastSlot && lastSlot.endAt.getTime() >= Date.now());
      })
      .sort(
        (left, right) => {
          const leftFirstSlot = getEventSlotWindows(left.event)[0];
          const rightFirstSlot = getEventSlotWindows(right.event)[0];
          return (leftFirstSlot?.startAt.getTime() || 0) - (rightFirstSlot?.startAt.getTime() || 0);
        }
      )
      .slice(0, 3);
  }, [registrations]);

  const stats = useMemo(
    () => [
      { key: "registered", value: registrations.length, icon: Calendar, color: "text-emerald-600", bgColor: "bg-emerald-50" },
      { key: "saved", value: wishlist.length, icon: Heart, color: "text-rose-600", bgColor: "bg-rose-50" },
      {
        key: "attended",
        value: registrations.filter((registration) => Boolean(registration.checkedInAt)).length,
        icon: CheckCircle2,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
      },
      { key: "points", value: profile?.points ?? 0, icon: Trophy, color: "text-amber-600", bgColor: "bg-amber-50" },
    ],
    [profile?.points, registrations, wishlist.length]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[360px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{t("hero.title")}</h1>
        <p className="text-slate-600">{t("hero.description")}</p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.08 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center mr-4`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t(`stats.${stat.key}`)}</p>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25 }}>
        <Card>
          <CardHeader>
            <CardTitle>{t("quickActions.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/pass">
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <BadgeCheck className="w-4 h-4 mr-2" />
                  {t("quickActions.pass")}
                </Button>
              </Link>
              <Link href="/events">
                <Button variant="outline">
                  <Calendar className="w-4 h-4 mr-2" />
                  {t("quickActions.events")}
                </Button>
              </Link>
              <Link href="/dashboard/schedule">
                <Button variant="outline">{t("quickActions.schedule")}</Button>
              </Link>
              <Link href="/dashboard/climate-passport">
                <Button variant="outline">
                  <BadgeCheck className="w-4 h-4 mr-2" />
                  {t("quickActions.passport")}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("upcoming.title")}</CardTitle>
            <Link href="/dashboard/schedule">
              <Button variant="ghost" size="sm">
                {t("upcoming.viewAll")}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>{t("upcoming.empty")}</p>
                <Link href="/events">
                  <Button variant="outline" className="mt-4">
                    {t("upcoming.browse")}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingEvents.map((registration) => {
                  const event = registration.event;
                  const displayDate = normalizeEventDateSlots(event)[0]?.scheduleDate || event.startDate;
                  const eventDate = new Date(`${String(displayDate).slice(0, 10)}T12:00:00`);
                  const monthLabel = locale === "en"
                    ? eventDate.toLocaleString("en-US", { month: "short" })
                    : `${eventDate.getMonth() + 1}月`;

                  return (
                    <div
                      key={registration.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-emerald-50 rounded-xl flex flex-col items-center justify-center text-emerald-700">
                          <span className="text-xs font-medium">{monthLabel}</span>
                          <span className="text-lg font-bold">{eventDate.getDate()}</span>
                        </div>
                        <div>
                          <div className="mb-1">
                            <h3 className="font-semibold text-slate-900">
                              {locale === "en" ? event.titleEn || event.title : event.title}
                            </h3>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                            <span className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {getEventDateRangeLabel(event, locale)}
                            </span>
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {getEventTimeSummaryLabel(event, locale)}
                            </span>
                            <span className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              {locale === "en" ? event.venueEn || event.venue : event.venue}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Link href={`/events/${event.id}`}>
                        <Button size="sm" variant="outline">
                          {eventT("details")}
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
