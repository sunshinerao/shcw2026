export function normalizeUserEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeUserName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}
