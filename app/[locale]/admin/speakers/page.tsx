"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Star,
  Mail,
  Linkedin,
  Twitter,
  Globe,
  X,
  Upload,
  Check,
  Filter,
  Building2,
  Sparkles,
  Loader2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminSectionGuard } from "@/components/admin/admin-section-guard";
import { getLocalizedSalutationOptions } from "@/lib/user-form-options";
import { getSpeakerDisplayOrganization, getSpeakerDisplayTitle, type SpeakerRoleDisplayMode } from "@/lib/speaker-display";

// Speaker interface based on schema
interface Speaker {
  id: string;
  slug?: string;
  salutation?: string;
  name: string;
  nameEn?: string;
  avatar?: string;
  title: string;
  titleEn?: string;
  organization: string;
  organizationEn?: string;
  organizationLogo?: string;
  bio?: string;
  bioEn?: string;
  summary?: string;
  summaryEn?: string;
  countryOrRegion?: string;
  countryOrRegionEn?: string;
  relevanceToShcw?: string;
  relevanceToShcwEn?: string;
  expertiseTags?: string[];
  email?: string;
  linkedin?: string;
  twitter?: string;
  website?: string;
  isKeynote: boolean;
  isVisible?: boolean;
  order: number;
  institutionId?: string | null;
  institution?: { id: string; slug: string; name: string; nameEn?: string | null; logo?: string | null } | null;
  roles?: SpeakerRoleForm[];
  agendaItemsCount?: number;
  events?: string[];
  eventsEn?: string[];
}

interface InstitutionOption {
  id: string;
  slug: string;
  name: string;
  nameEn?: string | null;
  logo?: string | null;
  orgType?: string | null;
}

interface SpeakerFilterOption {
  organization: string;
  organizationEn?: string | null;
}

interface SpeakerRoleForm {
  id?: string;
  title: string;
  titleEn: string;
  organization: string;
  organizationEn: string;
  startYear: string;
  endYear: string;
  isCurrent: boolean;
  order: number;
}

type AutoUpdateSuggestion = {
  organization?: string | null;
  organizationEn?: string | null;
  title?: string | null;
  titleEn?: string | null;
  bio?: string | null;
  bioEn?: string | null;
  avatarUrl?: string | null;
};


export default function AdminSpeakersPage() {
  const t = useTranslations("adminSpeakersPage");
  const locale = useLocale();
  const salutationOptions = getLocalizedSalutationOptions(locale === "en" ? "en" : "zh");
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [keynoteFilter, setKeynoteFilter] = useState<string>("all");
  const [visibleFilter, setVisibleFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [organizationOptions, setOrganizationOptions] = useState<SpeakerFilterOption[]>([]);
  const currentParamsRef = useRef(new URLSearchParams());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Speaker>>({
    salutation: "",
    name: "",
    nameEn: "",
    title: "",
    titleEn: "",
    organization: "",
    organizationEn: "",
    bio: "",
    bioEn: "",
    summary: "",
    summaryEn: "",
    countryOrRegion: "",
    countryOrRegionEn: "",
    relevanceToShcw: "",
    relevanceToShcwEn: "",
    expertiseTags: [],
    slug: "",
    email: "",
    linkedin: "",
    twitter: "",
    website: "",
    isKeynote: false,
    isVisible: true,
    order: 0,
  });
  // Expertise tags as a comma-separated string for the input field
  const [expertiseTagsInput, setExpertiseTagsInput] = useState("");
  // Career roles form state
  const [formRoles, setFormRoles] = useState<SpeakerRoleForm[]>([]);
  const [isFetchingRoles, setIsFetchingRoles] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoUpdatingId, setIsAutoUpdatingId] = useState<string | null>(null);
  const [autoUpdatePreview, setAutoUpdatePreview] = useState<AutoUpdateSuggestion | null>(null);
  const [autoUpdateTargetSpeaker, setAutoUpdateTargetSpeaker] = useState<Speaker | null>(null);
  const [isAutoUpdateDialogOpen, setIsAutoUpdateDialogOpen] = useState(false);
  const [selectedAutoFields, setSelectedAutoFields] = useState<Set<keyof AutoUpdateSuggestion>>(new Set());
  const [isExportingAvatars, setIsExportingAvatars] = useState(false);

  // Institutions list for picker
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  useEffect(() => {
    fetch("/api/institutions?limit=200&isActive=true")
      .then((r) => r.json())
      .then((d: { data?: InstitutionOption[] }) => {
        if (Array.isArray(d.data)) setInstitutions(d.data);
      })
      .catch(() => {});
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", "speakers");

      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: fd,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setFormData((prev) => ({ ...prev, avatar: data.data.url }));
      toast.success(t("avatarUploadSuccess") || "头像上传成功");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Upload failed";
      setStatusMessage(msg);
      toast.error(msg);
    } finally {
      setIsUploading(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  };

  const loadingLabel = t("loading");
  const genericLoadError = t("loadError");

  const loadSpeakers = useCallback(async (params: URLSearchParams) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/speakers?${params.toString()}`, {
        method: "GET",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || genericLoadError);
      }

      const nextSpeakers = (((data.data as Array<Record<string, unknown>>) ?? []).map((speaker) => ({
        ...speaker,
        isVisible: typeof speaker.isVisible === "boolean" ? speaker.isVisible : true,
        agendaItemsCount:
          typeof (speaker._count as { agendaItems?: number } | undefined)?.agendaItems === "number"
            ? (speaker._count as { agendaItems: number }).agendaItems
            : 0,
      })) as Speaker[]);

      setSpeakers(nextSpeakers);
      setFilteredTotal(Number(data.pagination?.total ?? 0));
      setTotalPages(Math.max(1, Number(data.pagination?.totalPages ?? 1)));
      if (Array.isArray(data.filterOptions?.organizations)) {
        setOrganizationOptions(data.filterOptions.organizations as SpeakerFilterOption[]);
      }
      setStatusMessage("");
    } catch (error) {
      setSpeakers([]);
      setFilteredTotal(0);
      setTotalPages(1);
      setStatusMessage(error instanceof Error ? error.message : genericLoadError);
    } finally {
      setIsLoading(false);
    }
  }, [genericLoadError]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [orgFilter, keynoteFilter, visibleFilter]);

  useEffect(() => {
    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(itemsPerPage),
      includeHidden: "true",
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (orgFilter !== "all") params.set("organization", orgFilter);
    if (keynoteFilter !== "all") params.set("isKeynote", keynoteFilter === "keynote" ? "true" : "false");
    if (visibleFilter !== "all") params.set("isVisible", visibleFilter === "visible" ? "true" : "false");
    if (organizationOptions.length === 0) params.set("includeFilterOptions", "true");
    currentParamsRef.current = params;
    void loadSpeakers(params);
  }, [currentPage, itemsPerPage, debouncedSearch, orgFilter, keynoteFilter, visibleFilter, organizationOptions.length, loadSpeakers]);

  // 当编辑对话框打开时，获取完整嘉宾数据（包含历任职务）
  useEffect(() => {
    if (!isEditDialogOpen || !selectedSpeaker) return;
    setIsFetchingRoles(true);
    setFormRoles([]);
    fetch(`/api/speakers/${selectedSpeaker.id}`)
      .then((res) => res.json())
      .then((data: { success?: boolean; data?: { roles?: unknown[] } }) => {
        if (data.success && Array.isArray(data.data?.roles)) {
          setFormRoles(
            (data.data!.roles as Array<Record<string, unknown>>).map((r) => ({
              id: typeof r.id === "string" ? r.id : undefined,
              title: typeof r.title === "string" ? r.title : "",
              titleEn: typeof r.titleEn === "string" ? r.titleEn : "",
              organization: typeof r.organization === "string" ? r.organization : "",
              organizationEn: typeof r.organizationEn === "string" ? r.organizationEn : "",
              startYear: r.startYear != null ? String(r.startYear) : "",
              endYear: r.endYear != null ? String(r.endYear) : "",
              isCurrent: typeof r.isCurrent === "boolean" ? r.isCurrent : false,
              order: typeof r.order === "number" ? r.order : 0,
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setIsFetchingRoles(false));
  }, [isEditDialogOpen, selectedSpeaker]);

  const organizations = useMemo(
    () => organizationOptions.map((item) => item.organization),
    [organizationOptions]
  );

  const getPrimaryName = (speaker: Speaker) =>
    locale === "en" && speaker.nameEn ? speaker.nameEn : speaker.name;

  const getSecondaryName = (speaker: Speaker) =>
    locale === "en" ? null : speaker.nameEn || null;

  const getSpeakerTitle = (
    speaker: Speaker,
    mode: SpeakerRoleDisplayMode = "allCurrent"
  ) => getSpeakerDisplayTitle(speaker, locale, mode);

  const getSpeakerOrganization = (
    speaker: Speaker,
    mode: SpeakerRoleDisplayMode = "allCurrent"
  ) => getSpeakerDisplayOrganization(speaker, locale, mode);

  const getSpeakerBio = (speaker: Speaker) =>
    locale === "en" ? speaker.bioEn || speaker.bio : speaker.bio;

  const getSpeakerInitial = (speaker: Speaker) =>
    (getPrimaryName(speaker).trim().charAt(0) || "S").toUpperCase();

  const getOrganizationLabel = (organization: string) => {
    const matchingOrg = organizationOptions.find((item) => item.organization === organization);

    return locale === "en"
      ? matchingOrg?.organizationEn || organization
      : organization;
  };

  const autoUpdateFieldConfig: Array<{ key: keyof AutoUpdateSuggestion; target: keyof Speaker | "avatar" }> = [
    { key: "organization", target: "organization" },
    { key: "organizationEn", target: "organizationEn" },
    { key: "title", target: "title" },
    { key: "titleEn", target: "titleEn" },
    { key: "bio", target: "bio" },
    { key: "bioEn", target: "bioEn" },
    { key: "avatarUrl", target: "avatar" },
  ];

  const exportAvatars = async () => {
    setIsExportingAvatars(true);
    try {
      const res = await fetch("/api/admin/export-photos?type=speakers");
      if (!res.ok) {
        const p = await res.json().catch(() => ({})) as { error?: string };
        toast.error(p.error ?? t("exportAvatarsError"));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `speaker-avatars-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export avatars failed:", err);
      toast.error(t("exportAvatarsError"));
    } finally {
      setIsExportingAvatars(false);
    }
  };

  const handleAutoUpdate = async (speaker: Speaker) => {
    setIsAutoUpdatingId(speaker.id);
    try {
      const response = await fetch(`/api/speakers/${speaker.id}/auto-update`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || t("common.autoUpdateError"));
      }

      const suggestion = (data.data || {}) as AutoUpdateSuggestion;
      const preselected = new Set<keyof AutoUpdateSuggestion>();
      autoUpdateFieldConfig.forEach(({ key }) => {
        const value = suggestion[key];
        if (typeof value === "string" && value.trim().length > 0) {
          preselected.add(key);
        }
      });

      setAutoUpdatePreview(suggestion);
      setAutoUpdateTargetSpeaker(speaker);
      setSelectedAutoFields(preselected);
      setIsAutoUpdateDialogOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("common.autoUpdateError");
      setStatusMessage(message);
      toast.error(message);
    } finally {
      setIsAutoUpdatingId(null);
    }
  };

  const applyAutoUpdateSelection = () => {
    if (!autoUpdatePreview || !autoUpdateTargetSpeaker) {
      return;
    }

    const nextFormData: Partial<Speaker> = { ...autoUpdateTargetSpeaker };
    autoUpdateFieldConfig.forEach(({ key, target }) => {
      if (!selectedAutoFields.has(key)) {
        return;
      }

      const value = autoUpdatePreview[key];
      if (typeof value !== "string" || value.trim().length === 0) {
        return;
      }

      if (target === "avatar") {
        nextFormData.avatar = value.trim();
      } else {
        (nextFormData[target] as string | undefined) = value.trim();
      }
    });

    setFormData(nextFormData);
    setExpertiseTagsInput(Array.isArray(nextFormData.expertiseTags) ? nextFormData.expertiseTags.join(", ") : "");
    setSelectedSpeaker(autoUpdateTargetSpeaker);
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(true);
    setIsAutoUpdateDialogOpen(false);
  };

  // Handle create/edit form submission
  const handleSubmit = async () => {
    const url = isEditDialogOpen && selectedSpeaker
      ? `/api/speakers/${selectedSpeaker.id}`
      : "/api/speakers";
    const method = isEditDialogOpen && selectedSpeaker ? "PUT" : "POST";

    try {
      setIsSubmitting(true);
      const parsedTags = expertiseTagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const rolesPayload = formRoles
        .filter((r) => r.title.trim() && r.organization.trim())
        .map((r, idx) => ({
          ...(r.id && { id: r.id }),
          title: r.title.trim(),
          titleEn: r.titleEn.trim() || null,
          organization: r.organization.trim(),
          organizationEn: r.organizationEn.trim() || null,
          startYear: r.startYear ? parseInt(r.startYear, 10) : null,
          endYear: r.endYear && !r.isCurrent ? parseInt(r.endYear, 10) : null,
          isCurrent: r.isCurrent,
          order: idx,
        }));
      const bodyStr = JSON.stringify({ ...formData, expertiseTags: parsedTags, roles: rolesPayload, locale });
      // Pre-flight: avatar is stored as base64 data URL; check it won't exceed Vercel's 4.5MB body limit.
      if (bodyStr.length > 3.5 * 1024 * 1024) {
        throw new Error(
          locale === "en"
            ? "The speaker avatar image is too large. Please delete it and re-upload a smaller image (max 1.5 MB)."
            : "嘉宾头像图片过大，请先删除后重新上传较小的图片（最大 1.5 MB）。"
        );
      }
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: bodyStr,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || genericLoadError);
      }

      setStatusMessage(data.message || "");
      setIsCreateDialogOpen(false);
      setIsEditDialogOpen(false);
      resetForm();
      void loadSpeakers(currentParamsRef.current);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : genericLoadError);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedSpeaker) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/speakers/${selectedSpeaker.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || genericLoadError);
      }

      setStatusMessage(data.message || "");
      setIsDeleteDialogOpen(false);
      void loadSpeakers(currentParamsRef.current);
      setSelectedSpeaker(null);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : genericLoadError);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (speaker: Speaker) => {
    setSelectedSpeaker(speaker);
    setFormData({ ...speaker });
    setExpertiseTagsInput(Array.isArray(speaker.expertiseTags) ? speaker.expertiseTags.join(", ") : "");
    setFormRoles([]);
    setIsEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (speaker: Speaker) => {
    setSelectedSpeaker(speaker);
    setIsDeleteDialogOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      salutation: "",
      name: "",
      nameEn: "",
      title: "",
      titleEn: "",
      organization: "",
      organizationEn: "",
      bio: "",
      bioEn: "",
      summary: "",
      summaryEn: "",
      countryOrRegion: "",
      countryOrRegionEn: "",
      relevanceToShcw: "",
      relevanceToShcwEn: "",
      expertiseTags: [],
      slug: "",
      email: "",
      linkedin: "",
      twitter: "",
      website: "",
      isKeynote: false,
      isVisible: true,
      order: speakers.length + 1,
      institutionId: undefined,
    });
    setExpertiseTagsInput("");
    setFormRoles([]);
    setSelectedSpeaker(null);
  };

  // Open create dialog
  const openCreateDialog = () => {
    resetForm();
    setFormData((prev) => ({ ...prev, order: speakers.length + 1 }));
    setIsCreateDialogOpen(true);
  };

  return (
    <AdminSectionGuard section="speakers">
      <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{t("title")}</h1>
          <p className="text-slate-600">{t("subtitle")}</p>
          {statusMessage && (
            <p className="mt-2 text-sm text-slate-500">{statusMessage}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
            onClick={() => void exportAvatars()}
            disabled={isExportingAvatars}
          >
            {isExportingAvatars
              ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              : <Download className="w-4 h-4 mr-2" />}
            {isExportingAvatars ? t("exportingAvatars") : t("exportAvatars")}
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={openCreateDialog}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("add")}
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Organization Filter */}
              <div className="w-full lg:w-64">
                <Select value={orgFilter} onValueChange={setOrgFilter}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <SelectValue placeholder={t("filters.organizationPlaceholder")} />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.allOrganizations")}</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org} value={org}>
                        {getOrganizationLabel(org)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Keynote Filter */}
              <div className="w-full lg:w-48">
                <Select value={keynoteFilter} onValueChange={setKeynoteFilter}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-slate-400" />
                      <SelectValue placeholder={t("filters.typePlaceholder")} />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.allTypes")}</SelectItem>
                    <SelectItem value="keynote">{t("filters.keynote")}</SelectItem>
                    <SelectItem value="regular">{t("filters.regular")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Visibility Filter */}
              <div className="w-full lg:w-48">
                <Select value={visibleFilter} onValueChange={setVisibleFilter}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-slate-400" />
                      <SelectValue placeholder={t("filters.visibilityPlaceholder")} />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.allVisibility")}</SelectItem>
                    <SelectItem value="visible">{t("filters.visible")}</SelectItem>
                    <SelectItem value="hidden">{t("filters.hidden")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              {(searchQuery || orgFilter !== "all" || keynoteFilter !== "all" || visibleFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSearchQuery("");
                    setOrgFilter("all");
                    setKeynoteFilter("all");
                    setVisibleFilter("all");
                    setCurrentPage(1);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Speakers List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("listTitle", { count: filteredTotal })}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Filter className="w-4 h-4" />
              <span>
                {t("summary", {
                  keynote: speakers.filter((s) => s.isKeynote).length,
                  total: filteredTotal,
                })}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading && speakers.length === 0 && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  {loadingLabel}
                </div>
              )}
              <AnimatePresence mode="popLayout">
                {speakers.map((speaker, index) => (
                  <motion.div
                    key={speaker.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="flex flex-col lg:flex-row lg:items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-4 mb-4 lg:mb-0">
                      <Avatar className="w-14 h-14 border-2 border-emerald-100">
                        <AvatarImage src={speaker.avatar} alt={getPrimaryName(speaker)} />
                        <AvatarFallback className="bg-emerald-50 text-emerald-600 text-lg font-semibold">
                          {getSpeakerInitial(speaker)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-slate-900">
                            {speaker.salutation ? `${speaker.salutation} ` : ""}{getPrimaryName(speaker)}
                          </h3>
                          {getSecondaryName(speaker) && (
                            <span className="text-sm text-slate-500">
                              {getSecondaryName(speaker)}
                            </span>
                          )}
                          {speaker.isKeynote && (
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                              <Star className="w-3 h-3 mr-1 fill-amber-600" />
                              {t("badges.keynote")}
                            </Badge>
                          )}
                          {!speaker.isVisible && (
                            <Badge variant="outline" className="border-slate-300 text-slate-500 hover:bg-transparent">
                              {t("badges.hidden")}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-1">
                          {getSpeakerTitle(speaker)} · {getSpeakerOrganization(speaker)}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          {speaker.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {speaker.email}
                            </span>
                          )}
                          {speaker.linkedin && (
                            <span className="flex items-center gap-1">
                              <Linkedin className="w-3 h-3" />
                              {t("links.linkedin")}
                            </span>
                          )}
                          {speaker.twitter && (
                            <span className="flex items-center gap-1">
                              <Twitter className="w-3 h-3" />
                              {t("links.twitter")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Event Count */}
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <div className="flex items-center px-3 py-1.5 bg-slate-50 rounded-lg">
                          <Mic className="w-4 h-4 mr-2 text-emerald-600" />
                          <span className="font-medium">
                            {speaker.agendaItemsCount ?? speaker.events?.length ?? 0}
                          </span>
                          <span className="ml-1">{t("eventCount")}</span>
                        </div>
                      </div>

                      {/* Order Badge */}
                      <Badge variant="outline" className="text-slate-500">
                        {t("order", { count: speaker.order })}
                      </Badge>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-emerald-700 hover:text-emerald-800"
                          onClick={() => void handleAutoUpdate(speaker)}
                          disabled={isAutoUpdatingId === speaker.id}
                        >
                          {isAutoUpdatingId === speaker.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-1" />
                              {t("common.autoUpdate")}
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(speaker)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => openDeleteDialog(speaker)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {speakers.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mic className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    {t("emptyTitle")}
                  </h3>
                  <p className="text-slate-500">
                    {t("emptyDescription")}
                  </p>
                </div>
              )}

              {filteredTotal > 0 ? (
                <div className="flex items-center justify-between border-t border-slate-100 px-2 pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">{t("perPage")}</span>
                    <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                      <SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    {totalPages > 1 ? <p className="text-sm text-slate-500">{t("pagination", { current: currentPage, total: totalPages })}</p> : null}
                  </div>
                  {totalPages > 1 ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditDialogOpen ? t("dialog.editTitle") : t("dialog.createTitle")}
            </DialogTitle>
            <DialogDescription>
              {isEditDialogOpen
                ? t("dialog.editDescription")
                : t("dialog.createDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Avatar Upload */}
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20 border-2 border-dashed border-slate-300">
                <AvatarImage src={formData.avatar} />
                <AvatarFallback className="bg-slate-50">
                  <Upload className="w-6 h-6 text-slate-400" />
                </AvatarFallback>
              </Avatar>
              <div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => void handleAvatarUpload(e)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  disabled={isUploading}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? "..." : t("form.uploadAvatar")}
                </Button>
                <p className="text-xs text-slate-500 mt-1">
                  {t("form.avatarHelp")}
                </p>
              </div>
            </div>

            {/* Salutation */}
            <div className="space-y-2">
              <Label htmlFor="salutation">{t("form.salutation")}</Label>
              <Select
                value={formData.salutation || "none"}
                onValueChange={(v) =>
                  setFormData({ ...formData, salutation: v === "none" ? "" : v })
                }
              >
                <SelectTrigger id="salutation">
                  <SelectValue placeholder={t("form.salutationPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("form.salutationPlaceholder")}</SelectItem>
                  {salutationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Name Fields */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  {t("form.name")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={t("form.namePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameEn">{t("form.nameEn")}</Label>
                <Input
                  id="nameEn"
                  value={formData.nameEn}
                  onChange={(e) =>
                    setFormData({ ...formData, nameEn: e.target.value })
                  }
                  placeholder={t("form.nameEnPlaceholder")}
                />
              </div>
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug">
                {locale === "en" ? "URL Slug" : "URL 标识符（Slug）"}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="slug"
                  value={formData.slug ?? ""}
                  onChange={(e) => {
                    const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/--+/g, "-");
                    setFormData({ ...formData, slug: v });
                  }}
                  placeholder={locale === "en" ? "e.g. wu-changhua" : "例：wu-changhua"}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    if (!formData.nameEn) return;
                    const generated = formData.nameEn
                      .toLowerCase()
                      .replace(/[^a-z0-9\s-]/g, "")
                      .trim()
                      .replace(/\s+/g, "-")
                      .replace(/-+/g, "-");
                    setFormData({ ...formData, slug: generated });
                  }}
                >
                  {locale === "en" ? "Generate" : "生成"}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                {locale === "en"
                  ? "Lowercase letters, numbers, hyphens only. Used in the profile URL."
                  : "只能包含小写字母、数字、连字符，用于嘉宾主页 URL。"}
              </p>
            </div>

            {/* Title & Organization */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  {t("form.title")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder={t("form.titlePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="titleEn">{t("form.titleEn")}</Label>
                <Input
                  id="titleEn"
                  value={formData.titleEn}
                  onChange={(e) =>
                    setFormData({ ...formData, titleEn: e.target.value })
                  }
                  placeholder={t("form.titleEnPlaceholder")}
                />
              </div>
            </div>

            {/* Institution Link */}
            {institutions.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="institutionId">关联机构（Institution）</Label>
                <Select
                  value={formData.institutionId ?? "__none__"}
                  onValueChange={(v) => {
                    const instId = v === "__none__" ? null : v;
                    const inst = institutions.find((i) => i.id === instId);
                    setFormData((prev) => ({
                      ...prev,
                      institutionId: instId,
                      // Auto-fill org names if currently blank
                      organization: prev.organization || inst?.name || prev.organization || "",
                      organizationEn: prev.organizationEn || inst?.nameEn || prev.organizationEn || "",
                    }));
                  }}
                >
                  <SelectTrigger id="institutionId">
                    <SelectValue placeholder="不关联机构" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— 不关联机构 —</SelectItem>
                    {institutions.map((inst) => (
                      <SelectItem key={inst.id} value={inst.id}>
                        {inst.name}{inst.nameEn ? ` / ${inst.nameEn}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">选择后将自动填充机构名称（如当前为空）</p>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="organization">
                  {t("form.organization")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="organization"
                  value={formData.organization}
                  onChange={(e) =>
                    setFormData({ ...formData, organization: e.target.value })
                  }
                  placeholder={t("form.organizationPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organizationEn">{t("form.organizationEn")}</Label>
                <Input
                  id="organizationEn"
                  value={formData.organizationEn}
                  onChange={(e) =>
                    setFormData({ ...formData, organizationEn: e.target.value })
                  }
                  placeholder={t("form.organizationEnPlaceholder")}
                />
              </div>
            </div>

            {/* Bio */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bio">{t("form.bio")}</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  placeholder={t("form.bioPlaceholder")}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bioEn">{t("form.bioEn")}</Label>
                <Textarea
                  id="bioEn"
                  value={formData.bioEn}
                  onChange={(e) =>
                    setFormData({ ...formData, bioEn: e.target.value })
                  }
                  placeholder={t("form.bioEnPlaceholder")}
                  rows={4}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="summary">
                  {locale === "en" ? "Summary (ZH)" : "摘要（中文）"}
                </Label>
                <Textarea
                  id="summary"
                  value={formData.summary ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, summary: e.target.value })
                  }
                  placeholder={locale === "en" ? "Short summary in Chinese, shown in Hero section" : "Hero 区域展示的简短摘要（中文）"}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="summaryEn">
                  {locale === "en" ? "Summary (EN)" : "摘要（英文）"}
                </Label>
                <Textarea
                  id="summaryEn"
                  value={formData.summaryEn ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, summaryEn: e.target.value })
                  }
                  placeholder={locale === "en" ? "Short summary in English, shown in Hero section" : "Hero 区域展示的简短摘要（英文）"}
                  rows={3}
                />
              </div>
            </div>

            {/* Country / Region */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="countryOrRegion">
                  {locale === "en" ? "Country/Region (ZH)" : "国家/地区（中文）"}
                </Label>
                <Input
                  id="countryOrRegion"
                  value={formData.countryOrRegion ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, countryOrRegion: e.target.value })
                  }
                  placeholder={locale === "en" ? "e.g. 中国" : "例：中国"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="countryOrRegionEn">
                  {locale === "en" ? "Country/Region (EN)" : "国家/地区（英文）"}
                </Label>
                <Input
                  id="countryOrRegionEn"
                  value={formData.countryOrRegionEn ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, countryOrRegionEn: e.target.value })
                  }
                  placeholder="e.g. China"
                />
              </div>
            </div>

            {/* Relevance to SHCW */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="relevanceToShcw">
                  {locale === "en" ? "Relevance to SHCW (ZH)" : "与上海气候周的关联（中文）"}
                </Label>
                <Textarea
                  id="relevanceToShcw"
                  value={formData.relevanceToShcw ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, relevanceToShcw: e.target.value })
                  }
                  placeholder={locale === "en" ? "Why this speaker is relevant to SHCW (Chinese)" : "该嘉宾与上海气候周的关联说明（中文）"}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="relevanceToShcwEn">
                  {locale === "en" ? "Relevance to SHCW (EN)" : "与上海气候周的关联（英文）"}
                </Label>
                <Textarea
                  id="relevanceToShcwEn"
                  value={formData.relevanceToShcwEn ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, relevanceToShcwEn: e.target.value })
                  }
                  placeholder="Why this speaker is relevant to SHCW (English)"
                  rows={3}
                />
              </div>
            </div>

            {/* Expertise Tags */}
            <div className="space-y-2">
              <Label htmlFor="expertiseTags">
                {locale === "en" ? "Expertise Tags" : "专业领域标签"}
              </Label>
              <Input
                id="expertiseTags"
                value={expertiseTagsInput}
                onChange={(e) => setExpertiseTagsInput(e.target.value)}
                placeholder={locale === "en" ? "Comma-separated, e.g. Climate Finance, Green Supply Chain" : "逗号分隔，例：气候金融, 绿色供应链"}
              />
              <p className="text-xs text-slate-500">
                {locale === "en" ? "Enter tags separated by commas." : "用英文逗号分隔各个标签。"}
              </p>
              {expertiseTagsInput.trim() && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {expertiseTagsInput.split(",").map((tag) => tag.trim()).filter(Boolean).map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Career Roles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>
                  {locale === "en" ? "Role Records" : "职务信息"}
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setFormRoles((prev) => [
                      ...prev,
                      { title: "", titleEn: "", organization: "", organizationEn: "", startYear: "", endYear: "", isCurrent: true, order: prev.length },
                    ])
                  }
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {locale === "en" ? "Add Role" : "添加职务"}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                {locale === "en" ? "You can maintain multiple current positions here. Compact cards can show the primary role, while detailed views can show all current roles." : "这里支持维护多个当前职务。紧凑场景可显示主职务，详细场景可显示全部当前职务。"}
              </p>
              {isFetchingRoles ? (
                <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {locale === "en" ? "Loading roles..." : "加载职务中..."}
                </div>
              ) : formRoles.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-4 text-center text-sm text-slate-400">
                  {locale === "en" ? "No role records yet. You can add multiple current positions." : "暂无职务记录，可添加多个当前职务。"}
                </div>
              ) : (
                <div className="space-y-3">
                  {formRoles.map((role, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`role-current-${idx}`}
                            checked={role.isCurrent}
                            onChange={(e) =>
                              setFormRoles((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, isCurrent: e.target.checked, endYear: e.target.checked ? "" : r.endYear } : r
                                )
                              )
                            }
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <Label htmlFor={`role-current-${idx}`} className="text-xs cursor-pointer">
                            {locale === "en" ? "Current Position" : "当前职位"}
                          </Label>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                          onClick={() => setFormRoles((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2">
                        <Input
                          placeholder={locale === "en" ? "Title (ZH)" : "职务（中文）"}
                          value={role.title}
                          onChange={(e) => setFormRoles((prev) => prev.map((r, i) => i === idx ? { ...r, title: e.target.value } : r))}
                        />
                        <Input
                          placeholder="Title (EN)"
                          value={role.titleEn}
                          onChange={(e) => setFormRoles((prev) => prev.map((r, i) => i === idx ? { ...r, titleEn: e.target.value } : r))}
                        />
                        <Input
                          placeholder={locale === "en" ? "Organization (ZH)" : "机构（中文）"}
                          value={role.organization}
                          onChange={(e) => setFormRoles((prev) => prev.map((r, i) => i === idx ? { ...r, organization: e.target.value } : r))}
                        />
                        <Input
                          placeholder="Organization (EN)"
                          value={role.organizationEn}
                          onChange={(e) => setFormRoles((prev) => prev.map((r, i) => i === idx ? { ...r, organizationEn: e.target.value } : r))}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          className="w-28"
                          type="number"
                          min={1980}
                          max={2030}
                          placeholder={locale === "en" ? "From" : "开始年"}
                          value={role.startYear}
                          onChange={(e) => setFormRoles((prev) => prev.map((r, i) => i === idx ? { ...r, startYear: e.target.value } : r))}
                        />
                        <span className="text-slate-400">—</span>
                        <Input
                          className="w-28"
                          type="number"
                          min={1980}
                          max={2030}
                          placeholder={role.isCurrent ? (locale === "en" ? "Present" : "至今") : (locale === "en" ? "To" : "结束年")}
                          value={role.endYear}
                          disabled={role.isCurrent}
                          onChange={(e) => setFormRoles((prev) => prev.map((r, i) => i === idx ? { ...r, endYear: e.target.value } : r))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <Label>{t("form.contact")}</Label>              <div className="grid sm:grid-cols-2 gap-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder={t("form.emailPlaceholder")}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={formData.linkedin}
                    onChange={(e) =>
                      setFormData({ ...formData, linkedin: e.target.value })
                    }
                    placeholder={t("form.linkedinPlaceholder")}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={formData.twitter}
                    onChange={(e) =>
                      setFormData({ ...formData, twitter: e.target.value })
                    }
                    placeholder={t("form.twitterPlaceholder")}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={formData.website}
                    onChange={(e) =>
                      setFormData({ ...formData, website: e.target.value })
                    }
                    placeholder={t("form.websitePlaceholder")}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order">{t("form.order")}</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      order: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder={t("form.orderPlaceholder")}
                />
              </div>
              <div className="flex items-center gap-2 pt-8">
                <input
                  type="checkbox"
                  id="isKeynote"
                  checked={formData.isKeynote}
                  onChange={(e) =>
                    setFormData({ ...formData, isKeynote: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <Label htmlFor="isKeynote" className="cursor-pointer">
                  {t("form.keynote")}
                </Label>
                <Star
                  className={`w-4 h-4 ml-1 ${
                    formData.isKeynote
                      ? "text-amber-500 fill-amber-500"
                      : "text-slate-300"
                  }`}
                />
              </div>
              <div className="flex items-center gap-2 pt-8">
                <input
                  type="checkbox"
                  id="isVisible"
                  checked={formData.isVisible ?? true}
                  onChange={(e) =>
                    setFormData({ ...formData, isVisible: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <Label htmlFor="isVisible" className="cursor-pointer">
                  {t("form.visible")}
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                resetForm();
              }}
            >
              {t("common.cancel")}
            </Button>
            <LoadingButton
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSubmit}
              disabled={!formData.name || !formData.title || !formData.organization}
              loading={isSubmitting}
              loadingText={locale === "en" ? (isEditDialogOpen ? "Saving..." : "Creating...") : (isEditDialogOpen ? "保存中..." : "创建中...")}
            >
              <Check className="w-4 h-4 mr-2" />
              {isEditDialogOpen ? t("common.save") : t("common.create")}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              {t("delete.title")}
            </DialogTitle>
            <DialogDescription>
              {t("delete.description", { name: selectedSpeaker?.name || "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <LoadingButton
              variant="destructive"
              onClick={handleDelete}
              loading={isSubmitting}
              loadingText={locale === "en" ? "Deleting..." : "删除中..."}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t("delete.confirm")}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAutoUpdateDialogOpen}
        onOpenChange={setIsAutoUpdateDialogOpen}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              {t("common.autoUpdatePreview")}
            </DialogTitle>
            <DialogDescription>
              {t("common.autoUpdatePreviewDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {autoUpdateFieldConfig.map(({ key }) => {
              const value = autoUpdatePreview?.[key];
              if (typeof value !== "string" || value.trim().length === 0) {
                return null;
              }

              return (
                <div key={key} className="flex items-start gap-3 rounded-lg border p-3 bg-slate-50">
                  <Checkbox
                    id={`auto-update-${key}`}
                    checked={selectedAutoFields.has(key)}
                    onCheckedChange={(checked) => {
                      setSelectedAutoFields((prev) => {
                        const next = new Set(prev);
                        if (checked === true) {
                          next.add(key);
                        } else {
                          next.delete(key);
                        }
                        return next;
                      });
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={`auto-update-${key}`} className="text-xs text-slate-500">
                      {t(`common.autoUpdateFieldLabel.${key}`)}
                    </Label>
                    <p className="mt-1 text-sm text-slate-900 whitespace-pre-wrap break-words">
                      {value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAutoUpdateDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={applyAutoUpdateSelection}
              disabled={selectedAutoFields.size === 0}
            >
              <Check className="w-4 h-4 mr-2" />
              {t("common.autoUpdateApply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </AdminSectionGuard>
  );
}
