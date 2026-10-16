import { z } from 'zod';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const RegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const GoogleAuthSchema = z.object({
  idToken: z.string().min(1),
});

// ─── Notes ────────────────────────────────────────────────────────────────────
export const CreateNoteSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  courseId: z.string().cuid().optional(),
  lectureId: z.string().cuid().optional(),
  isPaid: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === 'true')
    .default(false),
});

// ─── Payments ─────────────────────────────────────────────────────────────────
export const CreateOrderSchema = z.object({
  planDuration: z.enum(['30', '180', '365']), // days as string from form
});

export const VerifyPaymentSchema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

// ─── Admin ────────────────────────────────────────────────────────────────────
export const UpdateUserPlanSchema = z.object({
  plan: z.enum(['FREE', 'PAID']),
  planDuration: z.number().int().min(1).optional(), // days, required if plan=PAID
});

// ─── Support & Help Center ────────────────────────────────────────────────────
export const CreateTicketSchema = z.object({
  type: z.enum(['BUG_REPORT', 'PAYMENT_ISSUE', 'CONTENT_QUERY', 'GENERAL']).default('GENERAL'),
  subject: z.string().min(5).max(100),
  message: z.string().min(10).max(2000),
});

export const ReplyTicketSchema = z.object({
  message: z.string().min(1).max(2000),
});

export const CreateFAQSchema = z.object({
  question: z.string().min(5),
  answer: z.string().min(5),
  category: z.string().min(2),
  order: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const UpdateFAQSchema = CreateFAQSchema.partial();

// ─── Courses & Curriculum ─────────────────────────────────────────────────────
export const CourseQuerySchema = z.object({
  category: z.string().optional(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const CreateCourseSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().min(10),
  shortDescription: z.string().max(300).optional(),
  category: z.string().min(2),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
  priceInPaise: z.number().int().min(0),
  isPublished: z.boolean().default(false),
  previewVideoId: z.string().optional(),
});

export const UpdateCourseSchema = CreateCourseSchema.partial();

export const CreateSectionSchema = z.object({
  title: z.string().min(2).max(200),
  order: z.number().int().default(0),
});

export const UpdateSectionSchema = CreateSectionSchema.partial();

export const CreateLectureSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().optional(),
  order: z.number().int().default(0),
  isFreePreview: z.boolean().default(false),
});

export const UpdateLectureSchema = CreateLectureSchema.partial().extend({
  videoId: z.string().optional(),
  durationSec: z.number().int().min(0).optional(),
  status: z.enum(['UPLOADING', 'PROCESSING', 'READY', 'FAILED']).optional(),
});

export const UpdateLectureProgressSchema = z.object({
  positionSec: z.number().int().min(0),
  completed: z.boolean().optional(),
});

// ─── Inferred types ───────────────────────────────────────────────────────────
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type GoogleAuthInput = z.infer<typeof GoogleAuthSchema>;
export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof VerifyPaymentSchema>;
export type UpdateUserPlanInput = z.infer<typeof UpdateUserPlanSchema>;
export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;
export type ReplyTicketInput = z.infer<typeof ReplyTicketSchema>;
export type CreateFAQInput = z.infer<typeof CreateFAQSchema>;
export type UpdateFAQInput = z.infer<typeof UpdateFAQSchema>;
export type CourseQueryInput = z.infer<typeof CourseQuerySchema>;
export type CreateCourseInput = z.infer<typeof CreateCourseSchema>;
export type UpdateCourseInput = z.infer<typeof UpdateCourseSchema>;
export type CreateSectionInput = z.infer<typeof CreateSectionSchema>;
export type UpdateSectionInput = z.infer<typeof UpdateSectionSchema>;
export type CreateLectureInput = z.infer<typeof CreateLectureSchema>;
export type UpdateLectureInput = z.infer<typeof UpdateLectureSchema>;
export type UpdateLectureProgressInput = z.infer<typeof UpdateLectureProgressSchema>;

