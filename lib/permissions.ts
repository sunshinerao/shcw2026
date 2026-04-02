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
  | "sponsorshipTiers"
  | "messages"
  | "news"
  | "content"
  | "settings";

const ADMIN_ONLY_SECTIONS: AdminSectionKey[] = [
  "dashboard",
  "users",
  "partners",
  "sponsorshipTiers",
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

export function isAdminConsoleRole(role?: string | null): role is AppUserRole {
  return isAdminRole(role) || isEventManagerRole(role) || isSpecialPassManagerRole(role);
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

export function canManageSpeakers(role?: string | null): boolean {
  return isAdminRole(role);
}

export function canAccessAdminSection(
  role: string | null | undefined,
  section: AdminSectionKey
): boolean {
  if (isAdminRole(role)) {
    return true;
  }

  if (isEventManagerRole(role)) {
    return EVENT_MANAGER_SECTIONS.includes(section);
  }

  if (isSpecialPassManagerRole(role)) {
    return SPECIAL_PASS_MANAGER_SECTIONS.includes(section);
  }

  return false;
}

export function isAdminOnlySection(section: AdminSectionKey): boolean {
  return ADMIN_ONLY_SECTIONS.includes(section);
}

export function getAdminLandingPath(role?: string | null): string {
  if (isSpecialPassManagerRole(role)) {
    return "/admin/special-pass";
  }

  return isEventManagerRole(role) ? "/admin/events" : "/admin";
}