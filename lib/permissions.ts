export type AppUserRole =
  | "VISITOR"
  | "ATTENDEE"
  | "ORGANIZATION"
  | "SPONSOR"
  | "SPEAKER"
  | "MEDIA"
  | "ADMIN"
  | "EVENT_MANAGER"
  | "SPECIAL_PASS_MANAGER"
  | "STAFF"
  | "VERIFIER";

export type AdminSectionKey =
  | "dashboard"
  | "events"
  | "specialPass"
  | "tracks"
  | "speakers"
  | "invitations"
  | "users"
  | "partners"
  | "cooperationPlans"
  | "faq"
  | "messages"
  | "news"
  | "content"
  | "settings";

/** Sections that can be granted to any user via staffPermissions (role-independent). */
export type StaffPermissionKey = "speakers" | "news" | "messages" | "faq";

export const STAFF_PERMISSION_OPTIONS: { key: StaffPermissionKey; labelZh: string; labelEn: string }[] = [
  { key: "speakers", labelZh: "嘉宾管理", labelEn: "Speaker Management" },
  { key: "news", labelZh: "新闻管理", labelEn: "News Management" },
  { key: "messages", labelZh: "留言管理", labelEn: "Message Management" },
  { key: "faq", labelZh: "常见问题管理", labelEn: "FAQ Management" },
];

const ADMIN_ONLY_SECTIONS: AdminSectionKey[] = [
  "dashboard",
  "users",
  "partners",
  "cooperationPlans",
  "faq",
  "messages",
  "news",
  "content",
  "settings",
];

const EVENT_MANAGER_SECTIONS: AdminSectionKey[] = ["events", "invitations"];
const SPECIAL_PASS_MANAGER_SECTIONS: AdminSectionKey[] = ["specialPass"];

export function isAdminRole(role?: string | null): role is AppUserRole {
  return role === "ADMIN";
}

export function isEventManagerRole(role?: string | null): role is AppUserRole {
  return role === "EVENT_MANAGER";
}

export function isSpecialPassManagerRole(role?: string | null): role is AppUserRole {
  return role === "SPECIAL_PASS_MANAGER";
}

export function isStaffRole(role?: string | null): role is AppUserRole {
  return role === "STAFF";
}

/** Parse the JSON staffPermissions string into an array of StaffPermissionKey. */
export function parseStaffPermissions(raw?: string | null): StaffPermissionKey[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const valid = new Set<string>(STAFF_PERMISSION_OPTIONS.map((o) => o.key));
      return parsed.filter((k): k is StaffPermissionKey => typeof k === "string" && valid.has(k));
    }
  } catch { /* ignore */ }
  return [];
}

export function isAdminConsoleRole(role?: string | null, staffPermissions?: string | null): role is AppUserRole {
  return isAdminRole(role) || isEventManagerRole(role) || isSpecialPassManagerRole(role) || isStaffRole(role) || parseStaffPermissions(staffPermissions).length > 0;
}

export function canManageEvents(role?: string | null): boolean {
  return isAdminRole(role) || isEventManagerRole(role);
}

export function canManageSpecialPassApplications(role?: string | null): boolean {
  return isAdminRole(role) || isSpecialPassManagerRole(role);
}

export function canManageTracks(role?: string | null): boolean {
  return isAdminRole(role);
}

export function canManageSpeakers(role?: string | null, staffPermissions?: string | null): boolean {
  return isAdminRole(role) || parseStaffPermissions(staffPermissions).includes("speakers");
}

export function canManageNews(role?: string | null, staffPermissions?: string | null): boolean {
  return isAdminRole(role) || parseStaffPermissions(staffPermissions).includes("news");
}

export function canManageMessages(role?: string | null, staffPermissions?: string | null): boolean {
  return isAdminRole(role) || parseStaffPermissions(staffPermissions).includes("messages");
}

export function canManageFaq(role?: string | null, staffPermissions?: string | null): boolean {
  return isAdminRole(role) || parseStaffPermissions(staffPermissions).includes("faq");
}

export function canAccessAdminSection(
  role: string | null | undefined,
  section: AdminSectionKey,
  staffPermissions?: string | null
): boolean {
  const perms = parseStaffPermissions(staffPermissions);

  if (isAdminRole(role)) {
    return true;
  }

  if (isEventManagerRole(role)) {
    return EVENT_MANAGER_SECTIONS.includes(section) || (section === "dashboard" && perms.length > 0) || perms.includes(section as StaffPermissionKey);
  }

  if (isSpecialPassManagerRole(role)) {
    return SPECIAL_PASS_MANAGER_SECTIONS.includes(section) || (section === "dashboard" && perms.length > 0) || perms.includes(section as StaffPermissionKey);
  }

  if (isStaffRole(role)) {
    if (section === "dashboard" && perms.length > 0) return true;
    return perms.includes(section as StaffPermissionKey);
  }

  // Any role: grant access to sections listed in staffPermissions
  if (perms.length > 0) {
    if (section === "dashboard") return true;
    if (perms.includes(section as StaffPermissionKey)) return true;
  }

  return false;
}

export function isAdminOnlySection(section: AdminSectionKey): boolean {
  return ADMIN_ONLY_SECTIONS.includes(section);
}

export function getAdminLandingPath(role?: string | null, staffPermissions?: string | null): string {
  if (isAdminRole(role)) return "/admin";

  if (isSpecialPassManagerRole(role)) {
    return "/admin/special-pass";
  }

  if (isEventManagerRole(role)) {
    return "/admin/events";
  }

  if (isStaffRole(role)) {
    const perms = parseStaffPermissions(staffPermissions);
    if (perms.length > 0) {
      return `/admin/${perms[0] === "faq" ? "faq" : perms[0]}`;
    }
    return "/admin";
  }

  // Non-admin role with staffPermissions => land on first granted section
  const perms = parseStaffPermissions(staffPermissions);
  if (perms.length > 0) {
    return `/admin/${perms[0] === "faq" ? "faq" : perms[0]}`;
  }

  return "/admin";
}