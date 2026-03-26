"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, MapPin, Clock, CheckCircle, Loader2, User, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "@/i18n/routing";
import { getEventTypeLabel, typeColors } from "@/lib/data/events";
import { useSession } from "next-auth/react";

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
  type: EventType;
  maxAttendees?: number | null;
};

type UserProfile = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  organization?: {
    name?: string | null;
  } | null;
};

function formatEventDateLabel(dateValue: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(dateValue));
}

export default function EventRegisterPage() {
  const t = useTranslations("eventRegister");
  const params = useParams();
  const locale = useLocale();
  const eventId = params.id as string;
  const { data: session, status } = useSession();

  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [isEventLoading, setIsEventLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    title: "",
    dietary: "",
    notes: "",
  });

  const fetchEvent = useCallback(async () => {
    try {
      setIsEventLoading(true);
      setError("");

      const response = await fetch(`/api/events/${eventId}?locale=${locale}`, {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || t("eventNotFound"));
      }

      setEvent(payload.data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : t("eventNotFound"));
      setEvent(null);
    } finally {
      setIsEventLoading(false);
    }
  }, [eventId, locale, t]);

  const fetchUserProfile = useCallback(async () => {
    if (!session?.user?.id) {
      return;
    }

    try {
      const response = await fetch("/api/user/profile", {
        cache: "no-store",
      });
      const payload = await response.json();

      if (response.ok) {
        if (payload.success) {
          setUserProfile(payload.data);
          setFormData(prev => ({
            ...prev,
            name: payload.data.name || "",
            email: payload.data.email || "",
            phone: payload.data.phone || "",
            organization: payload.data.organization?.name || "",
            title: payload.data.title || "",
          }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    void fetchEvent();
  }, [fetchEvent]);

  useEffect(() => {
    if (session?.user) {
      void fetchUserProfile();
    }
  }, [fetchUserProfile, session?.user]);

  if (isEventLoading || status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p>{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">{t("eventNotFound")}</h1>
          <p className="text-slate-500 mb-6">{error}</p>
          <Link href="/events">
            <Button>{t("backToEvents")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-4">{t("loginRequired.title")}</h1>
            <p className="text-slate-600 mb-8">{t("loginRequired.description")}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={`/auth/login?callbackUrl=/${locale}/events/${eventId}/register`}>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <LogIn className="w-4 h-4 mr-2" />
                  {t("loginRequired.login")}
                </Button>
              </Link>
              <Link href={`/auth/register?callbackUrl=/${locale}/events/${eventId}/register`}>
                <Button variant="outline">
                  {t("loginRequired.register")}
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-sm text-slate-500">
              <Link href={`/events/${eventId}`} className="text-emerald-600 hover:underline">
                {t("backToEvent")}
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (
        formData.name !== (userProfile?.name || "") ||
        formData.phone !== (userProfile?.phone || "") ||
        formData.title !== (userProfile?.title || "")
      ) {
        const profileResponse = await fetch("/api/user/profile", {
          method: "PUT",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            locale,
            name: formData.name,
            phone: formData.phone,
            title: formData.title,
          }),
        });
        const profilePayload = await profileResponse.json();

        if (!profileResponse.ok || !profilePayload.success) {
          throw new Error(profilePayload.error || t("submitError"));
        }
      }

      const response = await fetch(`/api/events/${eventId}/register`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          locale,
          dietaryReq: formData.dietary,
          notes: formData.notes,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || t("submitError"));
      }

      setIsSuccess(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("submitError"));
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-4">{t("success.title")}</h1>
            <p className="text-slate-600 mb-8">{t("success.description")}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={`/events/${eventId}`}>
                <Button variant="outline">{t("success.viewEvent")}</Button>
              </Link>
              <Link href="/dashboard">
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  {t("success.goToDashboard")}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const localizedTitle = locale === "en" ? event.titleEn || event.title : event.title;

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link href={`/events/${eventId}`}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("backToEvent")}
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{t("title")}</h1>
          <p className="text-slate-600">{t("subtitle")}</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <CardTitle>{t("form.title")}</CardTitle>
                {userProfile && (
                  <p className="text-sm text-emerald-600">{t("form.autoFilled")}</p>
                )}
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t("form.name")} *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">{t("form.email")} *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        readOnly
                        className="bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t("form.phone")}</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="title">{t("form.title")}</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder={t("form.titlePlaceholder")}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="organization">{t("form.organization")}</Label>
                    <Input
                      id="organization"
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dietary">{t("form.dietary")}</Label>
                    <Input
                      id="dietary"
                      placeholder={t("form.dietaryPlaceholder")}
                      value={formData.dietary}
                      onChange={(e) => setFormData({ ...formData, dietary: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">{t("form.notes")}</Label>
                    <Textarea
                      id="notes"
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t("form.submitting")}
                      </>
                    ) : (
                      t("form.submit")
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Event Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">{t("eventInfo.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500 mb-2">{localizedTitle}</p>
                  <p className="text-sm text-slate-600">{locale === "en" ? (event.shortDescEn || event.descriptionEn || event.shortDesc || event.description) : (event.shortDesc || event.description)}</p>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">
                      {formatEventDateLabel(event.startDate, locale)}
                      {event.endDate && event.endDate.slice(0, 10) !== event.startDate.slice(0, 10) && (
                        <> - {formatEventDateLabel(event.endDate, locale)}</>
                      )}
                    </p>
                    <p className="text-sm text-slate-500">
                      {event.startTime} - {event.endTime}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">{event.venue}</p>
                    {event.address && (
                      <p className="text-sm text-slate-500">{event.address}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <span className={`inline-block px-2 py-1 text-xs rounded ${typeColors[event.type]}`}>
                      {getEventTypeLabel(event.type, locale)}
                    </span>
                  </div>
                </div>
                {event.maxAttendees && (
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-sm text-slate-500">
                      {t("eventInfo.capacity", { count: event.maxAttendees })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
