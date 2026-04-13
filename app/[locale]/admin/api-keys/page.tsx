"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Key,
  Plus,
  Copy,
  Check,
  Pencil,
  Trash2,
  ShieldCheck,
  ShieldOff,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { AdminSectionGuard } from "@/components/admin/admin-section-guard";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ALL_PERMISSIONS, type ApiKeyPermission } from "@/lib/openclaw-auth";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: ApiKeyPermission[];
  ipAllowlist: string[] | null;
  isActive: boolean;
  lastUsedAt: string | null;
  usageCount: number;
  note: string | null;
  createdAt: string;
}


const PERMISSION_GROUPS: { group: string; permissions: ApiKeyPermission[] }[] = [
  { group: "Events", permissions: ["events:read", "events:write"] },
  { group: "Speakers", permissions: ["speakers:read", "speakers:write"] },
  { group: "News", permissions: ["news:read", "news:write"] },
  { group: "Insights", permissions: ["insights:read", "insights:write"] },
  { group: "Partners", permissions: ["partners:read", "partners:write"] },
  { group: "Institutions", permissions: ["institutions:read", "institutions:write"] },
  { group: "Users", permissions: ["users:write"] },
];

const PERMISSION_LABEL_MAP: Record<ApiKeyPermission, string> = {
  "events:read": "Events (read)",
  "events:write": "Events (write)",
  "speakers:read": "Speakers (read)",
  "speakers:write": "Speakers (write)",
  "news:read": "News (read)",
  "news:write": "News (write)",
  "insights:read": "Insights (read)",
  "insights:write": "Insights (write)",
  "partners:read": "Partners (read)",
  "partners:write": "Partners (write)",
  "institutions:read": "Institutions (read)",
  "institutions:write": "Institutions (write)",
  "users:write": "Users (reset password)",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function parseIpLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

interface KeyFormState {
  name: string;
  permissions: ApiKeyPermission[];
  ipAllowlist: string; // textarea, newline-separated
  note: string;
  isActive: boolean;
}

const EMPTY_FORM: KeyFormState = {
  name: "",
  permissions: [],
  ipAllowlist: "",
  note: "",
  isActive: true,
};

function KeyFormFields({
  form,
  t,
  onChange,
}: {
  form: KeyFormState;
  t: ReturnType<typeof useTranslations>;
  onChange: (patch: Partial<KeyFormState>) => void;
}) {
  function togglePermission(p: ApiKeyPermission) {
    const next = form.permissions.includes(p)
      ? form.permissions.filter((x) => x !== p)
      : [...form.permissions, p];
    onChange({ permissions: next });
  }

  return (
    <div className="space-y-4">
      {/* Name */}
      <div>
        <Label htmlFor="kf-name">{t("form.name")}</Label>
        <Input
          id="kf-name"
          className="mt-1"
          placeholder={t("form.namePlaceholder")}
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>

      {/* Permissions */}
      <div>
        <Label>{t("permissions.label")}</Label>
        <p className="mb-2 text-xs text-slate-500">{t("permissions.hint")}</p>
        <div className="grid grid-cols-2 gap-2">
          {PERMISSION_GROUPS.map(({ group, permissions }) => (
            <div key={group} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="mb-1.5 text-xs font-semibold text-slate-600">{group}</p>
              {permissions.map((p) => (
                <label key={p} className="flex cursor-pointer items-center gap-2 py-0.5">
                  <Checkbox
                    checked={form.permissions.includes(p)}
                    onCheckedChange={() => togglePermission(p)}
                  />
                  <span className="text-xs text-slate-700">{PERMISSION_LABEL_MAP[p]}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* IP Allowlist */}
      <div>
        <Label htmlFor="kf-ip">{t("form.ipAllowlist")}</Label>
        <Textarea
          id="kf-ip"
          className="mt-1 font-mono text-xs"
          rows={3}
          placeholder={t("form.ipAllowlistPlaceholder")}
          value={form.ipAllowlist}
          onChange={(e) => onChange({ ipAllowlist: e.target.value })}
        />
        <p className="mt-1 text-xs text-slate-500">{t("ipAllowlist.hint")}</p>
      </div>

      {/* Note */}
      <div>
        <Label htmlFor="kf-note">{t("form.note")}</Label>
        <Input
          id="kf-note"
          className="mt-1"
          placeholder={t("form.notePlaceholder")}
          value={form.note}
          onChange={(e) => onChange({ note: e.target.value })}
        />
      </div>
    </div>
  );
}

export default function AdminApiKeysPage() {
  const t = useTranslations("adminApiKeysPage");

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<KeyFormState>(EMPTY_FORM);
  const [isCreating, setIsCreating] = useState(false);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Edit dialog
  const [editKey, setEditKey] = useState<ApiKey | null>(null);
  const [editForm, setEditForm] = useState<KeyFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Delete dialog
  const [deleteKey, setDeleteKey] = useState<ApiKey | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/api-keys");
      if (!res.ok) throw new Error("load failed");
      const data = await res.json();
      setKeys(data.data ?? []);
    } catch {
      toast.error(t("messages.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  // ── Create ──────────────────────────────────────────────
  async function handleCreate() {
    if (!createForm.name.trim()) return;
    if (createForm.permissions.length === 0) {
      toast.error(t("permissions.hint"));
      return;
    }
    setIsCreating(true);
    try {
      const body: Record<string, unknown> = {
        name: createForm.name.trim(),
        permissions: createForm.permissions,
        note: createForm.note.trim() || null,
      };
      const ips = parseIpLines(createForm.ipAllowlist);
      if (ips.length > 0) body.ipAllowlist = ips;

      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "create failed");
      }
      const data = await res.json();
      setRawKey(data.data?.rawKey ?? null);
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
      await loadKeys();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("messages.saveFailed"));
    } finally {
      setIsCreating(false);
    }
  }

  async function copyRawKey() {
    if (!rawKey) return;
    await navigator.clipboard.writeText(rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Edit ────────────────────────────────────────────────
  function openEdit(key: ApiKey) {
    setEditKey(key);
    setEditForm({
      name: key.name,
      permissions: key.permissions,
      ipAllowlist: (key.ipAllowlist ?? []).join("\n"),
      note: key.note ?? "",
      isActive: key.isActive,
    });
  }

  async function handleSaveEdit() {
    if (!editKey) return;
    if (!editForm.name.trim()) return;
    if (editForm.permissions.length === 0) {
      toast.error(t("permissions.hint"));
      return;
    }
    setIsSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: editForm.name.trim(),
        permissions: editForm.permissions,
        note: editForm.note.trim() || null,
        isActive: editForm.isActive,
      };
      const ips = parseIpLines(editForm.ipAllowlist);
      body.ipAllowlist = ips.length > 0 ? ips : null;

      const res = await fetch(`/api/admin/api-keys/${editKey.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "save failed");
      }
      toast.success(t("edit.success"));
      setEditKey(null);
      await loadKeys();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("messages.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  // ── Delete ──────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteKey) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/api-keys/${deleteKey.id}`, { method: "DELETE" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "delete failed");
      }
      toast.success(t("delete.success"));
      setDeleteKey(null);
      await loadKeys();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("messages.saveFailed"));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AdminSectionGuard section="apiKeys">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
              <Key className="h-6 w-6 text-indigo-500" />
              {t("title")}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("createKey")}
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : keys.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">{t("noKeys")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.name")}</TableHead>
                    <TableHead>{t("table.prefix")}</TableHead>
                    <TableHead>{t("table.permissions")}</TableHead>
                    <TableHead>{t("table.ipAllowlist")}</TableHead>
                    <TableHead>{t("table.status")}</TableHead>
                    <TableHead>{t("table.lastUsed")}</TableHead>
                    <TableHead className="text-right">{t("table.usageCount")}</TableHead>
                    <TableHead>{t("table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">
                        {key.name}
                        {key.note && (
                          <p className="mt-0.5 text-xs text-slate-400">{key.note}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                          {key.keyPrefix}...
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {key.permissions.map((p) => (
                            <Badge key={p} variant="secondary" className="text-xs">
                              {p}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {key.ipAllowlist && key.ipAllowlist.length > 0
                          ? key.ipAllowlist.join(", ")
                          : t("ipAllowlist.any")}
                      </TableCell>
                      <TableCell>
                        {key.isActive ? (
                          <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                            <ShieldCheck className="h-3 w-3" />
                            {t("status.active")}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1 opacity-70">
                            <ShieldOff className="h-3 w-3" />
                            {t("status.revoked")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {key.lastUsedAt ? formatDate(key.lastUsedAt) : t("neverUsed")}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {key.usageCount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            title={t("table.actions")}
                            onClick={() => openEdit(key)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                            title={t("delete")}
                            onClick={() => setDeleteKey(key)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Create Dialog ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("create.title")}</DialogTitle>
          </DialogHeader>
          <KeyFormFields
            form={createForm}
            t={t}
            onChange={(patch) => setCreateForm((f) => ({ ...f, ...patch }))}
          />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              {t("cancel")}
            </Button>
            <LoadingButton
              loading={isCreating}
              disabled={!createForm.name.trim() || createForm.permissions.length === 0}
              onClick={handleCreate}
            >
              {t("save")}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Raw Key Dialog (one-time display) ── */}
      <Dialog open={!!rawKey} onOpenChange={(open) => { if (!open) { setRawKey(null); setCopied(false); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("create.success")}</DialogTitle>
            <DialogDescription>{t("create.warning")}</DialogDescription>
          </DialogHeader>
          <div className="my-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <code className="flex-1 break-all font-mono text-sm text-amber-900">{rawKey}</code>
            <Button size="sm" variant="outline" className="shrink-0 gap-1" onClick={copyRawKey}>
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  {t("create.copied")}
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  {t("create.copyKey")}
                </>
              )}
            </Button>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setRawKey(null);
                setCopied(false);
              }}
            >
              {t("cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editKey} onOpenChange={(open) => { if (!open) setEditKey(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("edit.title")}</DialogTitle>
          </DialogHeader>
          {editKey && (
            <>
              <KeyFormFields
                form={editForm}
                t={t}
                onChange={(patch) => setEditForm((f) => ({ ...f, ...patch }))}
              />
              {/* isActive toggle only in edit mode */}
              <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                <Switch
                  checked={editForm.isActive}
                  onCheckedChange={(v) => setEditForm((f) => ({ ...f, isActive: v }))}
                />
                <span className="text-sm text-slate-700">{t("form.isActive")}</span>
              </div>
            </>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditKey(null)}>
              {t("cancel")}
            </Button>
            <LoadingButton
              loading={isSaving}
              disabled={!editForm.name.trim() || editForm.permissions.length === 0}
              onClick={handleSaveEdit}
            >
              {t("save")}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={!!deleteKey} onOpenChange={(open) => { if (!open) setDeleteKey(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("delete.title")}</DialogTitle>
            <DialogDescription>
              {deleteKey
                ? t("delete.confirm", { name: deleteKey.name })
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteKey(null)}>
              {t("cancel")}
            </Button>
            <LoadingButton
              loading={isDeleting}
              variant="destructive"
              onClick={handleDelete}
            >
              {t("delete")}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminSectionGuard>
  );
}
