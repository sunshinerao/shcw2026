export type AppUserRole =
  | "VISITOR"
  | "ATTENDEE"
  | "ORGANIZATION"
  | "SPONSOR"
  | "SPEAKER"
  | "MEDIA"
  | "ADMIN"
  | "EVENT_MANAGER"
  | "STAFF"
  | "VERIFIER";

export type AdminSectionKey =
  | "dashboard"
  | "events"
  | "tracks"
  | "speakers"
  | "invitations"
  | "users"
  | "partners"
  | "messages"
  | "news"
  | "content"
  | "settings";

const ADMIN_ONLY_SECTIONS: AdminSectionKey[] = [
  "dashboard",
  "users",
  "partners",
  "messages",
  "news",
  "content",
  "settings",
];

const EVENT_MANAGER_SECTIONS: AdminSectionKey[] = ["events", "invitations"];

export function isAdminRole(role?: string | null): role is AppUserRole {
  return role === "ADMIN";
}

export function isEventManagerRole(role?: string | null): role is AppUserRole {
  return role === "EVENT_MANAGER";
}

export function isAdminConsoleRole(role?: string | null): role is AppUserRole {
  return isAdminRole(role) || isEventManagerRole(role);
}

export function canManageEvents(role?: string | null): boolean {
  return isAdminRole(role) || isEventManagerRole(role);
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

  return false;
}

export function isAdminOnlySection(section: AdminSectionKey): boolean {
  return ADMIN_ONLY_SECTIONS.includes(section);
}

export function getAdminLandingPath(role?: string | null): string {
  return isEventManagerRole(role) ? "/admin/events" : "/admin";
}