import {
  ArrowRight,
  Building2,
  Globe,
  Leaf,
  Sparkles,
  TrendingUp,
  TreePine,
  Users,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/routing";

type TrackCategory = "institution" | "economy" | "foundation" | "accelerator";

const iconMap: Record<string, React.ElementType> = {
  Building2,
  TrendingUp,
  Leaf,
  Globe,
  Users,
  Sparkles,
  TreePine,
};

const categoryOrder: TrackCategory[] = ["institution", "economy", "foundation", "accelerator"];

function getTrackPartners(track: {
  partners: unknown;
  partnersEn: unknown;
}, locale: string) {
  const source = locale === "en"
    ? (Array.isArray(track.partnersEn) && track.partnersEn.length ? track.partnersEn : Array.isArray(track.partners) ? track.partners : [])
    : Array.isArray(track.partners) ? track.partners : [];

  return source.filter((partner): partner is string => typeof partner === "string");
}

export default async function TracksPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);

  const t = await getTranslations("tracksPage");
  const globalT = await getTranslations();
  const locale = params.locale;

  const tracks = await prisma.track.findMany({
    include: {
      events: {
        where: { isPublished: true },
        select: { id: true },
      },
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  const groupedTracks = categoryOrder
    .map((category) => ({
      category,
      label: globalT(`tracks.tabs.${category}`),
      items: tracks.filter((track) => track.category === category),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7fbf8_0%,#eef6f1_46%,#ffffff_100%)] pt-16 lg:pt-20">
      <section className="relative overflow-hidden border-b border-emerald-100 bg-slate-950 py-20 text-white sm:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.28),transparent_38%),radial-gradient(circle_at_85%_25%,rgba(56,189,248,0.24),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(12,74,110,0.9))]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
              {t("heroBadge")}
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">{t("title")}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">{t("subtitle")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                {t("eventCount", { count: tracks.reduce((sum, track) => sum + track.events.length, 0) })}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                {t("categoryHeading")}: {groupedTracks.length}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {groupedTracks.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center text-slate-600 shadow-sm">
              {t("empty")}
            </div>
          ) : (
            <div className="space-y-14">
              {groupedTracks.map((group) => (
                <section key={group.category} className="space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-700">{t("categoryHeading")}</p>
                      <h2 className="mt-2 text-2xl font-semibold text-slate-900">{group.label}</h2>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {group.items.map((track) => {
                      const Icon = iconMap[track.icon] || Globe;
                      const partnerNames = getTrackPartners(track, locale);

                      return (
                        <Link
                          key={track.id}
                          href={`/tracks/${track.id}`}
                          className="group flex h-full flex-col rounded-[28px] border border-emerald-100 bg-white/90 p-6 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.4)] transition duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_26px_70px_-34px_rgba(16,185,129,0.45)]"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div
                              className="flex h-14 w-14 items-center justify-center rounded-2xl"
                              style={{ backgroundColor: `${track.color}1A` }}
                            >
                              <Icon className="h-7 w-7" style={{ color: track.color }} />
                            </div>
                            <span className="text-3xl font-semibold tracking-tight text-slate-200 transition group-hover:text-slate-300">
                              {track.code}
                            </span>
                          </div>

                          <div className="mt-6 space-y-3">
                            <h3 className="text-xl font-semibold text-slate-900 transition group-hover:text-emerald-700">
                              {locale === "en" ? track.nameEn || track.name : track.name}
                            </h3>
                            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">{t("cardDescription")}</p>
                            <p className="line-clamp-3 text-sm leading-7 text-slate-600">
                              {locale === "en" ? track.descriptionEn || track.description : track.description}
                            </p>
                          </div>

                          <div className="mt-6 flex flex-wrap gap-2">
                            {partnerNames.slice(0, 3).map((partner) => (
                              <span key={partner} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                                {partner}
                              </span>
                            ))}
                            {partnerNames.length > 3 ? (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                                +{partnerNames.length - 3}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-6">
                            <div>
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t("partners")}</p>
                              <p className="mt-1 text-sm font-medium text-slate-700">{t("eventCount", { count: track.events.length })}</p>
                            </div>
                            <span className="inline-flex items-center text-sm font-medium text-emerald-700">
                              {t("viewDetail")}
                              <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}

          <div className="mt-14 flex justify-center">
            <Link href="/events">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                {t("browseEvents")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}