import { UserRole, UserStatus, RegistrationStatus } from "@prisma/client";

// 基础类型
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  phone?: string;
  title?: string;
  bio?: string;
  role: UserRole;
  status: UserStatus;
  passCode: string;
  emailVerified?: Date;
  organization?: Organization;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  logo?: string;
  website?: string;
  description?: string;
  industry?: string;
  size?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

// 赛道类型
export interface Track {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  description: string;
  descriptionEn?: string;
  category: "institution" | "economy" | "foundation" | "accelerator";
  color: string;
  icon: string;
  partners?: string[];
  partnersEn?: string[];
  order: number;
  events?: Event[];
}

// 活动类型
export interface Event {
  id: string;
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  shortDesc?: string;
  shortDescEn?: string;
  date: Date;
  startTime: string;
  endTime: string;
  venue: string;
  venueEn?: string;
  address?: string;
  city?: string;
  cityEn?: string;
  image?: string;
  type: "forum" | "workshop" | "ceremony" | "conference" | "networking";
  trackId?: string;
  track?: Track;
  partners?: string[];
  partnersEn?: string[];
  maxAttendees?: number;
  isPublished: boolean;
  isFeatured: boolean;
  _count?: {
    registrations: number;
  };
}

// 议程类型
export interface AgendaItem {
  id: string;
  eventId: string;
  startTime: string;
  endTime: string;
  title: string;
  description?: string;
  type: "keynote" | "panel" | "workshop" | "break" | "networking";
  venue?: string;
  speakers?: Speaker[];
  order: number;
}

// 嘉宾类型
export interface Speaker {
  id: string;
  name: string;
  nameEn?: string;
  avatar?: string;
  title: string;
  organization: string;
  organizationLogo?: string;
  bio?: string;
  email?: string;
  linkedin?: string;
  twitter?: string;
  website?: string;
  isKeynote: boolean;
}

// 报名类型
export interface Registration {
  id: string;
  userId: string;
  eventId: string;
  status: RegistrationStatus;
  notes?: string;
  dietaryReq?: string;
  user?: User;
  event?: Event;
  createdAt: Date;
}

// 入场记录类型
export interface CheckIn {
  id: string;
  userId: string;
  eventId?: string;
  scannedBy: string;
  scannedAt: Date;
  method: "QR_CODE" | "MANUAL";
  user?: User;
  event?: Event;
}

// 赞助商类型
export interface Sponsor {
  id: string;
  name: string;
  logo: string;
  website?: string;
  description?: string;
  tier: "platinum" | "gold" | "silver" | "bronze" | "partner";
  order: number;
}

// 新闻类型
export interface News {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  coverImage?: string;
  isPublished: boolean;
  publishedAt?: Date;
  views: number;
}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 表单类型
export interface LoginFormData {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  title?: string;
  role: UserRole;
  organization?: {
    name: string;
    industry?: string;
    website?: string;
  };
}

export interface ForgotPasswordFormData {
  email: string;
}

export interface ResetPasswordFormData {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface UpdateProfileFormData {
  name?: string;
  phone?: string;
  title?: string;
  bio?: string;
  avatar?: string;
}

// 统计数据类型
export interface DashboardStats {
  totalUsers: number;
  totalEvents: number;
  totalRegistrations: number;
  totalCheckIns: number;
  todayCheckIns: number;
}
