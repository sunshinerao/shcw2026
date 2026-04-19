import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Calendar,
  Globe,
  Link2,
  MapPin,
  Mic,
  Sparkles,
  Tag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { getSpeakerDisplayPairs, getSpeakerDisplayTitle, getSpeakerDisplayOrganization } from "@/lib/speaker-display";

function localize(locale: string, zh?: string | null, en?: string | null) {
  return locale === "en" ? en || zh || "" : zh || en || "";
}

function formatDate(locale: string, value: Date) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(value);
}

function splitBiography(text?: string | null) {
  if (!text) return [];
  return text
    .split(/\n+/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function getInitials(name: string) {
  const trimmed = name.trim();
  return trimmed.length >= 2 ? trimmed.slice(0, 2).toUpperCase() : trimmed.slice(0, 1).toUpperCase();
}

export default async function SpeakerProfilePage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  setRequestLocale(params.locale);

  const locale = params.locale;
  const copy = locale === "en"
    ? {
        back: "Back to Speakers",
        heroBadge: "Speaker Profile",
        keynote: "Keynote Speaker",
        summary: "Summary",
        relevance: "Why This Speaker Matters to SHCW",
        biography: "Biography",
        career: "Career Highlights",
        currentRole: "Current Role",
        organization: "Organization",
        links: "Links & Media",
        relatedEvents: "Related Events",
        noEvents: "No public event appearances are linked yet.",
        website: "Website",
        linkedin: "LinkedIn",
        twitter: "X / Twitter",
        featuredIn: "Featured in {count} event(s) at Shanghai Climate Week.",
        roleLabel: "Current Position",
        orgLabel: "Affiliation",
        countryLabel: "Country / Region",
        expertiseLabel: "Areas of Expertise",
        presentLabel: "Present",
      }
    : {
        back: "返回嘉宾列表",
        heroBadge: "嘉宾档案",
        keynote: "主旨嘉宾",
        summary: "摘要",
        relevance: "与上海气候周的关联",
        biography: "人物简介",
        career: "职务履历",
        currentRole: "当前职务",
        organization: "所属机构",
        links: "链接与资料",
        relatedEvents: "相关活动",
        noEvents: "暂未关联公开活动。",
        website: "官网",
        linkedin: "LinkedIn",
        twitter: "X / Twitter",
        featuredIn: "已参与上海气候周 {count} 场相关活动。",
        roleLabel: "当前职位",
        orgLabel: "所属机构",
        countryLabel: "国家 / 地区",
        expertiseLabel: "专业领域",
        presentLabel: "至今",
      };

  const speaker = await prisma.speaker.findFirst({
    where: {
      OR: [{ id: params.id }, { slug: params.id }],
      isVisible: true,
    },
    select: {
      id: true,
      slug: true,
      salutation: true,
      name: true,
      nameEn: true,
      avatar: true,
      title: true,
      titleEn: true,
      organization: true,
      organizationEn: true,
      organizationLogo: true,
      bio: true,
      bioEn: true,
      summary: true,
      summaryEn: true,
      countryOrRegion: true,
      countryOrRegionEn: true,
      relevanceToShcw: true,
      relevanceToShcwEn: true,
      expertiseTags: true,
      linkedin: true,
      twitter: true,
      website: true,
      isKeynote: true,
      isVisible: true,
      roles: {
        orderBy: [
          { isCurrent: "desc" },
          { order: "asc" },
          { startYear: "desc" },
        ],
      },
      agendaItems: {
        include: {
          event: {
            select: {
              id: true,
              title: true,
              titleEn: true,
              startDate: true,
              venue: true,
              venueEn: true,
              isPublished: true,
            },
          },
        },
        orderBy: [{ agendaDate: "asc" }, { startTime: "asc" }],
      },
      moderatedItems: {
        include: {
          event: {
            select: {
              id: true,
              title: true,
              titleEn: true,
              startDate: true,
              venue: true,
              venueEn: true,
              isPublished: true,
            },
          },
        },
        orderBy: [{ agendaDate: "asc" }, { startTime: "asc" }],
      },
    },
  });

  if (!speaker) {
    notFound();
  }

  const displayName = localize(locale, speaker.name, speaker.nameEn);
  const headingName = speaker.salutation ? `${speaker.salutation} ${displayName}` : displayName;
  const title = getSpeakerDisplayTitle(speaker, locale, "primary") || localize(locale, speaker.title, speaker.titleEn);
  const organization = getSpeakerDisplayOrganization(speaker, locale, "primary") || localize(locale, speaker.organization, speaker.organizationEn);
  const currentRolePairs = getSpeakerDisplayPairs(speaker, locale, "allCurrent");
  const biography = localize(locale, speaker.bio, speaker.bioEn);
  // Use explicit summary if available, otherwise fall back to the first 160 chars of bio
  const summaryRaw = localize(locale, speaker.summary, speaker.summaryEn) || biography;
  const summary = summaryRaw.length > 160
    ? `${summaryRaw.slice(0, 157).trim()}...`
    : summaryRaw;
  const countryOrRegion = localize(locale, speaker.countryOrRegion, speaker.countryOrRegionEn);
  const relevance = localize(locale, speaker.relevanceToShcw, speaker.relevanceToShcwEn);
  const expertiseTags = Array.isArray(speaker.expertiseTags)
    ? (speaker.expertiseTags as string[]).filter(Boolean)
    : [];
  const bioBlocks = splitBiography(biography);
  // Career roles (all, sorted isCurrent first)
  const careerRoles = speaker.roles;

  const relatedEventsMap = new Map<string, {
    id: string;
    title: string;
    startDate: Date;
    venue: string;
  }>();

  [...speaker.agendaItems, ...speaker.moderatedItems].forEach((item) => {
    if (!item.event.isPublished) return;
    relatedEventsMap.set(item.event.id, {
      id: item.event.id,
      title: localize(locale, item.event.title, item.event.titleEn),
      startDate: item.event.startDate,
      venue: localize(locale, item.event.venue, item.event.venueEn),
    });
  });

  const relatedEvents = Array.from(relatedEventsMap.values()).sort(
    (left, right) => left.startDate.getTime() - right.startDate.getTime(),
  );

  const linkItems = [
    speaker.website ? { label: copy.website, href: speaker.website } : null,
    speaker.linkedin ? { label: copy.linkedin, href: speaker.linkedin } : null,
    speaker.twitter ? { label: copy.twitter, href: speaker.twitter } : null,
  ].filter((item): item is { label: string; href: string } => Boolean(item));

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: headingName,
    jobTitle: title,
    worksFor: { "@type": "Organization", name: organization },
    description: biography.slice(0, 300) || undefined,
    ...(speaker.avatar && { image: speaker.avatar }),
    sameAs: [
      speaker.linkedin,
      speaker.website,
    ].filter(Boolean),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eefbf5_34%,#ffffff_100%)] pt-16 lg:pt-20">
      <section className="relative overflow-hidden border-b border-emerald-100 bg-slate-950 py-16 text-white sm:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(16,185,129,0.26),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(59,130,246,0.18),transparent_24%),linear-gradient(135deg,rgba(2,6,23,0.98),rgba(6,78,59,0.92))]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link href="/speakers" className="inline-flex items-center text-sm font-medium text-emerald-200 transition hover:text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {copy.back}
          </Link>

          <div className="mt-8 grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
            <div className="overflow-hidden rounded-[28px] border border-white/12 bg-white/8 p-4 backdrop-blur">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-slate-900/70">
                {speaker.avatar ? (
                  <Image
                    src={speaker.avatar}
                    alt={headingName}
                    fill
                    unoptimized
                    sizes="(max-width: 1024px) 80vw, 320px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,#1e293b,#0f172a)] text-5xl font-semibold text-white/85">
                    {getInitials(displayName)}
                  </div>
                )}
              </div>
            </div>

            <div>
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
                {copy.heroBadge}
              </span>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {speaker.isKeynote ? <Badge className="bg-amber-400 text-slate-950 hover:bg-amber-300">{copy.keynote}</Badge> : null}
                <Badge variant="secondary" className="border border-white/12 bg-white/10 text-slate-100 hover:bg-white/10">
                  <Mic className="mr-1.5 h-3.5 w-3.5" />
                  {relatedEvents.length === 0 ? (locale === "en" ? "Speaker" : "嘉宾") : copy.featuredIn.replace("{count}", String(relatedEvents.length))}
                </Badge>
              </div>
              <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">{headingName}</h1>
              <p className="mt-4 text-xl font-medium text-emerald-200">{title}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-300">
                <span className="inline-flex items-center rounded-full bg-white/8 px-3 py-1.5">
                  <Building2 className="mr-2 h-4 w-4 text-emerald-300" />
                  {organization}
                </span>
                {countryOrRegion ? (
                  <span className="inline-flex items-center rounded-full bg-white/8 px-3 py-1.5">
                    <Globe className="mr-2 h-4 w-4 text-emerald-300" />
                    {countryOrRegion}
                  </span>
                ) : null}
                {speaker.organizationLogo ? (
                  <span className="inline-flex items-center rounded-full bg-white/8 px-3 py-1.5">
                    <Sparkles className="mr-2 h-4 w-4 text-emerald-300" />
                    {locale === "en" ? "Institution Profile Available" : "机构资料已配置"}
                  </span>
                ) : null}
              </div>

              {summary ? (
                <div className="mt-8 max-w-3xl rounded-[24px] border border-white/10 bg-white/8 p-6 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">{copy.summary}</p>
                  <p className="mt-3 text-lg leading-8 text-slate-100">{summary}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-18">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
          <div className="space-y-8">
            {(relevance || relatedEvents.length > 0) ? (
              <section className="rounded-[28px] border border-emerald-100 bg-emerald-50/70 p-6 shadow-[0_20px_50px_-35px_rgba(16,185,129,0.35)]">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">{copy.relevance}</p>
                <p className="mt-3 text-base leading-8 text-slate-700">
                  {relevance || copy.featuredIn.replace("{count}", String(relatedEvents.length))}
                </p>
              </section>
            ) : null}

            {bioBlocks.length > 0 ? (
              <section className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)]">
                <h2 className="text-2xl font-semibold text-slate-900">{copy.biography}</h2>
                <div className="mt-5 space-y-5 text-base leading-8 text-slate-600">
                  {bioBlocks.map((block, index) => (
                    <p key={`${speaker.id}-bio-${index}`}>{block}</p>
                  ))}
                </div>
              </section>
            ) : null}

            {expertiseTags.length > 0 ? (
              <section className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)]">
                <h2 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
                  <Tag className="h-5 w-5 text-emerald-600" />
                  {copy.expertiseLabel}
                </h2>
                <div className="mt-5 flex flex-wrap gap-2">
                  {expertiseTags.map((tag, i) => (
                    <Badge
                      key={i}
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </section>
            ) : null}

            {careerRoles.length > 0 ? (
              <section className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)]">
                <h2 className="text-2xl font-semibold text-slate-900">{copy.career}</h2>
                <div className="mt-6 space-y-0 border-l-2 border-emerald-200 pl-6">
                  {careerRoles.map((role) => (
                    <div key={role.id} className="relative pb-6 last:pb-0">
                      <div className="absolute -left-[1.625rem] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-emerald-500 bg-white" />
                      <p className="text-sm font-semibold text-emerald-700">
                        {role.startYear ?? "?"} — {role.isCurrent ? copy.presentLabel : (role.endYear ? String(role.endYear) : "?")}
                      </p>
                      <p className="mt-1 text-base font-semibold text-slate-900">
                        {localize(locale, role.title, role.titleEn)}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {localize(locale, role.organization, role.organizationEn)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)]">
              <h2 className="text-2xl font-semibold text-slate-900">{copy.relatedEvents}</h2>
              {relatedEvents.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
                  {copy.noEvents}
                </div>
              ) : (
                <div className="mt-6 grid gap-4">
                  {relatedEvents.map((event) => (
                    <article key={event.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-lg font-semibold text-slate-900">{event.title}</p>
                          <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
                            <span className="inline-flex items-center rounded-full bg-white px-3 py-1.5">
                              <Calendar className="mr-2 h-4 w-4 text-emerald-600" />
                              {formatDate(locale, event.startDate)}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-white px-3 py-1.5">
                              <MapPin className="mr-2 h-4 w-4 text-emerald-600" />
                              {event.venue}
                            </span>
                          </div>
                        </div>
                        <Link href={`/events/${event.id}`} className="shrink-0">
                          <Button variant="outline" className="border-slate-300 hover:border-emerald-600 hover:text-emerald-700">
                            {locale === "en" ? "View Event" : "查看活动"}
                            <ArrowUpRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)]">
              <h2 className="text-lg font-semibold text-slate-900">{copy.currentRole}</h2>
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{copy.roleLabel}</p>
                  <div className="mt-2 space-y-2">
                    {currentRolePairs.length > 0 ? currentRolePairs.map((role, index) => (
                      <div key={`${speaker.id}-current-role-${index}`} className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                        <p className="text-base font-semibold text-slate-900">{role.title || title}</p>
                        {role.organization ? <p className="mt-0.5 text-sm text-slate-500">{role.organization}</p> : null}
                      </div>
                    )) : <p className="text-base font-semibold text-slate-900">{title}</p>}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{copy.orgLabel}</p>
                  <div className="mt-2 flex items-center gap-3">
                    {speaker.organizationLogo ? (
                      <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
                        <Image
                          src={speaker.organizationLogo}
                          alt={organization}
                          fill
                          unoptimized
                          sizes="40px"
                          className="object-contain p-1.5"
                        />
                      </div>
                    ) : null}
                    <p className="text-base font-semibold text-slate-900">{organization}</p>
                  </div>
                </div>
                {countryOrRegion ? (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{copy.countryLabel}</p>
                    <p className="mt-2 text-base font-semibold text-slate-900">{countryOrRegion}</p>
                  </div>
                ) : null}
              </div>
            </section>

            {linkItems.length > 0 ? (
              <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)]">
                <h2 className="text-lg font-semibold text-slate-900">{copy.links}</h2>
                <div className="mt-5 grid gap-3">
                  {linkItems.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-emerald-400 hover:text-emerald-700"
                    >
                      <span className="inline-flex items-center">
                        <Link2 className="mr-2 h-4 w-4" />
                        {item.label}
                      </span>
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)]">
              <h2 className="text-lg font-semibold text-slate-900">{copy.organization}</h2>
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <div className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  <Globe className="mr-2 h-3.5 w-3.5" />
                  {locale === "en" ? "Institution" : "机构"}
                </div>
                <p className="mt-3 text-base font-semibold text-slate-900">{organization}</p>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </div>
    </>
  );
}