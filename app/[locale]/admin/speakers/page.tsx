"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Plus,
  Search,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { AdminSectionGuard } from "@/components/admin/admin-section-guard";

// Speaker interface based on schema
interface Speaker {
  id: string;
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
  email?: string;
  linkedin?: string;
  twitter?: string;
  website?: string;
  isKeynote: boolean;
  order: number;
  agendaItemsCount?: number;
  events?: string[];
  eventsEn?: string[];
}

// Mock speakers data
const mockSpeakers: Speaker[] = [
  {
    id: "1",
    name: "吴昌华",
    nameEn: "Wu Changhua",
    title: "院长",
    titleEn: "Dean",
    organization: "全球气候学院",
    organizationEn: "Global Climate Institute",
    bio: "全球气候学院院长，曾任气候组织大中华区总裁。环境与发展政策分析专家，近二十年专注中国可持续发展事务。",
    bioEn: "Dean of the Global Climate Institute and former China CEO of The Climate Group. An expert in environment and development policy with nearly two decades of focus on China's sustainable development.",
    email: "wuchanghua@example.com",
    linkedin: "https://linkedin.com/in/wuchanghua",
    isKeynote: true,
    order: 1,
    events: ["盛大开幕仪式"],
    eventsEn: ["Grand Opening Ceremony"],
  },
  {
    id: "2",
    name: "Shahbaz Khan",
    title: "主任兼代表",
    titleEn: "Director and Representative",
    organization: "UNESCO东亚地区办事处",
    organizationEn: "UNESCO Regional Office for East Asia",
    bio: "联合国教科文组织东亚地区办事处主任兼代表。亚太水论坛治理委员会成员，水资源和可持续发展领域国际专家。",
    bioEn: "Director and Representative of UNESCO's Regional Office for East Asia. A member of the Asia-Pacific Water Forum governance committee and an international expert in water resources and sustainable development.",
    email: "s.khan@unesco.org",
    isKeynote: true,
    order: 2,
    events: ["水安全论坛"],
    eventsEn: ["Water Security Forum"],
  },
  {
    id: "3",
    name: "张庆丰",
    nameEn: "Zhang Qingfeng",
    title: "局长",
    titleEn: "Director General",
    organization: "亚洲开发银行",
    organizationEn: "Asian Development Bank",
    bio: "亚开行农业、粮食、自然和农村发展分局局长，负责管理亚开行260亿美元食品系统转型投资框架。",
    bioEn: "Director General of the Agriculture, Food, Nature, and Rural Development Sector Office at ADB, overseeing a USD 26 billion food systems transformation investment framework.",
    linkedin: "https://linkedin.com/in/zhangqingfeng",
    isKeynote: true,
    order: 3,
    events: ["未来食物系统", "水安全论坛"],
    eventsEn: ["Future Food System", "Water Security Forum"],
  },
  {
    id: "4",
    name: "Nick Mabey",
    title: "创始人兼CEO",
    titleEn: "Founder and CEO",
    organization: "E3G / 伦敦气候行动周",
    organizationEn: "E3G / London Climate Action Week",
    bio: "E3G创始董事兼CEO，伦敦气候行动周创始人。曾任英国首相气候变化顾问，全球气候行动知名领导者。",
    bioEn: "Founding Director and CEO of E3G and founder of London Climate Action Week. Former climate adviser to the UK Prime Minister and a recognized global climate action leader.",
    twitter: "@nickmabey",
    isKeynote: true,
    order: 4,
    events: ["城市合作平台", "可持续金融"],
    eventsEn: ["City Cooperation Platform", "Sustainable Finance"],
  },
  {
    id: "5",
    name: "Bernice Lee",
    title: "研究总监",
    titleEn: "Research Director",
    organization: "查塔姆研究所",
    organizationEn: "Chatham House",
    bio: "查塔姆研究所研究总监，霍夫曼可持续发展与资源经济项目创始负责人。Chapter Zero Alliance核心成员。",
    bioEn: "Research Director at Chatham House and founding head of the Hoffmann Centre for Sustainable Resource Economy. A core member of the Chapter Zero Alliance.",
    isKeynote: false,
    order: 5,
    events: ["董事会治理转型"],
    eventsEn: ["Board Governance Transformation"],
  },
  {
    id: "6",
    name: "马军",
    nameEn: "Ma Jun",
    title: "创始人兼主任",
    titleEn: "Founder and Director",
    organization: "公众环境研究中心",
    organizationEn: "Institute of Public & Environmental Affairs",
    bio: "公众环境研究中心创始人。2006年被《时代周刊》评为全球最具影响力100人之一，中国环境信息公开先驱者。",
    bioEn: "Founder of the Institute of Public & Environmental Affairs. Named by Time in 2006 as one of the world's 100 most influential people and a pioneer of environmental transparency in China.",
    email: "majun@ipe.org.cn",
    website: "https://www.ipe.org.cn",
    isKeynote: true,
    order: 6,
    events: ["绿色供应链", "百品领航"],
    eventsEn: ["Green Supply Chain", "Flagship 100"],
  },
  {
    id: "7",
    name: "周敏",
    nameEn: "Zhou Min",
    title: "创始人兼CEO",
    titleEn: "Founder and CEO",
    organization: "遨问创投",
    organizationEn: "Aowen Ventures",
    bio: "遨问创投创始合伙人兼CEO，硬科技投资专家，福布斯中国最具影响力华人精英TOP100，专注气候科技投资。",
    bioEn: "Founding partner and CEO of Aowen Ventures, a deep-tech investor and Forbes China Top 100 Chinese elites honoree focused on climate technology investment.",
    linkedin: "https://linkedin.com/in/zhoumin",
    isKeynote: false,
    order: 7,
    events: ["气候投资风向标"],
    eventsEn: ["Climate Investment Outlook"],
  },
  {
    id: "8",
    name: "邹荣",
    nameEn: "Zou Rong",
    title: "联席主任",
    titleEn: "Co-Director",
    organization: "上海气候周执委会",
    organizationEn: "Shanghai Climate Week Executive Committee",
    bio: "上海气候周执委会联席主任，秉持中国行动、亚洲声音、世界标准理念，推动气候跨界合作网络。",
    bioEn: "Co-Director of the Shanghai Climate Week Executive Committee, advancing cross-sector climate collaboration through the vision of China action, Asian voices, and global standards.",
    isKeynote: true,
    order: 8,
    events: ["盛大开幕仪式"],
    eventsEn: ["Grand Opening Ceremony"],
  },
];

// Get unique organizations for filter
const getOrganizations = (speakers: Speaker[]) => {
  const orgs = Array.from(new Set(speakers.map((s) => s.organization)));
  return orgs.sort();
};

export default function AdminSpeakersPage() {
  const t = useTranslations("adminSpeakersPage");
  const locale = useLocale();
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [keynoteFilter, setKeynoteFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Speaker>>({
    name: "",
    nameEn: "",
    title: "",
    titleEn: "",
    organization: "",
    organizationEn: "",
    bio: "",
    bioEn: "",
    email: "",
    linkedin: "",
    twitter: "",
    website: "",
    isKeynote: false,
    order: 0,
  });

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

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
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  };

  const loadingLabel = t("loading");
  const genericLoadError = t("loadError");

  const loadSpeakers = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/speakers?limit=100", {
        method: "GET",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || genericLoadError);
      }

      const nextSpeakers = (data.data as Array<Record<string, unknown>>).map((speaker) => ({
        ...speaker,
        agendaItemsCount:
          typeof (speaker._count as { agendaItems?: number } | undefined)?.agendaItems === "number"
            ? (speaker._count as { agendaItems: number }).agendaItems
            : 0,
      })) as Speaker[];

      setSpeakers(nextSpeakers);
      setStatusMessage("");
    } catch (error) {
      setSpeakers(mockSpeakers);
      setStatusMessage(error instanceof Error ? error.message : genericLoadError);
    } finally {
      setIsLoading(false);
    }
  }, [genericLoadError]);

  useEffect(() => {
    void loadSpeakers();
  }, [loadSpeakers]);

  // Filter speakers
  const filteredSpeakers = useMemo(() => {
    return speakers.filter((speaker) => {
      const matchesSearch =
        speaker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        speaker.nameEn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        speaker.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        speaker.organizationEn?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesOrg =
        orgFilter === "all" || speaker.organization === orgFilter;

      const matchesKeynote =
        keynoteFilter === "all" ||
        (keynoteFilter === "keynote" && speaker.isKeynote) ||
        (keynoteFilter === "regular" && !speaker.isKeynote);

      return matchesSearch && matchesOrg && matchesKeynote;
    });
  }, [speakers, searchQuery, orgFilter, keynoteFilter]);

  // Sort speakers by order
  const sortedSpeakers = useMemo(() => {
    return [...filteredSpeakers].sort((a, b) => a.order - b.order);
  }, [filteredSpeakers]);

  const organizations = getOrganizations(speakers);

  const getPrimaryName = (speaker: Speaker) =>
    locale === "en" && speaker.nameEn ? speaker.nameEn : speaker.name;

  const getSecondaryName = (speaker: Speaker) =>
    locale === "en" ? null : speaker.nameEn || null;

  const getSpeakerTitle = (speaker: Speaker) =>
    locale === "en" ? speaker.titleEn || speaker.title : speaker.title;

  const getSpeakerOrganization = (speaker: Speaker) =>
    locale === "en"
      ? speaker.organizationEn || speaker.organization
      : speaker.organization;

  const getSpeakerBio = (speaker: Speaker) =>
    locale === "en" ? speaker.bioEn || speaker.bio : speaker.bio;

  const getSpeakerInitial = (speaker: Speaker) =>
    (getPrimaryName(speaker).trim().charAt(0) || "S").toUpperCase();

  const getOrganizationLabel = (organization: string) => {
    const matchingSpeaker = speakers.find(
      (speaker) => speaker.organization === organization
    );

    return locale === "en"
      ? matchingSpeaker?.organizationEn || organization
      : organization;
  };

  // Handle create/edit form submission
  const handleSubmit = async () => {
    const url = isEditDialogOpen && selectedSpeaker
      ? `/api/speakers/${selectedSpeaker.id}`
      : "/api/speakers";
    const method = isEditDialogOpen && selectedSpeaker ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          locale,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || genericLoadError);
      }

      setStatusMessage(data.message || "");
      setIsCreateDialogOpen(false);
      setIsEditDialogOpen(false);
      resetForm();
      await loadSpeakers();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : genericLoadError);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedSpeaker) {
      return;
    }

    try {
      const response = await fetch(`/api/speakers/${selectedSpeaker.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || genericLoadError);
      }

      setStatusMessage(data.message || "");
      setIsDeleteDialogOpen(false);
      setSelectedSpeaker(null);
      await loadSpeakers();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : genericLoadError);
    }
  };

  // Open edit dialog
  const openEditDialog = (speaker: Speaker) => {
    setSelectedSpeaker(speaker);
    setFormData({ ...speaker });
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
      name: "",
      nameEn: "",
      title: "",
      titleEn: "",
      organization: "",
      organizationEn: "",
      bio: "",
      bioEn: "",
      email: "",
      linkedin: "",
      twitter: "",
      website: "",
      isKeynote: false,
      order: speakers.length + 1,
    });
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
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={openCreateDialog}
        >
          <Plus className="w-4 h-4 mr-2" />
          {t("add")}
        </Button>
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

              {/* Clear Filters */}
              {(searchQuery || orgFilter !== "all" || keynoteFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSearchQuery("");
                    setOrgFilter("all");
                    setKeynoteFilter("all");
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
            <CardTitle>{t("listTitle", { count: sortedSpeakers.length })}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Filter className="w-4 h-4" />
              <span>
                {t("summary", {
                  keynote: speakers.filter((s) => s.isKeynote).length,
                  total: speakers.length,
                })}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading && sortedSpeakers.length === 0 && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  {loadingLabel}
                </div>
              )}
              <AnimatePresence mode="popLayout">
                {sortedSpeakers.map((speaker, index) => (
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
                            {getPrimaryName(speaker)}
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

              {sortedSpeakers.length === 0 && (
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

            {/* Contact Info */}
            <div className="space-y-4">
              <Label>{t("form.contact")}</Label>
              <div className="grid sm:grid-cols-2 gap-4">
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
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSubmit}
              disabled={!formData.name || !formData.title || !formData.organization}
            >
              <Check className="w-4 h-4 mr-2" />
              {isEditDialogOpen ? t("common.save") : t("common.create")}
            </Button>
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
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t("delete.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </AdminSectionGuard>
  );
}
