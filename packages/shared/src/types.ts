// ─── Enums ────────────────────────────────────────────────────────────────────
export type Role = 'STUDENT' | 'SUPPORT_MANAGER' | 'CONTENT_MANAGER' | 'SUPER_ADMIN';
export type Plan = 'FREE' | 'PAID';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export type AnnouncementType = 'TEXT' | 'VIDEO';
export type TicketType = 'BUG_REPORT' | 'PAYMENT_ISSUE' | 'CONTENT_QUERY' | 'GENERAL';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

// ─── Core Models ─────────────────────────────────────────────────────────────
export interface User {
  id: string;
  userId: string; // same as id, alias used by JWT payload
  name: string;
  email: string;
  role: Role;
  plan: Plan;
  planExpiresAt: string | null;
  paidAt: string | null;        // ISO string — set once on first payment, never cleared
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  nameMarathi?: string;
  order: number;
}

export interface Note {
  id: string;
  title: string;
  description?: string | null;
  courseId?: string | null;
  lectureId?: string | null;
  isPaid: boolean;
  pageCount?: number | null;
  thumbnailKey?: string | null;
  createdAt: string;
  updatedAt: string;
  // NOTE: fileKey is NEVER sent to client
}

export interface Announcement {
  id: string;
  title: string;
  description?: string;
  type: AnnouncementType;
  youtubeUrl?: string;
  imageKey?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  amount: number; // paise
  status: PaymentStatus;
  planDuration?: number | null; // days
  productType?: string | null;  // 'PLAN' | 'COURSE'
  courseId?: string | null;
  createdAt: string;
}

// ─── JWT Payload ──────────────────────────────────────────────────────────────
export interface JwtPayload {
  userId: string;
  role: Role;
  plan: Plan;
  iat?: number;
  exp?: number;
}

// ─── Role helpers ─────────────────────────────────────────────────────────────
export const ADMIN_ROLES: Role[] = ['SUPER_ADMIN', 'CONTENT_MANAGER', 'SUPPORT_MANAGER'];
export const isAdmin = (role: Role) => ADMIN_ROLES.includes(role);
export const isSuperAdmin = (role: Role) => role === 'SUPER_ADMIN';

// ─── API Response wrappers ────────────────────────────────────────────────────
export interface ApiSuccess<T> {
  data: T;
}

export interface ApiError {
  error: string;
  details?: unknown;
}
