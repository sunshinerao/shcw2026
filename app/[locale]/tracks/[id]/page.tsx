import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  Clock,
  Globe,
  Leaf,
  MapPin,
  Sparkles,
  TrendingUp,
  TreePine,
  Users,
} from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getEventDateRangeLabel,
  getEventTimeSummaryLabel,
  getEventTypeLabel,
  typeColors,
} from "@/lib/data/events";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/routing";

const iconMap: Record<string, React.ElementType> = {
  Building2,
  TrendingUp,
  Leaf,
  Globe,
  Users,
  Sparkles,
  TreePine,
};

function getTrackPartners(track: {
  partners: unknown;
  partnersEn: unknown;
}, locale: string) {
  const source = locale === "en"
    ? (Array.isArray(track.partnersEn) && track.partnersEn.length ? track.partnersEn : Array.isArray(track.partners) ? track.partners : [])
    : Array.isArray(track.partners) ? track.partners : [];

  return source.filter((partner): partner is string => typeof partner === "string");
}

export default async function TrackDetailPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  setRequestLocale(params.locale);

  const locale = params.locale;
  const t = await getTranslations("trackDetailPage");
  const globalT = await getTranslations();

  const track = await prisma.track.findUnique({
    where: { id: params.id },
    include: {
      events: {
        where: { isPublished: true },
        orderBy: [{ isPinned: "desc" }, { startDate: "asc" }, { startTime: "asc" }],
        select: {
          id: true,
          title: true,
          titleEn: true,
          description: true,
          descriptionEn: true,
          shortDesc: true,
          shortDescEn: true,
          startDate: true,
          endDate: true,
          startTime: true,
          endTime: true,
          venue: true,
          venueEn: true,
          type: true,
          eventDateSlots: {
            orderBy: [{ scheduleDate: "asc" }],
          },
        },
      },
    },
  });

  if (!track) {
    notFound();
  }

  const Icon = iconMap[track.icon] || Globe;
  const partnerNames = getTrackPartners(track, locale);

  const getEventSummary = (event: (typeof track.events)[number]) => {
    if (locale === "en") {
      return event.shortDescEn || event.descriptionEn || event.shortDesc || event.description;
    }

    return event.shortDesc || event.description;
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ecfdf5_38%,#ffffff_100%)] pt-16 lg:pt-20">
      <section className="relative overflow-hidden border-b border-emerald-100 bg-slate-950 py-18 text-white sm:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(16,185,129,0.28),transparent_32%),radial-gradient(circle_at_85%_20%,rgba(14,165,233,0.22),transparent_28%),linear-gradient(135deg,rgba(2,6,23,0.98),rgba(6,78,59,0.9))]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link href="/tracks" className="inline-flex items-center text-sm font-medium text-emerald-200 transition hover:text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("backToTracks")}
          </Link>

          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <div>
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
                {t("heroBadge")}
              </span>
              <div className="mt-5 flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl" style={{ backgroundColor: `${track.color}24` }}>
                  <Icon className="h-8 w-8" style={{ color: track.color }} />
                </div>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                    {locale === "en" ? track.nameEn || track.name : track.name}
                  </h1>
                  <p className="mt-3 text-sm font-medium uppercase tracking-[0.22em] text-slate-400">{track.code}</p>
                  <p className="mt-3 text-sm font-medium text-emerald-200">
                    {globalT(`tracks.tabs.${track.category}`)}
                  </p>
                </div>
              </div>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
                {locale === "en" ? track.descriptionEn || track.description : track.description}
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/8 p-6 backdrop-blur">
              <h2 className="text-lg font-semibold text-white">{t("overviewTitle")}</h2>
              <div className="mt-5 grid gap-4">
                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t("eventCount", { count: track.events.length })}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{track.events.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t("partnerCount", { count: partnerNames.length })}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{partnerNames.length}</p>
                </div>
                <Link href={`/events?track=${track.id}`}>
                  <Button className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400">
                    {t("viewTrackEvents")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-18">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-emerald-700">{t("eventsTitle")}</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">{t("eventsSubtitle")}</h2>
            </div>
          </div>

          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div>
            {track.events.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 p-10 text-center text-slate-600 shadow-sm">
                {t("emptyEvents")}
              </div>
            ) : (
              <div className="grid gap-5">
                {track.events.map((event) => (
                  <article key={event.id} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)]">
                    {(() => {
                      const eventType = event.type as keyof typeof typeColors;

                      return (
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={typeColors[eventType] ?? "bg-slate-100 text-slate-700"}>{getEventTypeLabel(eventType, locale)}</Badge>
                          <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                            {getEventDateRangeLabel(event, locale)}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-slate-900">
                            {locale === "en" ? event.titleEn || event.title : event.title}
                          </h3>
                          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                            {getEventSummary(event)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5">
                            <Calendar className="mr-2 h-4 w-4 text-emerald-600" />
                            {getEventDateRangeLabel(event, locale)}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5">
                            <Clock className="mr-2 h-4 w-4 text-emerald-600" />
                            {getEventTimeSummaryLabel(event, locale)}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5">
                            <MapPin className="mr-2 h-4 w-4 text-emerald-600" />
                            {locale === "en" ? event.venueEn || event.venue : event.venue}
                          </span>
                        </div>
                      </div>

                      <Link href={`/events/${event.id}`} className="shrink-0">
                        <Button variant="outline" className="border-slate-300 hover:border-emerald-600 hover:text-emerald-700">
                          {t("viewEvent")}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                      );
                    })()}
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-slate-900 p-6 text-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.5)]">
              <p className="text-sm uppercase tracking-[0.2em] text-emerald-200">{globalT(`tracks.tabs.${track.category}`)}</p>
              <h2 className="mt-3 text-2xl font-semibold">{locale === "en" ? track.nameEn || track.name : track.name}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">{locale === "en" ? track.descriptionEn || track.description : track.description}</p>
              <div className="mt-6 space-y-3">
                <Link href="/tracks" className="block">
                  <Button variant="outline" className="w-full border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white">
                    {t("browseAllTracks")}
                  </Button>
                </Link>
                <Link href="/events" className="block">
                  <Button className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400">
                    {globalT("events.viewAll")}
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] border border-emerald-100 bg-white/90 p-6 shadow-[0_18px_50px_-36px_rgba(16,185,129,0.4)]">
              <h2 className="text-lg font-semibold text-slate-900">{t("partnersTitle")}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {partnerNames.length > 0 ? partnerNames.map((partner) => (
                  <span key={partner} className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800">
                    {partner}
                  </span>
                )) : (
                  <span className="text-sm text-slate-500">-</span>
                )}
              </div>
            </div>
          </aside>
        </div>
        </div>
      </section>
    </div>
  );
}