"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Globe,
  ExternalLink,
  AlertTriangle,
  X,
  Upload,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdminSectionGuard } from "@/components/admin/admin-section-guard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// 赞助级别类型
type SponsorTier = "platinum" | "gold" | "silver" | "bronze" | "partner";

// 赞助商数据接口
interface Sponsor {
  id: string;
  name: string;
  nameEn?: string;
  logo: string;
  website?: string;
  description?: string;
  descriptionEn?: string;
  tier: SponsorTier;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 赞助级别样式配置
const tierConfig: Record<
  SponsorTier,
  { color: string; bgColor: string }
> = {
  platinum: {
    color: "text-purple-700",
    bgColor: "bg-purple-100",
  },
  gold: {
    color: "text-amber-700",
    bgColor: "bg-amber-100",
  },
  silver: {
    color: "text-slate-700",
    bgColor: "bg-slate-100",
  },
  bronze: {
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
  partner: {
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
  },
};

// 模拟数据
const mockSponsors: Sponsor[] = [
  {
    id: "1",
    name: "绿色能源科技有限公司",
    nameEn: "Green Energy Technology Co., Ltd.",
    logo: "/images/sponsors/logo1.png",
    website: "https://example.com/green-energy",
    description: "专注于可再生能源解决方案的领先企业",
    descriptionEn: "A leading company focused on renewable energy solutions.",
    tier: "platinum",
    order: 1,
    isActive: true,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-03-10"),
  },
  {
    id: "2",
    name: "未来投资控股集团",
    nameEn: "Future Investment Holdings Group",
    logo: "/images/sponsors/logo2.png",
    website: "https://example.com/future-invest",
    description: "致力于可持续发展和绿色金融投资",
    descriptionEn: "Focused on sustainable development and green finance investment.",
    tier: "gold",
    order: 2,
    isActive: true,
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-03-15"),
  },
  {
    id: "3",
    name: "智慧城市建设集团",
    nameEn: "Smart City Construction Group",
    logo: "/images/sponsors/logo3.png",
    website: "https://example.com/smart-city",
    description: "打造低碳智慧城市的创新企业",
    descriptionEn: "An innovative company building low-carbon smart cities.",
    tier: "gold",
    order: 3,
    isActive: true,
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-03-12"),
  },
  {
    id: "4",
    name: "环保科技研究院",
    nameEn: "Environmental Technology Research Institute",
    logo: "/images/sponsors/logo4.png",
    website: "https://example.com/env-research",
    description: "环境保护技术研发与推广",
    descriptionEn: "Research and promotion of environmental protection technologies.",
    tier: "silver",
    order: 4,
    isActive: true,
    createdAt: new Date("2024-02-10"),
    updatedAt: new Date("2024-03-08"),
  },
  {
    id: "5",
    name: "碳中和咨询服务中心",
    nameEn: "Carbon Neutrality Consulting Center",
    logo: "/images/sponsors/logo5.png",
    tier: "silver",
    order: 5,
    isActive: false,
    createdAt: new Date("2024-02-15"),
    updatedAt: new Date("2024-03-05"),
  },
  {
    id: "6",
    name: "新能源汽车有限公司",
    nameEn: "New Energy Vehicles Co., Ltd.",
    logo: "/images/sponsors/logo6.png",
    website: "https://example.com/new-energy-car",
    description: "电动汽车及充电基础设施",
    descriptionEn: "Electric vehicles and charging infrastructure.",
    tier: "bronze",
    order: 6,
    isActive: true,
    createdAt: new Date("2024-02-20"),
    updatedAt: new Date("2024-03-01"),
  },
  {
    id: "7",
    name: "生态农业发展有限公司",
    nameEn: "Ecological Agriculture Development Co., Ltd.",
    logo: "/images/sponsors/logo7.png",
    tier: "partner",
    order: 7,
    isActive: true,
    createdAt: new Date("2024-03-01"),
    updatedAt: new Date("2024-03-18"),
  },
  {
    id: "8",
    name: "循环经济产业联盟",
    nameEn: "Circular Economy Industry Alliance",
    logo: "/images/sponsors/logo8.png",
    website: "https://example.com/circular-economy",
    description: "推动循环经济发展的产业联盟",
    descriptionEn: "An industry alliance advancing the circular economy.",
    tier: "partner",
    order: 8,
    isActive: true,
    createdAt: new Date("2024-03-05"),
    updatedAt: new Date("2024-03-20"),
  },
];

// 表单数据接口
interface SponsorFormData {
  name: string;
  nameEn: string;
  logo: string;
  website: string;
  description: string;
  descriptionEn: string;
  tier: SponsorTier;
  order: number;
  isActive: boolean;
}

const initialFormData: SponsorFormData = {
  name: "",
  nameEn: "",
  logo: "",
  website: "",
  description: "",
  descriptionEn: "",
  tier: "partner",
  order: 0,
  isActive: true,
};

function isLocalImagePath(src: string) {
  return src.startsWith("/");
}

export default function AdminPartnersPage() {
  const t = useTranslations("adminPartnersPage");
  const locale = useLocale();

  // 状态管理
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<SponsorTier | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all"
  );

  // 对话框状态
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [deletingSponsor, setDeletingSponsor] = useState<Sponsor | null>(null);
  const [formData, setFormData] = useState<SponsorFormData>(initialFormData);

  const loadingLabel = locale === "en" ? "Loading partners..." : "正在加载合作伙伴...";
  const genericLoadError = locale === "en" ? "Failed to load partners." : "加载合作伙伴失败。";

  const loadSponsors = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/sponsors", {
        method: "GET",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || genericLoadError);
      }

      setSponsors(data.data as Sponsor[]);
      setStatusMessage("");
    } catch (error) {
      setSponsors(mockSponsors);
      setStatusMessage(error instanceof Error ? error.message : genericLoadError);
    } finally {
      setIsLoading(false);
    }
  }, [genericLoadError]);

  useEffect(() => {
    void loadSponsors();
  }, [loadSponsors]);

  // 筛选后的赞助商列表
  const filteredSponsors = useMemo(() => {
    return sponsors
      .filter((sponsor) => {
        // 名称搜索
        const normalizedQuery = searchQuery.toLowerCase();
        const matchesSearch =
          sponsor.name.toLowerCase().includes(normalizedQuery) ||
          sponsor.nameEn?.toLowerCase().includes(normalizedQuery);

        // 级别筛选
        const matchesTier =
          tierFilter === "all" || sponsor.tier === tierFilter;

        // 状态筛选
        const matchesStatus =
          statusFilter === "all"
            ? true
            : statusFilter === "active"
            ? sponsor.isActive
            : !sponsor.isActive;

        return matchesSearch && matchesTier && matchesStatus;
      })
      .sort((a, b) => a.order - b.order);
  }, [sponsors, searchQuery, tierFilter, statusFilter]);

  const getTierLabel = (tier: SponsorTier) => t(`tiers.${tier}`);

  const getStatusLabel = (isActive: boolean) =>
    isActive ? t("status.active") : t("status.inactive");

  const getSponsorName = (sponsor: Sponsor) =>
    locale === "en" ? sponsor.nameEn || sponsor.name : sponsor.name;

  const getSponsorDescription = (sponsor: Sponsor) =>
    locale === "en"
      ? sponsor.descriptionEn || sponsor.description
      : sponsor.description;

  // 打开创建对话框
  const handleCreate = () => {
    setEditingSponsor(null);
    setFormData({
      ...initialFormData,
      order: sponsors.length + 1,
    });
    setIsEditDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (sponsor: Sponsor) => {
    setEditingSponsor(sponsor);
    setFormData({
      name: sponsor.name,
      nameEn: sponsor.nameEn || "",
      logo: sponsor.logo,
      website: sponsor.website || "",
      description: sponsor.description || "",
      descriptionEn: sponsor.descriptionEn || "",
      tier: sponsor.tier,
      order: sponsor.order,
      isActive: sponsor.isActive,
    });
    setIsEditDialogOpen(true);
  };

  // 打开删除对话框
  const handleDeleteClick = (sponsor: Sponsor) => {
    setDeletingSponsor(sponsor);
    setIsDeleteDialogOpen(true);
  };

  // 确认删除
  const confirmDelete = async () => {
    if (!deletingSponsor) {
      return;
    }

    try {
      const response = await fetch(`/api/sponsors/${deletingSponsor.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || genericLoadError);
      }

      setStatusMessage(data.message || "");
      setIsDeleteDialogOpen(false);
      setDeletingSponsor(null);
      await loadSponsors();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : genericLoadError);
    }
  };

  // 保存赞助商
  const handleSave = async () => {
    const url = editingSponsor ? `/api/sponsors/${editingSponsor.id}` : "/api/sponsors";
    const method = editingSponsor ? "PUT" : "POST";

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
      setIsEditDialogOpen(false);
      await loadSponsors();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : genericLoadError);
    }
  };

  // 切换赞助商状态
  const toggleSponsorStatus = async (sponsor: Sponsor) => {
    try {
      const response = await fetch(`/api/sponsors/${sponsor.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !sponsor.isActive,
          locale,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || genericLoadError);
      }

      setStatusMessage(data.message || "");
      await loadSponsors();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : genericLoadError);
    }
  };

  // 处理Logo上传
  const handleLogoUpload = () => {
    // 模拟上传功能
    const mockLogos = [
      "/images/sponsors/logo1.png",
      "/images/sponsors/logo2.png",
      "/images/sponsors/logo3.png",
      "/images/sponsors/logo4.png",
    ];
    const randomLogo =
      mockLogos[Math.floor(Math.random() * mockLogos.length)];
    setFormData((prev) => ({ ...prev, logo: randomLogo }));
  };

  return (
    <AdminSectionGuard section="partners">
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
          onClick={handleCreate}
          className="bg-emerald-600 hover:bg-emerald-700"
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

              {/* Tier Filter */}
              <Select
                value={tierFilter}
                onValueChange={(value) =>
                  setTierFilter(value as SponsorTier | "all")
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("filters.tierPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filters.allTiers")}</SelectItem>
                  <SelectItem value="platinum">{t("tiers.platinum")}</SelectItem>
                  <SelectItem value="gold">{t("tiers.gold")}</SelectItem>
                  <SelectItem value="silver">{t("tiers.silver")}</SelectItem>
                  <SelectItem value="bronze">{t("tiers.bronze")}</SelectItem>
                  <SelectItem value="partner">{t("tiers.partner")}</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as "all" | "active" | "inactive")
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("filters.statusPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filters.allStatuses")}</SelectItem>
                  <SelectItem value="active">{t("status.active")}</SelectItem>
                  <SelectItem value="inactive">{t("status.inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Partners List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>{t("listTitle", { count: filteredSponsors.length })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {isLoading && filteredSponsors.length === 0 && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-6 text-sm text-slate-500 mb-4">
                  {loadingLabel}
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <GripVertical className="w-4 h-4 text-slate-400" />
                    </TableHead>
                    <TableHead>{t("table.logo")}</TableHead>
                    <TableHead>{t("table.company")}</TableHead>
                    <TableHead>{t("table.tier")}</TableHead>
                    <TableHead>{t("table.order")}</TableHead>
                    <TableHead>{t("table.website")}</TableHead>
                    <TableHead>{t("table.status")}</TableHead>
                    <TableHead className="text-right">{t("table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredSponsors.map((sponsor, index) => (
                      <motion.tr
                        key={sponsor.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className="border-b transition-colors hover:bg-slate-50/50"
                      >
                        <TableCell>
                          <span className="text-slate-400 text-sm">
                            {sponsor.order}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden relative">
                            {sponsor.logo ? (
                              isLocalImagePath(sponsor.logo) ? (
                                <Image
                                  src={sponsor.logo}
                                  alt={getSponsorName(sponsor)}
                                  fill
                                  sizes="48px"
                                  className="object-contain p-1"
                                />
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={sponsor.logo}
                                  alt={getSponsorName(sponsor)}
                                  className="w-full h-full object-contain p-1"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display =
                                      "none";
                                  }}
                                />
                              )
                            ) : (
                              <Building2 className="w-6 h-6 text-slate-400" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-slate-900">
                              {getSponsorName(sponsor)}
                            </div>
                            {getSponsorDescription(sponsor) && (
                              <div className="text-sm text-slate-500 truncate max-w-[200px]">
                                {getSponsorDescription(sponsor)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${tierConfig[sponsor.tier].bgColor} ${
                              tierConfig[sponsor.tier].color
                            } border-0`}
                          >
                            {getTierLabel(sponsor.tier)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-600">
                            {sponsor.order}
                          </span>
                        </TableCell>
                        <TableCell>
                          {sponsor.website ? (
                            <a
                              href={sponsor.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700"
                            >
                              <Globe className="w-4 h-4 mr-1" />
                              {t("visit")}
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={sponsor.isActive}
                              onCheckedChange={() =>
                                toggleSponsorStatus(sponsor)
                              }
                              className="data-[state=checked]:bg-emerald-600"
                            />
                            <span
                              className={`text-sm ${
                                sponsor.isActive
                                  ? "text-emerald-600"
                                  : "text-slate-400"
                              }`}
                            >
                              {getStatusLabel(sponsor.isActive)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(sponsor)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteClick(sponsor)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>

            {filteredSponsors.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-1">
                  {t("emptyTitle")}
                </h3>
                <p className="text-slate-500">
                  {t("emptyDescription")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit/Create Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSponsor ? t("dialog.editTitle") : t("dialog.createTitle")}
            </DialogTitle>
            <DialogDescription>
              {editingSponsor
                ? t("dialog.editDescription")
                : t("dialog.createDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>{t("form.logo")}</Label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-200 relative">
                  {formData.logo ? (
                    isLocalImagePath(formData.logo) ? (
                      <Image
                        src={formData.logo}
                        alt={t("form.logo")}
                        fill
                        sizes="96px"
                        className="object-contain p-2"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={formData.logo}
                        alt={t("form.logo")}
                        className="w-full h-full object-contain p-2"
                      />
                    )
                  ) : (
                    <Building2 className="w-10 h-10 text-slate-400" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleLogoUpload}
                    className="w-fit"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {t("form.uploadLogo")}
                  </Button>
                  <p className="text-xs text-slate-500">
                    {t("form.logoHelp")}
                  </p>
                </div>
              </div>
            </div>

            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                {t("form.companyName")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder={t("form.companyNamePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nameEn">{t("form.companyNameEn")}</Label>
              <Input
                id="nameEn"
                value={formData.nameEn}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nameEn: e.target.value }))
                }
                placeholder={t("form.companyNameEnPlaceholder")}
              />
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website">{t("form.website")}</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, website: e.target.value }))
                }
                placeholder={t("form.websitePlaceholder")}
              />
            </div>

            {/* Description */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="description">{t("form.description")}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder={t("form.descriptionPlaceholder")}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descriptionEn">{t("form.descriptionEn")}</Label>
                <Textarea
                  id="descriptionEn"
                  value={formData.descriptionEn}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      descriptionEn: e.target.value,
                    }))
                  }
                  placeholder={t("form.descriptionEnPlaceholder")}
                  rows={3}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Tier */}
              <div className="space-y-2">
                <Label>{t("form.tier")}</Label>
                <Select
                  value={formData.tier}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      tier: value as SponsorTier,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platinum">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        {t("tiers.platinum")}
                      </span>
                    </SelectItem>
                    <SelectItem value="gold">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        {t("tiers.gold")}
                      </span>
                    </SelectItem>
                    <SelectItem value="silver">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        {t("tiers.silver")}
                      </span>
                    </SelectItem>
                    <SelectItem value="bronze">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        {t("tiers.bronze")}
                      </span>
                    </SelectItem>
                    <SelectItem value="partner">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {t("tiers.partner")}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Order */}
              <div className="space-y-2">
                <Label htmlFor="order">{t("form.order")}</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.order}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      order: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder={t("form.orderPlaceholder")}
                />
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <Label htmlFor="status" className="font-medium">
                  {t("form.status")}
                </Label>
                <p className="text-sm text-slate-500">
                  {t("form.statusHelp")}
                </p>
              </div>
              <Switch
                id="status"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isActive: checked }))
                }
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {editingSponsor ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              {t("delete.title")}
            </DialogTitle>
            <DialogDescription>
              {t("delete.description", {
                name: deletingSponsor ? getSponsorName(deletingSponsor) : "",
              })}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("delete.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </AdminSectionGuard>
  );
}
