"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Building2,
  Edit2,
  Globe,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminSectionGuard } from "@/components/admin/admin-section-guard";

// ─── Types ──────────────────────────────────────────────────────────────────

interface RelationshipForm {
  id?: string;
  type: string;
  scope: string;
  sponsorLevel?: string;
  trackId?: string;
  displaySection?: string;
  showOnHomepage: boolean;
  priority: number;
  startYear?: string;
  endYear?: string;
  isCurrent: boolean;
  note?: string;
}

interface Institution {
  id: string;
  slug: string;
  name: string;
  nameEn?: string;
  shortName?: string;
  shortNameEn?: string;
  logo?: string;
  website?: string;
  orgType?: string;
  countryOrRegion?: string;
  countryOrRegionEn?: string;
  description?: string;
  descriptionEn?: string;
  collaborationBg?: string;
  collaborationBgEn?: string;
  isActive: boolean;
  order: number;
  relationships?: RelationshipForm[];
  createdAt?: string;
}

interface TrackOption {
  id: string;
  name: string;
  nameEn?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ORG_TYPES = [
  { value: "ngo" },
  { value: "gov" },
  { value: "corp" },
  { value: "academic" },
  { value: "media" },
  { value: "community" },
  { value: "foundation" },
  { value: "intergovernmental" },
];

const RELATION_TYPES = [
  { value: "organizer" },
  { value: "co_organizer" },
  { value: "knowledge_partner" },
  { value: "strategic_partner" },
  { value: "sponsor" },
  { value: "track_leader" },
  { value: "venue_partner" },
  { value: "media_partner" },
  { value: "community_partner" },
  { value: "supporting_org" },
];

const SCOPE_OPTIONS = [
  { value: "annual" },
  { value: "track" },
  { value: "event" },
];

const SPONSOR_LEVELS = [
  { value: "platinum" },
  { value: "gold" },
  { value: "silver" },
  { value: "bronze" },
];

const DISPLAY_SECTIONS = [
  { value: "strategic" },
  { value: "knowledge" },
  { value: "sponsor" },
  { value: "none" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function emptyRelationship(): RelationshipForm {
  return {
    type: "knowledge_partner",
    scope: "annual",
    showOnHomepage: false,
    priority: 0,
    isCurrent: true,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminInstitutionsPage() {
  const locale = useLocale();
  const t = useTranslations("adminInstitutionsPage");

  const orgTypeLabels: Record<string, string> = {
    ngo: t("options.orgType.ngo"),
    gov: t("options.orgType.gov"),
    corp: t("options.orgType.corp"),
    academic: t("options.orgType.academic"),
    media: t("options.orgType.media"),
    community: t("options.orgType.community"),
    foundation: t("options.orgType.foundation"),
    intergovernmental: t("options.orgType.intergovernmental"),
  };

  const relationTypeLabels: Record<string, string> = {
    organizer: t("options.relationType.organizer"),
    co_organizer: t("options.relationType.co_organizer"),
    knowledge_partner: t("options.relationType.knowledge_partner"),
    strategic_partner: t("options.relationType.strategic_partner"),
    sponsor: t("options.relationType.sponsor"),
    track_leader: t("options.relationType.track_leader"),
    venue_partner: t("options.relationType.venue_partner"),
    media_partner: t("options.relationType.media_partner"),
    community_partner: t("options.relationType.community_partner"),
    supporting_org: t("options.relationType.supporting_org"),
  };

  const scopeLabels: Record<string, string> = {
    annual: t("options.scope.annual"),
    track: t("options.scope.track"),
    event: t("options.scope.event"),
  };

  const sponsorLevelLabels: Record<string, string> = {
    platinum: t("options.sponsorLevel.platinum"),
    gold: t("options.sponsorLevel.gold"),
    silver: t("options.sponsorLevel.silver"),
    bronze: t("options.sponsorLevel.bronze"),
  };

  const displaySectionLabels: Record<string, string> = {
    strategic: t("options.displaySection.strategic"),
    knowledge: t("options.displaySection.knowledge"),
    sponsor: t("options.displaySection.sponsor"),
    none: t("options.displaySection.none"),
  };

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [tracks, setTracks] = useState<TrackOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);

  // form state
  const [formSlug, setFormSlug] = useState("");
  const [formName, setFormName] = useState("");
  const [formNameEn, setFormNameEn] = useState("");
  const [formShortName, setFormShortName] = useState("");
  const [formShortNameEn, setFormShortNameEn] = useState("");
  const [formLogo, setFormLogo] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formOrgType, setFormOrgType] = useState("");
  const [formCountry, setFormCountry] = useState("");
  const [formCountryEn, setFormCountryEn] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDescriptionEn, setFormDescriptionEn] = useState("");
  const [formCollabBg, setFormCollabBg] = useState("");
  const [formCollabBgEn, setFormCollabBgEn] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formOrder, setFormOrder] = useState("0");
  const [formRelationships, setFormRelationships] = useState<RelationshipForm[]>([]);

  // logo upload
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // ─── Data loading ────────────────────────────────────────────────────────

  const fetchInstitutions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ includeRelationships: "true" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/institutions?${params}`);
      const data = await res.json();
      if (data.success) setInstitutions(data.data);
    } catch {
      toast.error(t("messages.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [search, t]);

  useEffect(() => { fetchInstitutions(); }, [fetchInstitutions]);

  useEffect(() => {
    fetch("/api/tracks?pageSize=100")
      .then((r) => r.json())
      .then((d) => { if (d.success || d.data?.tracks) setTracks(d.data?.tracks ?? d.data ?? []); })
      .catch(() => {});
  }, []);

  // ─── Form helpers ─────────────────────────────────────────────────────────

  function openCreate() {
    setSelectedInstitution(null);
    setFormSlug("");
    setFormName("");
    setFormNameEn("");
    setFormShortName("");
    setFormShortNameEn("");
    setFormLogo("");
    setFormWebsite("");
    setFormOrgType("");
    setFormCountry("");
    setFormCountryEn("");
    setFormDescription("");
    setFormDescriptionEn("");
    setFormCollabBg("");
    setFormCollabBgEn("");
    setFormIsActive(true);
    setFormOrder("0");
    setFormRelationships([]);
    setIsDialogOpen(true);
  }

  function openEdit(inst: Institution) {
    setSelectedInstitution(inst);
    setFormSlug(inst.slug ?? "");
    setFormName(inst.name);
    setFormNameEn(inst.nameEn ?? "");
    setFormShortName(inst.shortName ?? "");
    setFormShortNameEn(inst.shortNameEn ?? "");
    setFormLogo(inst.logo ?? "");
    setFormWebsite(inst.website ?? "");
    setFormOrgType(inst.orgType ?? "");
    setFormCountry(inst.countryOrRegion ?? "");
    setFormCountryEn(inst.countryOrRegionEn ?? "");
    setFormDescription(inst.description ?? "");
    setFormDescriptionEn(inst.descriptionEn ?? "");
    setFormCollabBg(inst.collaborationBg ?? "");
    setFormCollabBgEn(inst.collaborationBgEn ?? "");
    setFormIsActive(inst.isActive);
    setFormOrder(String(inst.order));
    setFormRelationships((inst.relationships ?? []) as RelationshipForm[]);
    setIsDialogOpen(true);
  }

  // ─── Logo upload ──────────────────────────────────────────────────────────

  async function handleLogoUpload(file: File) {
    setIsUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", "sponsors");
      const res = await fetch("/api/upload/image", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success && data.url) {
        setFormLogo(data.url);
        toast.success(t("messages.logoUploaded"));
      } else {
        toast.error(data.error || t("messages.uploadFailed"));
      }
    } catch {
      toast.error(t("messages.uploadError"));
    } finally {
      setIsUploadingLogo(false);
    }
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return toast.error(t("messages.nameRequired"));
    if (!formSlug.trim()) return toast.error(t("messages.slugRequired"));

    const payload = {
      slug: formSlug.trim(),
      name: formName.trim(),
      nameEn: formNameEn.trim() || null,
      shortName: formShortName.trim() || null,
      shortNameEn: formShortNameEn.trim() || null,
      logo: formLogo.trim() || null,
      website: formWebsite.trim() || null,
      orgType: formOrgType || null,
      countryOrRegion: formCountry.trim() || null,
      countryOrRegionEn: formCountryEn.trim() || null,
      description: formDescription.trim() || null,
      descriptionEn: formDescriptionEn.trim() || null,
      collaborationBg: formCollabBg.trim() || null,
      collaborationBgEn: formCollabBgEn.trim() || null,
      isActive: formIsActive,
      order: parseInt(formOrder) || 0,
      relationships: formRelationships,
    };

    setIsSaving(true);
    try {
      const url = selectedInstitution
        ? `/api/institutions/${selectedInstitution.id}`
        : "/api/institutions";
      const method = selectedInstitution ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success(selectedInstitution ? t("messages.updated") : t("messages.created"));
      setIsDialogOpen(false);
      fetchInstitutions();
    } catch (err: any) {
      toast.error(err.message || t("messages.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!selectedInstitution) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/institutions/${selectedInstitution.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success(t("messages.deleted"));
      setIsDeleteDialogOpen(false);
      setSelectedInstitution(null);
      fetchInstitutions();
    } catch (err: any) {
      toast.error(err.message || t("messages.deleteFailed"));
    } finally {
      setIsDeleting(false);
    }
  }

  // ─── Relationship helpers ─────────────────────────────────────────────────

  function addRelationship() {
    setFormRelationships((prev) => [...prev, emptyRelationship()]);
  }

  function removeRelationship(idx: number) {
    setFormRelationships((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateRelationship(idx: number, patch: Partial<RelationshipForm>) {
    setFormRelationships((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  // ─── Filter ───────────────────────────────────────────────────────────────

  const filtered = institutions.filter((inst) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inst.name.toLowerCase().includes(q) ||
      (inst.nameEn ?? "").toLowerCase().includes(q) ||
      inst.slug.toLowerCase().includes(q)
    );
  });

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AdminSectionGuard section="institutions">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Building2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
              <p className="text-sm text-gray-500">{t("total", { count: institutions.length })}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="w-4 h-4" /> {t("actions.add")}
            </Button>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-48 text-gray-500">
              <Building2 className="w-12 h-12 mb-3 opacity-30" />
              <p>{t("noInstitutions")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filtered.map((inst) => (
              <Card key={inst.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Logo */}
                    <div className="w-16 h-16 rounded-lg border bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {inst.logo ? (
                        <Image src={inst.logo} alt={inst.name} fill unoptimized sizes="64px" className="object-contain p-1" />
                      ) : (
                        <Building2 className="w-8 h-8 text-gray-300" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{inst.name}</h3>
                            {!inst.isActive && (
                              <Badge variant="secondary" className="text-xs">{t("inactive")}</Badge>
                            )}
                          </div>
                          {inst.nameEn && <p className="text-sm text-gray-500">{inst.nameEn}</p>}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{inst.slug}</code>
                            {inst.orgType && (
                              <Badge variant="outline" className="text-xs">
                                {orgTypeLabels[inst.orgType] || inst.orgType}
                              </Badge>
                            )}
                            {inst.countryOrRegion && (
                              <span className="text-xs text-gray-400">{inst.countryOrRegion}</span>
                            )}
                          </div>
                          {(inst.relationships ?? []).length > 0 && (
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {(inst.relationships ?? []).map((r, idx) => (
                                <Badge key={idx} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {relationTypeLabels[r.type] || r.type}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {inst.website && (
                            <Button variant="ghost" size="icon" className="w-8 h-8" asChild>
                              <a href={inst.website} target="_blank" rel="noopener noreferrer">
                                <Globe className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8"
                            onClick={() => openEdit(inst)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-red-500 hover:text-red-700"
                            onClick={() => { setSelectedInstitution(inst); setIsDeleteDialogOpen(true); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedInstitution ? t("dialog.editTitle") : t("dialog.addTitle")}</DialogTitle>
              <DialogDescription>
                {selectedInstitution ? t("dialog.editDescription") : t("dialog.addDescription")}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5 mt-2">
              {/* Slug */}
              <div className="space-y-1.5">
                <Label>{t("fields.slug")} <span className="text-red-500">*</span></Label>
                <div className="flex gap-2">
                  <Input
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="e.g. wwf-china"
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormSlug(slugify(formNameEn || formName))}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {t("actions.generate")}
                  </Button>
                </div>
              </div>

              {/* Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("fields.nameZh")}<span className="text-red-500">*</span></Label>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="世界自然基金会" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fields.nameEn")}</Label>
                  <Input value={formNameEn} onChange={(e) => setFormNameEn(e.target.value)} placeholder="WWF China" />
                </div>
              </div>

              {/* Short Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("fields.shortNameZh")}</Label>
                  <Input value={formShortName} onChange={(e) => setFormShortName(e.target.value)} placeholder="世界自然基金会" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fields.shortNameEn")}</Label>
                  <Input value={formShortNameEn} onChange={(e) => setFormShortNameEn(e.target.value)} placeholder="WWF" />
                </div>
              </div>

              {/* Logo */}
              <div className="space-y-1.5">
                <Label>{t("fields.logo")}</Label>
                <div className="flex gap-2 items-center">
                  {formLogo && (
                    <div className="w-12 h-12 border rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center flex-shrink-0">
                      <Image src={formLogo} alt="logo" fill unoptimized sizes="48px" className="object-contain p-1" />
                    </div>
                  )}
                  <Input
                    value={formLogo}
                    onChange={(e) => setFormLogo(e.target.value)}
                    placeholder={t("fields.logoPlaceholder")}
                    className="flex-1"
                  />
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploadingLogo}
                  >
                    {isUploadingLogo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  </Button>
                </div>
              </div>

              {/* Website / OrgType */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("fields.website")}</Label>
                  <Input value={formWebsite} onChange={(e) => setFormWebsite(e.target.value)} placeholder="https://..." />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fields.orgType")}</Label>
                  <Select value={formOrgType} onValueChange={setFormOrgType}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("fields.selectType")} />
                    </SelectTrigger>
                    <SelectContent>
                      {ORG_TYPES.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{orgTypeLabels[o.value] || o.value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Country */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("fields.countryZh")}</Label>
                  <Input value={formCountry} onChange={(e) => setFormCountry(e.target.value)} placeholder="中国" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fields.countryEn")}</Label>
                  <Input value={formCountryEn} onChange={(e) => setFormCountryEn(e.target.value)} placeholder="China" />
                </div>
              </div>

              {/* Description */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("fields.descriptionZh")}</Label>
                  <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={3} placeholder="机构介绍..." />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fields.descriptionEn")}</Label>
                  <Textarea value={formDescriptionEn} onChange={(e) => setFormDescriptionEn(e.target.value)} rows={3} placeholder="About the institution..." />
                </div>
              </div>

              {/* Collaboration Background */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("fields.collabZh")}</Label>
                  <Textarea value={formCollabBg} onChange={(e) => setFormCollabBg(e.target.value)} rows={3} placeholder="与上海气候周的合作背景..." />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fields.collabEn")}</Label>
                  <Textarea value={formCollabBgEn} onChange={(e) => setFormCollabBgEn(e.target.value)} rows={3} placeholder="Collaboration background with SHCW..." />
                </div>
              </div>

              {/* Order / Active */}
              <div className="flex gap-6 items-center">
                <div className="space-y-1.5">
                  <Label>{t("fields.order")}</Label>
                  <Input
                    type="number"
                    value={formOrder}
                    onChange={(e) => setFormOrder(e.target.value)}
                    className="w-24"
                  />
                </div>
                <div className="flex items-center gap-2 mt-5">
                  <Checkbox
                    id="inst-active"
                    checked={formIsActive}
                    onCheckedChange={(v) => setFormIsActive(Boolean(v))}
                  />
                  <Label htmlFor="inst-active">{t("fields.active")}</Label>
                </div>
              </div>

              {/* Relationships */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">{t("fields.relationships")}</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addRelationship} className="gap-1">
                    <Plus className="w-3 h-3" /> {t("actions.addRelationship")}
                  </Button>
                </div>

                {formRelationships.length === 0 && (
                  <p className="text-sm text-gray-400 italic">{t("fields.emptyRelationships")}</p>
                )}

                {formRelationships.map((rel, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-3 relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 w-6 h-6 text-gray-400 hover:text-red-500"
                      onClick={() => removeRelationship(idx)}
                    >
                      <X className="w-3 h-3" />
                    </Button>

                    {/* Type / Scope */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("fields.relationshipType")}</Label>
                        <Select value={rel.type} onValueChange={(v) => updateRelationship(idx, { type: v })}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RELATION_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{relationTypeLabels[t.value] || t.value}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("fields.scope")}</Label>
                        <Select value={rel.scope} onValueChange={(v) => updateRelationship(idx, { scope: v })}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SCOPE_OPTIONS.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{scopeLabels[s.value] || s.value}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Sponsor level (conditional) */}
                    {rel.type === "sponsor" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("fields.sponsorLevel")}</Label>
                        <Select
                          value={rel.sponsorLevel ?? ""}
                          onValueChange={(v) => updateRelationship(idx, { sponsorLevel: v })}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder={t("fields.selectLevel")} />
                          </SelectTrigger>
                          <SelectContent>
                            {SPONSOR_LEVELS.map((l) => (
                              <SelectItem key={l.value} value={l.value}>{sponsorLevelLabels[l.value] || l.value}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Track (if scope=track) */}
                    {rel.scope === "track" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("fields.relatedTrack")}</Label>
                        <Select
                          value={rel.trackId ?? ""}
                          onValueChange={(v) => updateRelationship(idx, { trackId: v || undefined })}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder={t("fields.selectTrack")} />
                          </SelectTrigger>
                          <SelectContent>
                            {tracks.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {locale === "en" ? (t.nameEn || t.name) : t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Display section / Homepage */}
                    <div className="grid grid-cols-2 gap-3 items-end">
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("fields.displaySection")}</Label>
                        <Select
                          value={rel.displaySection ?? ""}
                          onValueChange={(v) => updateRelationship(idx, { displaySection: v || undefined })}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder={t("fields.selectSection")} />
                          </SelectTrigger>
                          <SelectContent>
                            {DISPLAY_SECTIONS.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{displaySectionLabels[s.value] || s.value}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2 pb-1">
                        <Checkbox
                          id={`rel-homepage-${idx}`}
                          checked={rel.showOnHomepage}
                          onCheckedChange={(v) => updateRelationship(idx, { showOnHomepage: Boolean(v) })}
                        />
                        <Label htmlFor={`rel-homepage-${idx}`} className="text-xs">{t("fields.showOnHomepage")}</Label>
                      </div>
                    </div>

                    {/* Priority / Year range */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("fields.priority")}</Label>
                        <Input
                          type="number"
                          className="h-8 text-sm"
                          value={rel.priority}
                          onChange={(e) => updateRelationship(idx, { priority: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("fields.startYear")}</Label>
                        <Input
                          type="number"
                          className="h-8 text-sm"
                          value={rel.startYear ?? ""}
                          onChange={(e) => updateRelationship(idx, { startYear: e.target.value || undefined })}
                          placeholder="2024"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("fields.endYear")}</Label>
                        <Input
                          type="number"
                          className="h-8 text-sm"
                          value={rel.endYear ?? ""}
                          onChange={(e) => updateRelationship(idx, { endYear: e.target.value || undefined })}
                          placeholder="2026"
                          disabled={rel.isCurrent}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 mt-6">
                        <Checkbox
                          id={`rel-current-${idx}`}
                          checked={rel.isCurrent}
                          onCheckedChange={(v) => updateRelationship(idx, { isCurrent: Boolean(v) })}
                        />
                        <Label htmlFor={`rel-current-${idx}`} className="text-xs">{t("fields.current")}</Label>
                      </div>
                    </div>

                    {/* Note */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t("fields.note")}</Label>
                      <Input
                        className="h-8 text-sm"
                        value={rel.note ?? ""}
                        onChange={(e) => updateRelationship(idx, { note: e.target.value || undefined })}
                        placeholder={t("fields.notePlaceholder")}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t("actions.cancel")}
                </Button>
                <LoadingButton type="submit" loading={isSaving}>
                  {selectedInstitution ? t("actions.saveChanges") : t("actions.create")}
                </LoadingButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("dialog.confirmDeleteTitle")}</DialogTitle>
              <DialogDescription>
                {t("dialog.confirmDeleteDescription", { name: selectedInstitution?.name ?? "" })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                {t("actions.cancel")}
              </Button>
              <LoadingButton variant="destructive" loading={isDeleting} onClick={handleDelete}>
                {t("actions.delete")}
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminSectionGuard>
  );
}
