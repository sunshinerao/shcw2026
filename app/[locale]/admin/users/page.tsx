"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import {
  Ban,
  Building2,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Trash2,
  User as UserIcon,
  Users,
  Award,
  QrCode,
  Ticket,
  MapPin,
  CheckSquare,
  Download,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getLocalizedSalutationOptions } from "@/lib/user-form-options";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { AdminSectionGuard } from "@/components/admin/admin-section-guard";
import { STAFF_PERMISSION_OPTIONS, type StaffPermissionKey } from "@/lib/permissions";

type UserRole =
  | "VISITOR"
  | "ATTENDEE"
  | "ORGANIZATION"
  | "SPEAKER"
  | "MEDIA"
  | "SPONSOR"
  | "ADMIN"
  | "EVENT_MANAGER"
  | "SPECIAL_PASS_MANAGER"
  | "STAFF"
  | "VERIFIER";

type UserStatus = "PENDING" | "ACTIVE" | "SUSPENDED";

type RegistrationSummary = {
  id: string;
  event: {
    id: string;
    title: string;
    titleEn?: string | null;
    startDate: string;
  };
};

type ManagedUser = {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  phone?: string | null;
  title?: string | null;
  bio?: string | null;
  salutation?: string | null;
  role: UserRole;
  status: UserStatus;
  staffPermissions?: string | null;
  points: number;
  climatePassportId?: string | null;
  passCode: string;
  createdAt: string;
  organization?: {
    name: string;
    logo?: string | null;
    industry?: string | null;
    website?: string | null;
    description?: string | null;
    size?: string | null;
    contactName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
  } | null;
  registrations?: RegistrationSummary[];
  _count?: {
    registrations: number;
    checkins: number;
  };
};

type UserFormState = {
  name: string;
  email: string;
  password: string;
  phone: string;
  title: string;
  bio: string;
  salutation: string;
  role: UserRole;
  status: UserStatus;
  avatar: string;
  staffPermissions: StaffPermissionKey[];
  organizationName: string;
  organizationLogo: string;
  organizationIndustry: string;
  organizationWebsite: string;
  organizationDescription: string;
  organizationSize: string;
  organizationContactName: string;
  organizationContactEmail: string;
  organizationContactPhone: string;
};

const ITEMS_PER_PAGE = 8;
const ROLE_OPTIONS: UserRole[] = [
  "VISITOR",
  "ATTENDEE",
  "ORGANIZATION",
  "SPEAKER",
  "MEDIA",
  "SPONSOR",
  "EVENT_MANAGER",
  "SPECIAL_PASS_MANAGER",
  "STAFF",
  "VERIFIER",
  "ADMIN",
];
const STATUS_OPTIONS: UserStatus[] = ["ACTIVE", "PENDING", "SUSPENDED"];

const roleColors: Record<UserRole, string> = {
  VISITOR: "bg-slate-100 text-slate-700",
  ATTENDEE: "bg-emerald-100 text-emerald-700",
  ORGANIZATION: "bg-cyan-100 text-cyan-700",
  SPEAKER: "bg-purple-100 text-purple-700",
  MEDIA: "bg-pink-100 text-pink-700",
  SPONSOR: "bg-amber-100 text-amber-700",
  ADMIN: "bg-red-100 text-red-700",
  EVENT_MANAGER: "bg-teal-100 text-teal-700",
  SPECIAL_PASS_MANAGER: "bg-cyan-100 text-cyan-700",
  STAFF: "bg-blue-100 text-blue-700",
  VERIFIER: "bg-indigo-100 text-indigo-700",
};

const statusColors: Record<UserStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  ACTIVE: "bg-green-100 text-green-700",
  SUSPENDED: "bg-red-100 text-red-700",
};

const initialFormState: UserFormState = {
  name: "",
  email: "",
  password: "",
  phone: "",
  title: "",
  bio: "",
  salutation: "",
  role: "ATTENDEE",
  status: "ACTIVE",
  avatar: "",
  staffPermissions: [],
  organizationName: "",
  organizationLogo: "",
  organizationIndustry: "",
  organizationWebsite: "",
  organizationDescription: "",
  organizationSize: "",
  organizationContactName: "",
  organizationContactEmail: "",
  organizationContactPhone: "",
};

export default function AdminUsersPage() {
  const t = useTranslations("adminUsersPage");
  const locale = useLocale();
  const salutationOptions = getLocalizedSalutationOptions(locale === "en" ? "en" : "zh");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "ALL">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");
  const [viewUser, setViewUser] = useState<ManagedUser | null>(null);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batchAction, setBatchAction] = useState<"activate" | "suspend" | "delete" | null>(null);
  const [formState, setFormState] = useState<UserFormState>(initialFormState);
  
  // 积分管理相关状态
  const [pointsDialogOpen, setPointsDialogOpen] = useState(false);
  const [pointsUser, setPointsUser] = useState<ManagedUser | null>(null);
  const [pointsAmount, setPointsAmount] = useState(0);
  const [pointsReason, setPointsReason] = useState("");
  const [userPoints, setUserPoints] = useState<{user: any; transactions: any[]} | null>(null);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [filteredTotal, setFilteredTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, speakers: 0, verifiers: 0 });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const currentParamsRef = useRef(new URLSearchParams());

  const loadingLabel = locale === "en" ? "Loading users..." : "正在加载用户...";
  const verifierLabel = t("stats.verifiers");

  const setMessage = (tone: "success" | "error", message: string) => {
    setStatusTone(tone);
    setStatusMessage(message);
  };

  const loadUsers = useCallback(async (params: URLSearchParams) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/users?${params}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || t("messages.updateFailed"));
      }

      setUsers(payload.data.users || []);
      setFilteredTotal(payload.data.pagination.total);
      setTotalPages(payload.data.pagination.totalPages);
      if (payload.data.stats) setStats(payload.data.stats);
      setStatusMessage("");
    } catch (error) {
      console.error("Load users failed:", error);
      setUsers([]);
      setMessage("error", error instanceof Error ? error.message : t("messages.updateFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // Debounce search: reset to page 1 after 300 ms of no input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reload whenever page, debounced search, role filter, or status filter changes
  useEffect(() => {
    const params = new URLSearchParams({
      page: String(currentPage),
      pageSize: String(ITEMS_PER_PAGE),
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (roleFilter !== "ALL") params.set("role", roleFilter);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    currentParamsRef.current = params;
    void loadUsers(params);
  }, [currentPage, debouncedSearch, roleFilter, statusFilter, loadUsers]);

  const resetForm = () => {
    setEditingUser(null);
    setFormState(initialFormState);
  };

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(locale === "en" ? "en-US" : "zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const eventTitle = (registration: RegistrationSummary) =>
    locale === "en" ? registration.event.titleEn || registration.event.title : registration.event.title;

  const upsertUser = (user: ManagedUser) => {
    setUsers((previous) => {
      const next = [...previous];
      const index = next.findIndex((item) => item.id === user.id);

      if (index >= 0) {
        next[index] = user;
      } else {
        next.unshift(user);
      }

      return next;
    });
  };

  const saveUser = async () => {
    if (!formState.name || !formState.email || (!editingUser && !formState.password)) {
      setMessage("error", t("messages.requiredFields"));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(editingUser ? `/api/users/${editingUser.id}` : "/api/users", {
        method: editingUser ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locale,
          name: formState.name,
          email: formState.email,
          ...(formState.password ? { password: formState.password } : {}),
          phone: formState.phone || null,
          title: formState.title || null,
          bio: formState.bio || null,
          salutation: formState.salutation || null,
          role: formState.role,
          status: formState.status,
          avatar: formState.avatar || null,
          ...(formState.role !== "ADMIN" && formState.staffPermissions.length > 0 ? { staffPermissions: formState.staffPermissions } : { staffPermissions: null }),
          organization: formState.organizationName
            ? {
                name: formState.organizationName,
                logo: formState.organizationLogo || null,
                industry: formState.organizationIndustry || null,
                website: formState.organizationWebsite || null,
                description: formState.organizationDescription || null,
                size: formState.organizationSize || null,
                contactName: formState.organizationContactName || null,
                contactEmail: formState.organizationContactEmail || null,
                contactPhone: formState.organizationContactPhone || null,
              }
            : undefined,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || t(editingUser ? "messages.updateFailed" : "messages.createFailed"));
      }

      void loadUsers(currentParamsRef.current);
      setMessage("success", payload.message || t(editingUser ? "messages.updateSuccess" : "messages.createSuccess"));
      setIsFormDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Save user failed:", error);
      setMessage("error", error instanceof Error ? error.message : t("messages.updateFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteUser = async () => {
    if (!userToDelete) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, { method: "DELETE" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || t("messages.deleteFailed"));
      }

      setSelectedUsers((previous) => {
        const next = new Set(previous);
        next.delete(userToDelete.id);
        return next;
      });
      void loadUsers(currentParamsRef.current);
      setMessage("success", payload.message || t("messages.deleteSuccess"));
      setUserToDelete(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Delete user failed:", error);
      setMessage("error", error instanceof Error ? error.message : t("messages.deleteFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateUserStatus = async (user: ManagedUser, status: UserStatus) => {
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ locale, status }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || t("messages.statusUpdateFailed"));
      }

      void loadUsers(currentParamsRef.current);
      setMessage("success", payload.message || t("messages.statusUpdateSuccess"));
    } catch (error) {
      console.error("Status update failed:", error);
      setMessage("error", error instanceof Error ? error.message : t("messages.statusUpdateFailed"));
    }
  };

  const toggleSelectAll = () => {
    if (users.length > 0 && users.every((user) => selectedUsers.has(user.id))) {
      setSelectedUsers(new Set());
      return;
    }

    setSelectedUsers(new Set(users.map((user) => user.id)));
  };

  const toggleSelectUser = (userId: string) => {
    setSelectedUsers((previous) => {
      const next = new Set(previous);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const runBatchAction = async () => {
    if (!batchAction || selectedUsers.size === 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const targetIds = Array.from(selectedUsers);
      await Promise.all(
        targetIds.map(async (userId) => {
          if (batchAction === "delete") {
            const response = await fetch(`/api/users/${userId}`, { method: "DELETE" });
            const payload = await response.json();
            if (!response.ok) {
              throw new Error(payload.error || t("messages.batchFailed"));
            }
            return;
          }

          const nextStatus: UserStatus = batchAction === "activate" ? "ACTIVE" : "SUSPENDED";
          const response = await fetch(`/api/users/${userId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ locale, status: nextStatus }),
          });
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.error || t("messages.batchFailed"));
          }
          upsertUser(payload.data);
        })
      );

      setSelectedUsers(new Set());
      void loadUsers(currentParamsRef.current);
      setIsBatchDialogOpen(false);
      setMessage("success", t("messages.batchSuccess"));
    } catch (error) {
      console.error("Batch action failed:", error);
      setMessage("error", error instanceof Error ? error.message : t("messages.batchFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportUsers = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/admin/users/export?locale=${locale}`);
      if (!response.ok) {
        throw new Error(t("exportFailed"));
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("exportSuccess"));
    } catch {
      toast.error(t("exportFailed"));
    } finally {
      setIsExporting(false);
    }
  };

  const openEditDialog = (user: ManagedUser) => {
    setEditingUser(user);
    setFormState({
      name: user.name,
      email: user.email,
      password: "",
      phone: user.phone || "",
      title: user.title || "",
      bio: user.bio || "",
      salutation: user.salutation || "",
      role: user.role,
      status: user.status,
      avatar: user.avatar || "",
      staffPermissions: user.staffPermissions ? (() => { try { return JSON.parse(user.staffPermissions); } catch { return []; } })() : [],
      organizationName: user.organization?.name || "",
      organizationLogo: user.organization?.logo || "",
      organizationIndustry: user.organization?.industry || "",
      organizationWebsite: user.organization?.website || "",
      organizationDescription: user.organization?.description || "",
      organizationSize: user.organization?.size || "",
      organizationContactName: user.organization?.contactName || "",
      organizationContactEmail: user.organization?.contactEmail || "",
      organizationContactPhone: user.organization?.contactPhone || "",
    });
    setIsFormDialogOpen(true);
  };

  // 查看用户积分
  const viewUserPoints = async (user: ManagedUser) => {
    setPointsUser(user);
    setPointsLoading(true);
    try {
      const response = await fetch(`/api/users/${user.id}/points?locale=${locale}`);
      const data = await response.json();
      if (data.success) {
        setUserPoints(data.data);
      }
    } catch (error) {
      console.error("获取积分失败:", error);
    } finally {
      setPointsLoading(false);
    }
  };

  // 调整用户积分
  const adjustPoints = async () => {
    if (!pointsUser || pointsAmount === 0 || !pointsReason) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users/${pointsUser.id}/points`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          points: pointsAmount,
          description: pointsReason,
          type: pointsAmount > 0 ? "MANUAL_ADD" : "MANUAL_DEDUCT",
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(
          data.message ||
            (pointsAmount > 0
              ? t("pointsDialog.adjust.added", { points: pointsAmount })
              : t("pointsDialog.adjust.deducted", { points: Math.abs(pointsAmount) }))
        );
        setPointsAmount(0);
        setPointsReason("");
        setPointsDialogOpen(false);
        void loadUsers(currentParamsRef.current);
        void viewUserPoints(pointsUser);
      } else {
        toast.error(data.error || t("pointsDialog.adjust.failed"));
      }
    } catch (error) {
      toast.error(t("pointsDialog.adjust.failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 设置用户角色为验证人员
  const setAsVerifier = async (user: ManagedUser) => {
    try {
      const response = await fetch(`/api/users/${user.id}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, role: "VERIFIER" }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(data.message || t("messages.verifierAssigned", { name: user.name }));
        void loadUsers(currentParamsRef.current);
      } else {
        toast.error(data.error || t("messages.verifierAssignFailed"));
      }
    } catch (error) {
      toast.error(t("messages.verifierAssignFailed"));
    }
  };

  const totalUsers = stats.total;
  const activeUsers = stats.active;
  const pendingUsers = stats.pending;
  const speakersCount = stats.speakers;
  const verifiersCount = stats.verifiers;

  return (
    <AdminSectionGuard section="users">
      <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-slate-600">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <LoadingButton
            variant="outline"
            onClick={() => void exportUsers()}
            loading={isExporting}
            loadingText={t("exportUsersLoading")}
          >
            <Download className="mr-2 h-4 w-4" />
            {t("exportUsers")}
          </LoadingButton>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => {
              resetForm();
              setIsFormDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("addUser")}
          </Button>
        </div>
      </motion.div>

      {statusMessage ? (
        <Card className={statusTone === "success" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}>
          <CardContent className="p-4 text-sm font-medium text-slate-700">{statusMessage}</CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card><CardContent className="flex items-center gap-4 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50"><Users className="h-6 w-6 text-emerald-600" /></div><div><p className="text-sm text-slate-500">{t("stats.total")}</p><p className="text-2xl font-bold text-slate-900">{totalUsers}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50"><CheckCircle className="h-6 w-6 text-green-600" /></div><div><p className="text-sm text-slate-500">{t("stats.active")}</p><p className="text-2xl font-bold text-slate-900">{activeUsers}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-50"><Calendar className="h-6 w-6 text-yellow-600" /></div><div><p className="text-sm text-slate-500">{t("stats.pending")}</p><p className="text-2xl font-bold text-slate-900">{pendingUsers}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50"><UserIcon className="h-6 w-6 text-purple-600" /></div><div><p className="text-sm text-slate-500">{t("stats.speakers")}</p><p className="text-2xl font-bold text-slate-900">{speakersCount}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50"><QrCode className="h-6 w-6 text-indigo-600" /></div><div><p className="text-sm text-slate-500">{verifierLabel}</p><p className="text-2xl font-bold text-slate-900">{verifiersCount}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input placeholder={t("searchPlaceholder")} value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); }} className="pl-10" />
            </div>
            <div className="flex gap-3">
              <Select value={roleFilter} onValueChange={(value) => { setRoleFilter(value as UserRole | "ALL"); setCurrentPage(1); }}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder={t("filters.allRoles")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("filters.allRoles")}</SelectItem>
                  {ROLE_OPTIONS.map((role) => <SelectItem key={role} value={role}>{t(`roles.${role}`)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value as UserStatus | "ALL"); setCurrentPage(1); }}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder={t("filters.allStatuses")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("filters.allStatuses")}</SelectItem>
                  {STATUS_OPTIONS.map((status) => <SelectItem key={status} value={status}>{t(`statuses.${status}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {selectedUsers.size > 0 ? (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="flex items-center justify-between p-4">
                <p className="font-medium text-emerald-800">{t("selected", { count: selectedUsers.size })}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setBatchAction("activate"); setIsBatchDialogOpen(true); }}>{t("batch.activate")}</Button>
                  <Button size="sm" variant="outline" onClick={() => { setBatchAction("suspend"); setIsBatchDialogOpen(true); }}>{t("batch.suspend")}</Button>
                  <Button size="sm" variant="outline" onClick={() => { setBatchAction("delete"); setIsBatchDialogOpen(true); }}>{t("batch.delete")}</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Card>
        <CardHeader><CardTitle>{t("listTitle", { count: filteredTotal })}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[40px]"><Checkbox checked={users.length > 0 && users.every((user) => selectedUsers.has(user.id))} onCheckedChange={toggleSelectAll} /></TableHead>
                  <TableHead>{t("table.userInfo")}</TableHead>
                  <TableHead>{t("table.role")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
                  <TableHead>{t("table.registeredAt")}</TableHead>
                  <TableHead className="text-right">{t("table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="py-12 text-center text-slate-500">{loadingLabel}</TableCell></TableRow>
                ) : users.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-12 text-center text-slate-500">{t("empty")}</TableCell></TableRow>
                ) : users.map((user) => (
                  <TableRow key={user.id} className="border-b transition-colors hover:bg-slate-50/50">
                    <TableCell><Checkbox checked={selectedUsers.has(user.id)} onCheckedChange={() => toggleSelectUser(user.id)} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10"><AvatarImage src={user.avatar || undefined} alt={user.name} /><AvatarFallback className="bg-emerald-100 text-emerald-700">{getInitials(user.name)}</AvatarFallback></Avatar>
                        <div><p className="font-medium text-slate-900">{user.name}</p><p className="text-sm text-slate-500">{user.email}</p></div>
                      </div>
                    </TableCell>
                    <TableCell><Badge className={roleColors[user.role]}>{t(`roles.${user.role}`)}</Badge></TableCell>
                    <TableCell><Badge className={statusColors[user.status]}>{t(`statuses.${user.status}`)}</Badge></TableCell>
                    <TableCell className="text-slate-500">{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setViewUser(user)}><Eye className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => openEditDialog(user)}><Edit2 className="h-4 w-4" /></Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user.status === "SUSPENDED" ? (
                              <DropdownMenuItem onClick={() => void updateUserStatus(user, "ACTIVE")}><CheckCircle className="mr-2 h-4 w-4 text-green-600" />{t("actions.activate")}</DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => void updateUserStatus(user, "SUSPENDED")}><Ban className="mr-2 h-4 w-4 text-amber-600" />{t("actions.suspend")}</DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { viewUserPoints(user); }}>
                              <Award className="mr-2 h-4 w-4 text-emerald-600" />
                              {t("actions.viewPoints")}
                            </DropdownMenuItem>
                            {user.role !== "VERIFIER" && (
                              <DropdownMenuItem onClick={() => void setAsVerifier(user)}>
                                <QrCode className="mr-2 h-4 w-4 text-indigo-600" />
                                {t("actions.setVerifier")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => { setUserToDelete(user); setIsDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4" />{t("actions.delete")}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
              <p className="text-sm text-slate-500">{t("pagination", { current: currentPage, total: totalPages })}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={!!viewUser} onOpenChange={(open) => !open && setViewUser(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{t("detail.title")}</DialogTitle><DialogDescription>{t("detail.description")}</DialogDescription></DialogHeader>
          {viewUser ? (
            <div className="mt-4 space-y-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20"><AvatarImage src={viewUser.avatar || undefined} alt={viewUser.name} /><AvatarFallback className="bg-emerald-100 text-xl text-emerald-700">{getInitials(viewUser.name)}</AvatarFallback></Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900">{viewUser.name}</h3>
                  <p className="mt-1 text-slate-500">{viewUser.title || t("detail.notProvided")}</p>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <Badge className={roleColors[viewUser.role]}>{t(`roles.${viewUser.role}`)}</Badge>
                    <Badge className={statusColors[viewUser.status]}>{t(`statuses.${viewUser.status}`)}</Badge>
                    {viewUser.climatePassportId && (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                        {viewUser.climatePassportId}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 md:grid-cols-2">
                <div className="flex items-center gap-3"><Mail className="h-5 w-5 text-slate-500" /><div><p className="text-sm text-slate-500">{t("detail.email")}</p><p className="font-medium text-slate-900">{viewUser.email}</p></div></div>
                <div className="flex items-center gap-3"><Phone className="h-5 w-5 text-slate-500" /><div><p className="text-sm text-slate-500">{t("detail.phone")}</p><p className="font-medium text-slate-900">{viewUser.phone || t("detail.notProvided")}</p></div></div>
                <div className="flex items-center gap-3"><Calendar className="h-5 w-5 text-slate-500" /><div><p className="text-sm text-slate-500">{t("detail.registeredAt")}</p><p className="font-medium text-slate-900">{formatDate(viewUser.createdAt)}</p></div></div>
                <div className="flex items-center gap-3"><Building2 className="h-5 w-5 text-slate-500" /><div><p className="text-sm text-slate-500">{t("detail.organization")}</p><p className="font-medium text-slate-900">{viewUser.organization?.name || t("detail.notProvided")}</p></div></div>
                <div className="flex items-center gap-3"><Award className="h-5 w-5 text-slate-500" /><div><p className="text-sm text-slate-500">{t("detail.currentPoints")}</p><p className="font-medium text-slate-900">{t("detail.pointsValue", { count: viewUser.points || 0 })}</p></div></div>
                <div className="flex items-center gap-3"><Ticket className="h-5 w-5 text-slate-500" /><div><p className="text-sm text-slate-500">{t("detail.registrationCount")}</p><p className="font-medium text-slate-900">{t("detail.eventCount", { count: viewUser._count?.registrations || 0 })}</p></div></div>
              </div>

              {viewUser.bio ? <div><h4 className="mb-3 font-semibold text-slate-900">{t("detail.bio")}</h4><p className="rounded-xl bg-slate-50 p-4 text-slate-600">{viewUser.bio}</p></div> : null}

              <div>
                <h4 className="mb-3 font-semibold text-slate-900">{t("detail.events")}</h4>
                {viewUser.registrations && viewUser.registrations.length > 0 ? (
                  <div className="space-y-2">
                    {viewUser.registrations.map((registration) => (
                      <div key={registration.id} className="rounded-lg bg-slate-50 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-slate-700 font-medium">{eventTitle(registration)}</p>
                        </div>
                        <p className="text-sm text-slate-500">{formatDate(registration.event.startDate)}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="rounded-xl bg-slate-50 p-4 text-slate-500">{t("detail.noEvents")}</p>}
              </div>
            </div>
          ) : null}
          <DialogFooter className="mt-6 gap-2">
            <Button variant="outline" onClick={() => setViewUser(null)}>{t("detail.close")}</Button>
            {viewUser && (
              <>
                <Button variant="outline" onClick={() => { setViewUser(null); viewUserPoints(viewUser); }}>
                  <Award className="mr-2 h-4 w-4" />
                  {t("actions.viewPoints")}
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => openEditDialog(viewUser)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  {t("detail.edit")}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFormDialogOpen} onOpenChange={(open) => { setIsFormDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editingUser ? t("form.editTitle") : t("form.createTitle")}</DialogTitle><DialogDescription>{editingUser ? t("form.editDescription") : t("form.createDescription")}</DialogDescription></DialogHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>{t("form.salutation")}</Label><Select value={formState.salutation} onValueChange={(value) => setFormState((previous) => ({ ...previous, salutation: value }))}><SelectTrigger><SelectValue placeholder={t("form.salutationPlaceholder")} /></SelectTrigger><SelectContent>{salutationOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="user-name">{t("form.name")}</Label><Input id="user-name" value={formState.name} onChange={(event) => setFormState((previous) => ({ ...previous, name: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="user-email">{t("form.email")}</Label><Input id="user-email" type="email" value={formState.email} onChange={(event) => setFormState((previous) => ({ ...previous, email: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="user-password">{editingUser ? t("form.passwordOptional") : t("form.password")}</Label><Input id="user-password" type="password" value={formState.password} onChange={(event) => setFormState((previous) => ({ ...previous, password: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="user-phone">{t("form.phone")}</Label><Input id="user-phone" value={formState.phone} onChange={(event) => setFormState((previous) => ({ ...previous, phone: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="user-title">{t("form.title")}</Label><Input id="user-title" value={formState.title} onChange={(event) => setFormState((previous) => ({ ...previous, title: event.target.value }))} /></div>
            <div className="space-y-2"><Label>{t("form.role")}</Label><Select value={formState.role} onValueChange={(value) => setFormState((previous) => ({ ...previous, role: value as UserRole }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ROLE_OPTIONS.map((role) => <SelectItem key={role} value={role}>{t(`roles.${role}`)}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>{t("form.status")}</Label><Select value={formState.status} onValueChange={(value) => setFormState((previous) => ({ ...previous, status: value as UserStatus }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUS_OPTIONS.map((status) => <SelectItem key={status} value={status}>{t(`statuses.${status}`)}</SelectItem>)}</SelectContent></Select></div>
            {formState.role !== "ADMIN" && (
              <div className="space-y-3 md:col-span-2 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <Label className="text-blue-800 font-semibold">{locale === "en" ? "Staff Permissions" : "员工权限"}</Label>
                <p className="text-sm text-blue-600">{locale === "en" ? "Select the admin sections this user can additionally manage:" : "选择该用户可以额外管理的功能模块："}</p>
                <div className="grid grid-cols-2 gap-3">
                  {STAFF_PERMISSION_OPTIONS.map((option) => (
                    <label key={option.key} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={formState.staffPermissions.includes(option.key)}
                        onCheckedChange={(checked) => {
                          setFormState((previous) => ({
                            ...previous,
                            staffPermissions: checked
                              ? [...previous.staffPermissions, option.key]
                              : previous.staffPermissions.filter((k) => k !== option.key),
                          }));
                        }}
                      />
                      <span className="text-sm">{locale === "en" ? option.labelEn : option.labelZh}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2 md:col-span-2">
              <Label>{t("form.avatar")}</Label>
              <div className="flex items-center gap-4">
                {formState.avatar && (
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={formState.avatar} />
                    <AvatarFallback>{formState.name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setFormState((previous) => ({ ...previous, avatar: reader.result as string }));
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2"><Label htmlFor="user-bio">{t("form.bio")}</Label><Textarea id="user-bio" rows={3} value={formState.bio} onChange={(event) => setFormState((previous) => ({ ...previous, bio: event.target.value }))} /></div>
            <div className="md:col-span-2 border-t pt-4 mt-2"><h4 className="font-semibold text-slate-700 mb-3">{t("form.organizationSection")}</h4></div>
            <div className="space-y-2"><Label htmlFor="org-name">{t("form.organizationName")}</Label><Input id="org-name" value={formState.organizationName} onChange={(event) => setFormState((previous) => ({ ...previous, organizationName: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="org-industry">{t("form.organizationIndustry")}</Label><Input id="org-industry" value={formState.organizationIndustry} onChange={(event) => setFormState((previous) => ({ ...previous, organizationIndustry: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="org-website">{t("form.organizationWebsite")}</Label><Input id="org-website" value={formState.organizationWebsite} onChange={(event) => setFormState((previous) => ({ ...previous, organizationWebsite: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="org-size">{t("form.organizationSize")}</Label><Input id="org-size" value={formState.organizationSize} onChange={(event) => setFormState((previous) => ({ ...previous, organizationSize: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="org-contact-name">{t("form.organizationContactName")}</Label><Input id="org-contact-name" value={formState.organizationContactName} onChange={(event) => setFormState((previous) => ({ ...previous, organizationContactName: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="org-contact-email">{t("form.organizationContactEmail")}</Label><Input id="org-contact-email" type="email" value={formState.organizationContactEmail} onChange={(event) => setFormState((previous) => ({ ...previous, organizationContactEmail: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="org-contact-phone">{t("form.organizationContactPhone")}</Label><Input id="org-contact-phone" value={formState.organizationContactPhone} onChange={(event) => setFormState((previous) => ({ ...previous, organizationContactPhone: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="org-logo">{t("form.organizationLogo")}</Label><Input id="org-logo" value={formState.organizationLogo} onChange={(event) => setFormState((previous) => ({ ...previous, organizationLogo: event.target.value }))} placeholder="https://..." /></div>
            <div className="space-y-2 md:col-span-2"><Label htmlFor="org-description">{t("form.organizationDescription")}</Label><Textarea id="org-description" rows={3} value={formState.organizationDescription} onChange={(event) => setFormState((previous) => ({ ...previous, organizationDescription: event.target.value }))} /></div>
          </div>
          <DialogFooter className="mt-6"><Button variant="outline" onClick={() => setIsFormDialogOpen(false)}>{t("common.cancel")}</Button><LoadingButton className="bg-emerald-600 hover:bg-emerald-700" onClick={() => void saveUser()} loading={isSubmitting} loadingText={locale === "en" ? (editingUser ? "Saving..." : "Creating...") : (editingUser ? "保存中..." : "创建中...")}>{editingUser ? t("form.save") : t("form.create")}</LoadingButton></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("delete.title")}</DialogTitle><DialogDescription>{t("delete.description", { name: userToDelete?.name || "" })}</DialogDescription></DialogHeader>
          <DialogFooter className="mt-4"><Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>{t("common.cancel")}</Button><LoadingButton variant="destructive" onClick={() => void deleteUser()} loading={isSubmitting} loadingText={locale === "en" ? "Deleting..." : "删除中..."}>{t("delete.confirm")}</LoadingButton></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {batchAction === "activate" && t("batchDialog.activateTitle")}
              {batchAction === "suspend" && t("batchDialog.suspendTitle")}
              {batchAction === "delete" && t("batchDialog.deleteTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("batchDialog.description", {
                count: selectedUsers.size,
                action:
                  batchAction === "activate"
                    ? t("batchDialog.actions.activate")
                    : batchAction === "suspend"
                      ? t("batchDialog.actions.suspend")
                      : t("batchDialog.actions.delete"),
              })}
              {batchAction === "delete" ? ` ${t("batchDialog.irreversible")}` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4"><Button variant="outline" onClick={() => setIsBatchDialogOpen(false)}>{t("common.cancel")}</Button><LoadingButton variant={batchAction === "delete" ? "destructive" : "default"} className={batchAction !== "delete" ? "bg-emerald-600 hover:bg-emerald-700" : ""} onClick={() => void runBatchAction()} loading={isSubmitting} loadingText={locale === "en" ? "Processing..." : "处理中..."}>{t("batchDialog.confirm")}</LoadingButton></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 积分管理对话框 */}
      <Dialog open={!!pointsUser || pointsDialogOpen} onOpenChange={(open) => { 
        if (!open) { 
          setPointsUser(null); 
          setUserPoints(null);
          setPointsDialogOpen(false);
        } 
      }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("pointsDialog.title")}</DialogTitle>
            <DialogDescription>
              {pointsUser ? t("pointsDialog.descriptionWithName", { name: pointsUser.name }) : t("pointsDialog.description")}
            </DialogDescription>
          </DialogHeader>
          
          {pointsLoading ? (
            <div className="py-8 text-center text-slate-500">{t("pointsDialog.loading")}</div>
          ) : userPoints ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Award className="w-8 h-8 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-emerald-600">{t("pointsDialog.currentPoints")}</p>
                  <p className="text-3xl font-bold text-emerald-900">{userPoints.user.points}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-emerald-600">{t("pointsDialog.attendedEvents")}</p>
                  <p className="text-xl font-bold text-emerald-900">{t("pointsDialog.eventCount", { count: userPoints.user.attendedEvents })}</p>
                </div>
              </div>

              <div className="p-4 border rounded-xl">
                <h4 className="font-semibold text-slate-900 mb-3">{t("pointsDialog.adjust.title")}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("pointsDialog.adjust.pointsLabel")}</Label>
                    <Input 
                      type="number" 
                      value={pointsAmount} 
                      onChange={(e) => setPointsAmount(parseInt(e.target.value) || 0)}
                      placeholder={t("pointsDialog.adjust.pointsPlaceholder")}
                    />
                  </div>
                  <div>
                    <Label>{t("pointsDialog.adjust.reasonLabel")}</Label>
                    <Input 
                      value={pointsReason} 
                      onChange={(e) => setPointsReason(e.target.value)}
                      placeholder={t("pointsDialog.adjust.reasonPlaceholder")}
                    />
                  </div>
                </div>
                <LoadingButton 
                  className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={adjustPoints}
                  disabled={pointsAmount === 0 || !pointsReason}
                  loading={isSubmitting}
                  loadingText={t("pointsDialog.adjust.submitting")}
                >
                  {t("pointsDialog.adjust.confirm")}
                </LoadingButton>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-3">{t("pointsDialog.recordsTitle")}</h4>
                {userPoints.transactions.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">{t("pointsDialog.noRecords")}</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {userPoints.transactions.map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-900">{tx.description}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(tx.createdAt).toLocaleString(locale === "en" ? "en-US" : "zh-CN")} · {tx.type}
                          </p>
                        </div>
                        <Badge className={tx.points > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                          {tx.points > 0 ? "+" : ""}{tx.points}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => { setPointsUser(null); setUserPoints(null); setPointsDialogOpen(false); }}>
              {t("common.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </AdminSectionGuard>
  );
}
