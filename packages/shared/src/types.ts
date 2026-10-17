// ─── Enums ────────────────────────────────────────────────────────────────────
export type Role = 'STUDENT' | 'SUPPORT_MANAGER' | 'CONTENT_MANAGER' | 'SUPER_ADMIN';
export type Plan = 'FREE' | 'PAID';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export type AnnouncementType = 'TEXT' | 'VIDEO';
export type TicketType = 'BUG_REPORT' | 'PAYMENT_ISSUE' | 'CONTENT_QUERY' | 'GENERAL';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export type VideoStatus = 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';
export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type EnrollmentSource = 'PURCHASE' | 'FREE' | 'ADMIN_GRANT';

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

export interface LectureSummary {
  id: string;
  sectionId: string;
  title: string;
  description?: string | null;
  order: number;
  durationSec: number;
  status: VideoStatus;
  isFreePreview: boolean;
  createdAt: string;
  updatedAt: string;
  // NOTE: videoId is deliberately omitted for security
}

export interface SectionWithLectures {
  id: string;
  courseId: string;
  title: string;
  order: number;
  lectures: LectureSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface CourseSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  shortDescription?: string | null;
  category: string;
  level: CourseLevel;
  thumbnailKey?: string | null;
  previewVideoId?: string | null;
  priceInPaise: number;
  isPublished: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  totalLectures?: number;
  totalDurationSec?: number;
}

export interface CourseDetail extends CourseSummary {
  sections: SectionWithLectures[];
  isEnrolled?: boolean;
  userProgress?: {
    completedLectureIds: string[];
    percentComplete: number;
    lastWatchedLectureId?: string | null;
  };
}

export interface PlaybackAuthResponse {
  embedUrl: string;
  expiresAt: number;
  resumePositionSec: number;
  lecture: {
    id: string;
    title: string;
    durationSec: number;
    isFreePreview: boolean;
  };
  next?: { id: string; title: string } | null;
  prev?: { id: string; title: string } | null;
}

export interface LectureProgress {
  userId: string;
  lectureId: string;
  positionSec: number;
  completed: boolean;
  updatedAt: string;
}

export interface EnrollmentStatus {
  id: string;
  enrolled: boolean;
  courseId: string;
  source: EnrollmentSource;
  revokedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  order?: number;
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
  planExpiresAt?: string | null;
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
