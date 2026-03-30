import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(time: string): string {
  return time;
}

export function generatePassCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "SCW";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成气候护照唯一ID
 * 格式: XXXXXXX-XXXXXX (7位随机字母数字-6位随机字母数字)
 */
export function generateClimatePassportId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  result += "-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

type SupportedLocale = "zh" | "en";

const roleLabels: Record<SupportedLocale, Record<string, string>> = {
  zh: {
    VISITOR: "访客",
    ATTENDEE: "参会观众",
    ORGANIZATION: "机构代表",
    SPONSOR: "赞助商",
    SPEAKER: "演讲嘉宾",
    MEDIA: "媒体",
    ADMIN: "管理员",
    STAFF: "工作人员",
    VERIFIER: "验证人员",
  },
  en: {
    VISITOR: "Visitor",
    ATTENDEE: "Attendee",
    ORGANIZATION: "Organization",
    SPONSOR: "Sponsor",
    SPEAKER: "Speaker",
    MEDIA: "Media",
    ADMIN: "Administrator",
    STAFF: "Staff",
    VERIFIER: "Verifier",
  },
};

export function getRoleLabel(role: string, locale: SupportedLocale = "zh"): string {
  return roleLabels[locale][role] || role;
}

export function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    VISITOR: "bg-neutral-100 text-neutral-700",
    ATTENDEE: "bg-primary-100 text-primary-700",
    ORGANIZATION: "bg-blue-100 text-blue-700",
    SPONSOR: "bg-yellow-100 text-yellow-700",
    SPEAKER: "bg-purple-100 text-purple-700",
    MEDIA: "bg-pink-100 text-pink-700",
    ADMIN: "bg-red-100 text-red-700",
    STAFF: "bg-orange-100 text-orange-700",
  };
  return colors[role] || "bg-neutral-100 text-neutral-700";
}

export function getTrackColor(category: string): string {
  const colors: Record<string, string> = {
    institution: "bg-sky-500",
    economy: "bg-violet-500",
    foundation: "bg-orange-500",
    accelerator: "bg-amber-500",
    comprehensive: "bg-amber-500",
  };
  return colors[category] || "bg-primary-500";
}

export function getTrackBgColor(category: string): string {
  const colors: Record<string, string> = {
    institution: "bg-sky-50 text-sky-700",
    economy: "bg-violet-50 text-violet-700",
    foundation: "bg-orange-50 text-orange-700",
    accelerator: "bg-amber-50 text-amber-700",
    comprehensive: "bg-amber-50 text-amber-700",
  };
  return colors[category] || "bg-primary-50 text-primary-700";
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
