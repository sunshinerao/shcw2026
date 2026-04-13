"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useLocale } from "next-intl";
import {
  ArrowLeft,
  Building2,
  Calendar,
  ExternalLink,
  Globe,
  MapPin,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@/i18n/routing";

// ─── Types ────────────────────────────────────────────────────────────────────

type Track = {
  id: string;
  name: string;
  nameEn: string | null;
};

type Relationship = {
  id: string;
  type: string;
  scope: string | null;
  sponsorLevel: string | null;
  displaySection: string | null;
  showOnHomepage: boolean;
  priority: number;
  startYear: number | null;
  endYear: number | null;
  isCurrent: boolean;
  note: string | null;
  track: Track | null;
};

type EventItem = {
  role: string | null;
  event: {
    id: string;
    title: string;
    titleEn: string | null;
    type: string | null;
    startDate: string;
    endDate: string | null;
    venue: string | null;
    isPublished: boolean;
  };
};

type SpeakerItem = {
  id: string;
  name: string;
  nameEn: string | null;
  title: string;
  titleEn: string | null;
  organization: string;
  organizationEn: string | null;
  avatar: string | null;
  isKeynote: boolean;
};

type Institution = {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  shortName: string | null;
  shortNameEn: string | null;
  logo: string | null;
  website: string | null;
  orgType: string | null;
  countryOrRegion: string | null;
  countryOrRegionEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  collaborationBg: string | null;
  collaborationBgEn: string | null;
  relationships: Relationship[];
  events: EventItem[];
  speakers: SpeakerItem[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isLocalImagePath(src: string) {
  return src.startsWith("/") || src.startsWith("./");
}

const relationshipTypeLabels: Record<string, { zh: string; en: string }> = {
  strategic_partner: { zh: "战略合作伙伴", en: "Strategic Partner" },
  knowledge_partner: { zh: "知识合作伙伴", en: "Knowledge Partner" },
  sponsor: { zh: "赞助商", en: "Sponsor" },
  supporter: { zh: "支持机构", en: "Supporter" },
  media_partner: { zh: "媒体合作", en: "Media Partner" },
  organizer: { zh: "主办方", en: "Organizer" },
  co_organizer: { zh: "联合主办", en: "Co-Organizer" },
};

function getRelTypeLabel(type: string, locale: string) {
  const entry = relationshipTypeLabels[type];
  if (!entry) return type;
  return locale === "en" ? entry.en : entry.zh;
}

function formatEventDate(startDate: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(startDate));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InstitutionDetailPage() {
  const locale = useLocale();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/public/institutions/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setInstitution(data.data as Institution);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const displayName =
    locale === "en"
      ? institution?.nameEn || institution?.name || ""
      : institution?.name || "";

  const description =
    locale === "en"
      ? institution?.descriptionEn || institution?.description
      : institution?.description;

  const collaborationBg =
    locale === "en"
      ? institution?.collaborationBgEn || institution?.collaborationBg
      : institution?.collaborationBg;

  const country =
    locale === "en"
      ? institution?.countryOrRegionEn || institution?.countryOrRegion
      : institution?.countryOrRegion;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (notFound || !institution) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Building2 className="mx-auto mb-4 h-12 w-12 text-slate-300" />
        <h2 className="mb-2 text-xl font-semibold text-slate-700">
          {locale === "zh" ? "机构未找到" : "Institution Not Found"}
        </h2>
        <p className="mb-6 text-sm text-slate-500">
          {locale === "zh"
            ? "该机构不存在或尚未公开"
            : "This institution does not exist or is not yet public."}
        </p>
        <Link href="/partners">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {locale === "zh" ? "返回合作伙伴" : "Back to Partners"}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-10">
      {/* Back button */}
      <Link href="/partners">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {locale === "zh" ? "合作伙伴" : "Partners"}
        </Button>
      </Link>

      {/* ── Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-6 sm:flex-row sm:items-center"
      >
        {/* Logo */}
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          {institution.logo ? (
            <Image
              src={institution.logo}
              alt={displayName}
              fill
              unoptimized={!isLocalImagePath(institution.logo)}
              sizes="112px"
              className="object-contain"
            />
          ) : (
            <Building2 className="h-full w-full p-4 text-slate-300" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{displayName}</h1>
          {institution.nameEn && institution.name !== institution.nameEn && locale === "zh" && (
            <p className="mt-0.5 text-sm text-slate-500">{institution.nameEn}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {institution.orgType && (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                {institution.orgType}
              </Badge>
            )}
            {country && (
              <span className="inline-flex items-center gap-1 text-sm text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                {country}
              </span>
            )}
            {institution.website && (
              <a
                href={institution.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:underline"
              >
                <Globe className="h-3.5 w-3.5" />
                {locale === "zh" ? "官方网站" : "Website"}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── About ── */}
      {description && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-3"
        >
          <h2 className="text-lg font-semibold text-slate-900">
            {locale === "zh" ? "机构简介" : "About"}
          </h2>
          <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">
            {description}
          </p>
        </motion.section>
      )}

      {/* ── Collaboration Background ── */}
      {collaborationBg && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="rounded-2xl bg-emerald-50 p-6 space-y-3"
        >
          <h2 className="text-lg font-semibold text-emerald-900">
            {locale === "zh" ? "与上海气候周的合作背景" : "Collaboration with SHCW"}
          </h2>
          <p className="text-sm leading-relaxed text-emerald-800 whitespace-pre-line">
            {collaborationBg}
          </p>
        </motion.section>
      )}

      {/* ── Role / Relationships ── */}
      {institution.relationships.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-4"
        >
          <h2 className="text-lg font-semibold text-slate-900">
            {locale === "zh" ? "合作角色" : "Partnership Roles"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {institution.relationships.map((rel) => (
              <div
                key={rel.id}
                className="rounded-xl border border-slate-200 bg-white p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Badge className="bg-slate-100 text-slate-700">
                    {getRelTypeLabel(rel.type, locale)}
                  </Badge>
                  {rel.isCurrent && (
                    <Badge className="bg-emerald-50 text-emerald-700 text-[10px] px-1.5">
                      {locale === "zh" ? "当前" : "Current"}
                    </Badge>
                  )}
                </div>
                {rel.track && (
                  <p className="text-xs text-slate-500">
                    {locale === "en" && rel.track.nameEn
                      ? rel.track.nameEn
                      : rel.track.name}
                  </p>
                )}
                {rel.scope && (
                  <p className="text-xs text-slate-400">{rel.scope}</p>
                )}
                {(rel.startYear || rel.endYear) && (
                  <p className="text-xs text-slate-400">
                    {rel.startYear}
                    {rel.endYear && rel.endYear !== rel.startYear
                      ? ` – ${rel.endYear}`
                      : ""}
                  </p>
                )}
                {rel.note && (
                  <p className="text-xs text-slate-500 leading-relaxed">{rel.note}</p>
                )}
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── Related Events ── */}
      {institution.events.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="space-y-4"
        >
          <h2 className="text-lg font-semibold text-slate-900">
            {locale === "zh" ? "关联活动" : "Related Events"}
            <span className="ml-2 text-sm font-normal text-slate-400">
              ({institution.events.length})
            </span>
          </h2>
          <div className="space-y-2">
            {institution.events.map((ei) => {
              const evTitle =
                locale === "en" && ei.event.titleEn
                  ? ei.event.titleEn
                  : ei.event.title;
              return (
                <Link key={ei.event.id} href={`/events/${ei.event.id}`}>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-emerald-200 hover:shadow-sm">
                    <Calendar className="h-5 w-5 shrink-0 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900 truncate">{evTitle}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatEventDate(ei.event.startDate, locale)}
                        {ei.event.venue && ` · ${ei.event.venue}`}
                      </p>
                    </div>
                    {ei.role && (
                      <Badge className="bg-emerald-50 text-emerald-700 text-[10px] px-1.5 shrink-0">
                        {ei.role}
                      </Badge>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* ── Related Speakers ── */}
      {institution.speakers.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-4"
        >
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-400" />
            {locale === "zh" ? "相关嘉宾" : "Related Speakers"}
            <span className="text-sm font-normal text-slate-400">
              ({institution.speakers.length})
            </span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {institution.speakers.map((speaker) => {
              const spName =
                locale === "en" && speaker.nameEn ? speaker.nameEn : speaker.name;
              const spTitle =
                locale === "en" && speaker.titleEn ? speaker.titleEn : speaker.title;
              const spOrg =
                locale === "en" && speaker.organizationEn
                  ? speaker.organizationEn
                  : speaker.organization;
              return (
                <div
                  key={speaker.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={speaker.avatar || undefined} />
                    <AvatarFallback className="text-sm">
                      {spName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-slate-900 truncate">
                        {spName}
                      </span>
                      {speaker.isKeynote && (
                        <Badge className="bg-purple-50 text-purple-700 text-[10px] px-1 py-0 shrink-0">
                          Keynote
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 line-clamp-2">
                      {spTitle} · {spOrg}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>
      )}
    </div>
  );
}
