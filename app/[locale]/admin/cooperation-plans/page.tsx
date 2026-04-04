"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  GripVertical,
  DatabaseZap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// 合作方案数据接口
interface CooperationPlan {
  id: string;
  tierType: string;
  name: string;
  nameEn: string;
  description?: string;
  descriptionEn?: string;
  price?: string;
  features: string[];
  featuresEn: string[];
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 表单数据接口
interface CooperationPlanFormData {
  tierType: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  price: string;
  features: string[];
  featuresEn: string[];
  order: number;
  isActive: boolean;
}

const initialFormData: CooperationPlanFormData = {
  tierType: "",
  name: "",
  nameEn: "",
  description: "",
  descriptionEn: "",
  price: "",
  features: [],
  featuresEn: [],
  order: 0,
  isActive: true,
};

const tierTypeOptions = [
  { value: "platinum", label: "Platinum" },
  { value: "gold", label: "Gold" },
  { value: "silver", label: "Silver" },
  { value: "bronze", label: "Bronze" },
  { value: "partner", label: "Partner" },
];

const tierColors: Record<string, string> = {
  platinum: "bg-purple-100 text-purple-700",
  gold: "bg-amber-100 text-amber-700",
  silver: "bg-slate-100 text-slate-700",
  bronze: "bg-orange-100 text-orange-700",
  partner: "bg-emerald-100 text-emerald-700",
};

export default function AdminCooperationPlansPage() {
  const locale = useLocale();

  // 状态管理
  const [tiers, setTiers] = useState<CooperationPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");

  // 对话框状态
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<CooperationPlan | null>(null);
  const [deletingTier, setDeletingTier] = useState<CooperationPlan | null>(null);
  const [isImportingDefaults, setIsImportingDefaults] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<CooperationPlanFormData>(initialFormData);
  const [featureInput, setFeatureInput] = useState("");
  const [featureInputEn, setFeatureInputEn] = useState("");

  const loadingLabel = locale === "en" ? "Loading cooperation plans..." : "正在加载合作方案...";
  const genericLoadError = locale === "en" ? "Failed to load cooperation plans." : "加载合作方案失败。";

  const loadTiers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/cooperation-plans");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || genericLoadError);
      }

      setTiers(data.data as CooperationPlan[]);
      setStatusMessage("");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : genericLoadError);
      toast.error(error instanceof Error ? error.message : genericLoadError);
    } finally {
      setIsLoading(false);
    }
  }, [genericLoadError]);

  useEffect(() => {
    void loadTiers();
  }, [loadTiers]);

  // 打开创建对话框
  const handleCreate = () => {
    setEditingTier(null);
    setFormData({
      ...initialFormData,
      order: tiers.length + 1,
    });
    setFeatureInput("");
    setFeatureInputEn("");
    setIsEditDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (tier: CooperationPlan) => {
    setEditingTier(tier);
    setFormData({
      tierType: tier.tierType,
      name: tier.name,
      nameEn: tier.nameEn,
      description: tier.description || "",
      descriptionEn: tier.descriptionEn || "",
      price: tier.price || "",
      features: tier.features || [],
      featuresEn: tier.featuresEn || [],
      order: tier.order,
      isActive: tier.isActive,
    });
    setFeatureInput("");
    setFeatureInputEn("");
    setIsEditDialogOpen(true);
  };

  // 打开删除对话框
  const upsertTierInState = (tier: CooperationPlan) => {
    setTiers((previous) => {
      const idx = previous.findIndex((t) => t.id === tier.id);
      if (idx >= 0) {
        const next = [...previous];
        next[idx] = tier;
        return next;
      }
      return [...previous, tier];
    });
  };

  const handleDeleteClick = (tier: CooperationPlan) => {
    setDeletingTier(tier);
    setIsDeleteDialogOpen(true);
  };

  const importDefaultTiers = async () => {
    setIsImportingDefaults(true);
    try {
      const response = await fetch("/api/cooperation-plans/import-defaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || genericLoadError);
      }

      toast.success(
        data.message ||
          (locale === "en" ? "Default cooperation plans imported" : "默认合作方案已导入")
      );
      await loadTiers();
    } catch (error) {
      const msg = error instanceof Error ? error.message : genericLoadError;
      setStatusMessage(msg);
      toast.error(msg);
    } finally {
      setIsImportingDefaults(false);
    }
  };

  // 确认删除
  const confirmDelete = async () => {
    if (!deletingTier) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/cooperation-plans/${deletingTier.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || genericLoadError);
      }

      toast.success(data.message || (locale === "en" ? "Cooperation plan deleted successfully" : "合作方案已删除"));
      setIsDeleteDialogOpen(false);
      setDeletingTier(null);
      setTiers((previous) => previous.filter((t) => t.id !== deletingTier.id));
    } catch (error) {
      const msg = error instanceof Error ? error.message : genericLoadError;
      setStatusMessage(msg);
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // 添加特性
  const addFeature = () => {
    if (featureInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        features: [...prev.features, featureInput.trim()],
      }));
      setFeatureInput("");
    }
  };

  const addFeatureEn = () => {
    if (featureInputEn.trim()) {
      setFormData((prev) => ({
        ...prev,
        featuresEn: [...prev.featuresEn, featureInputEn.trim()],
      }));
      setFeatureInputEn("");
    }
  };

  // 移除特性
  const removeFeature = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const removeFeatureEn = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      featuresEn: prev.featuresEn.filter((_, i) => i !== index),
    }));
  };

  // 保存合作方案
  const handleSave = async () => {
    // 验证必填字段
    if (!formData.tierType || !formData.name || !formData.nameEn) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.features.length === 0 || formData.featuresEn.length === 0) {
      toast.error("Please add at least one feature in both languages");
      return;
    }

    const url = editingTier
      ? `/api/cooperation-plans/${editingTier.id}`
      : "/api/cooperation-plans";
    const method = editingTier ? "PUT" : "POST";

    try {
      setIsSaving(true);
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || genericLoadError);
      }

      toast.success(data.message || (locale === "en" ? "Cooperation plan saved successfully" : "合作方案已保存"));
      setIsEditDialogOpen(false);
      const saved = (data.data ?? data) as CooperationPlan;
      if (saved?.id) upsertTierInState(saved);
    } catch (error) {
      const msg = error instanceof Error ? error.message : genericLoadError;
      setStatusMessage(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // 切换激活状态
  const toggleTierStatus = async (tier: CooperationPlan) => {
    try {
      const response = await fetch(`/api/cooperation-plans/${tier.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !tier.isActive,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || genericLoadError);
      }

      toast.success(data.message || "Status updated successfully");
      const toggled = (data.data ?? data) as CooperationPlan;
      if (toggled?.id) upsertTierInState(toggled);
    } catch (error) {
      const msg = error instanceof Error ? error.message : genericLoadError;
      toast.error(msg);
    }
  };

  return (
    <AdminSectionGuard section="cooperationPlans">
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {locale === "en" ? "Cooperation Plans" : "合作方案管理"}
            </h1>
            <p className="text-slate-600">
              {locale === "en"
                ? "Manage cooperation plan details and feature lists"
                : "管理合作方案的详情和权益内容"}
            </p>
            {statusMessage && (
              <p className="mt-2 text-sm text-slate-500">{statusMessage}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={importDefaultTiers}
              disabled={isImportingDefaults}
            >
              <DatabaseZap className="w-4 h-4 mr-2" />
              {isImportingDefaults
                ? locale === "en"
                  ? "Importing..."
                  : "导入中..."
                : locale === "en"
                ? "Import Defaults"
                : "导入默认方案"}
            </Button>
            <Button
              onClick={handleCreate}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              {locale === "en" ? "Add Plan" : "添加方案"}
            </Button>
          </div>
        </motion.div>

        {/* Tiers List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>
                {locale === "en"
                  ? `Cooperation Plans (${tiers.length})`
                  : `合作方案 (${tiers.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                {isLoading && tiers.length === 0 && (
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
                      <TableHead>{locale === "en" ? "Type" : "类型"}</TableHead>
                      <TableHead>{locale === "en" ? "Name" : "名称"}</TableHead>
                      <TableHead>{locale === "en" ? "Price" : "价格"}</TableHead>
                      <TableHead className="text-center">
                        {locale === "en" ? "Features" : "特性数"}
                      </TableHead>
                      <TableHead>{locale === "en" ? "Status" : "状态"}</TableHead>
                      <TableHead className="text-right">
                        {locale === "en" ? "Actions" : "操作"}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {tiers
                        .sort((a, b) => a.order - b.order)
                        .map((tier, index) => (
                          <motion.tr
                            key={tier.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, delay: index * 0.05 }}
                            className="border-b transition-colors hover:bg-slate-50/50"
                          >
                            <TableCell>
                              <span className="text-slate-400 text-sm">
                                {tier.order}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge className={tierColors[tier.tierType] || ""}>
                                {tier.tierType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium text-slate-900">
                                  {tier.name}
                                </div>
                                <div className="text-sm text-slate-500">
                                  {tier.nameEn}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {tier.price || "-"}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">
                                {tier.features.length}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={tier.isActive}
                                  onCheckedChange={() =>
                                    toggleTierStatus(tier)
                                  }
                                  className="data-[state=checked]:bg-emerald-600"
                                />
                                <span
                                  className={`text-sm ${
                                    tier.isActive
                                      ? "text-emerald-600"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {tier.isActive
                                    ? locale === "en"
                                      ? "Active"
                                      : "已激活"
                                    : locale === "en"
                                    ? "Inactive"
                                    : "已禁用"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(tier)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteClick(tier)}
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

              {tiers.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-slate-900 mb-1">
                    {locale === "en"
                      ? "No cooperation plans"
                      : "暂无合作方案"}
                  </h3>
                  <p className="text-slate-500">
                    {locale === "en"
                      ? "Create or import a cooperation plan to get started"
                      : "创建或导入合作方案后即可开始管理"}
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
                {editingTier
                  ? locale === "en"
                    ? "Edit Cooperation Plan"
                    : "编辑合作方案"
                  : locale === "en"
                  ? "Create Cooperation Plan"
                  : "创建合作方案"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Tier Type */}
              <div className="space-y-2">
                <Label>
                    {locale === "en" ? "Plan Tier" : "方案层级"}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.tierType}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, tierType: value }))
                  }
                  disabled={!!editingTier}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        locale === "en" ? "Select a tier type" : "选择方案类型"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {tierTypeOptions.map((option) => (
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
                  <Label>
                    {locale === "en" ? "Name (Chinese)" : "名称（中文）"}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder={
                      locale === "en"
                        ? "e.g., Chief Partner"
                        : "例如：首席合作伙伴"
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {locale === "en" ? "Name (English)" : "名称（英文）"}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.nameEn}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        nameEn: e.target.value,
                      }))
                    }
                    placeholder="e.g., Chief Partner"
                  />
                </div>
              </div>

              {/* Description Fields */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    {locale === "en" ? "Description (Chinese)" : "描述（中文）"}
                  </Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder={
                      locale === "en"
                        ? "Cooperation plan description"
                        : "合作方案描述"
                    }
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {locale === "en"
                      ? "Description (English)"
                      : "描述（英文）"}
                  </Label>
                  <Textarea
                    value={formData.descriptionEn}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        descriptionEn: e.target.value,
                      }))
                    }
                    placeholder="Cooperation plan description"
                    rows={2}
                  />
                </div>
              </div>

              {/* Price */}
              <div className="space-y-2">
                <Label>{locale === "en" ? "Price" : "价格"}</Label>
                <Input
                  value={formData.price}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, price: e.target.value }))
                  }
                  placeholder={
                    locale === "en"
                      ? "e.g., ¥300,000-500,000"
                      : "例如：¥300,000-500,000"
                  }
                />
              </div>

              {/* Features (Chinese) */}
              <div className="space-y-2">
                <Label>
                  {locale === "en" ? "Features (Chinese)" : "特性（中文）"}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    placeholder={
                      locale === "en"
                        ? "Enter a feature"
                        : "输入一个特性"
                    }
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        addFeature();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addFeature}
                  >
                    {locale === "en" ? "Add" : "添加"}
                  </Button>
                </div>
                {formData.features.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {formData.features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-200"
                      >
                        <span className="text-sm">{feature}</span>
                        <button
                          onClick={() => removeFeature(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Features (English) */}
              <div className="space-y-2">
                <Label>
                  {locale === "en" ? "Features (English)" : "特性（英文）"}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={featureInputEn}
                    onChange={(e) => setFeatureInputEn(e.target.value)}
                    placeholder="Enter a feature"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        addFeatureEn();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addFeatureEn}
                  >
                    {locale === "en" ? "Add" : "添加"}
                  </Button>
                </div>
                {formData.featuresEn.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {formData.featuresEn.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-200"
                      >
                        <span className="text-sm">{feature}</span>
                        <button
                          onClick={() => removeFeatureEn(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order & Status */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{locale === "en" ? "Order" : "排序"}</Label>
                  <Input
                    type="number"
                    value={formData.order}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        order: parseInt(e.target.value) || 0,
                      }))
                    }
                    placeholder={locale === "en" ? "Order" : "排序"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{locale === "en" ? "Status" : "状态"}</Label>
                  <div className="flex items-center gap-2 h-10 px-3 border border-input rounded-md">
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          isActive: checked,
                        }))
                      }
                      className="data-[state=checked]:bg-emerald-600"
                    />
                    <span className="text-sm">
                      {formData.isActive
                        ? locale === "en"
                          ? "Active"
                          : "已激活"
                        : locale === "en"
                        ? "Inactive"
                        : "已禁用"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                {locale === "en" ? "Cancel" : "取消"}
              </Button>
              <LoadingButton
                onClick={handleSave}
                className="bg-emerald-600 hover:bg-emerald-700"
                loading={isSaving}
                loadingText={locale === "en" ? "Saving..." : "保存中..."}
              >
                {locale === "en" ? "Save" : "保存"}
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {locale === "en" ? "Confirm Deletion" : "确认删除"}
              </DialogTitle>
            </DialogHeader>
            <div className="flex gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-slate-700">
                  {locale === "en"
                    ? `Are you sure you want to delete "${deletingTier?.name}"? This action cannot be undone.`
                    : `确定要删除"${deletingTier?.name}"吗？此操作无法撤销。`}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                {locale === "en" ? "Cancel" : "取消"}
              </Button>
              <LoadingButton
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
                loading={isDeleting}
                loadingText={locale === "en" ? "Deleting..." : "删除中..."}
              >
                {locale === "en" ? "Delete" : "删除"}
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminSectionGuard>
  );
}
