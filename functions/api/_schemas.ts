/**
 * Family Memory — Zod Validation Schemas
 */
import { z } from 'zod';

// --------------- Recipients ---------------
export const createRecipientSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  relationship: z.string().max(50).default('family'),
  generation: z.enum(['grandparent', 'parent', 'sibling', 'child', 'extended']).default('parent'),
  notes: z.string().max(500).optional().nullable(),
});

export const updateRecipientSchema = createRecipientSchema.partial().extend({
  active: z.number().int().min(0).max(1).optional(),
});

// --------------- Questions ---------------
export const createQuestionSchema = z.object({
  text: z.string().min(10).max(500),
  theme: z.enum(['childhood', 'family', 'career', 'wisdom', 'traditions']),
  follow_up: z.string().max(500).optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
});

export const updateQuestionSchema = createQuestionSchema.partial().extend({
  active: z.number().int().min(0).max(1).optional(),
});

// --------------- Assignments ---------------
export const createAssignmentSchema = z.object({
  recipient_id: z.number().int().positive(),
  question_id: z.number().int().positive(),
  expiry_days: z.number().int().min(1).max(90).default(14),
});

// --------------- Responses ---------------
export const textResponseSchema = z.object({
  text: z.string().min(1).max(10000),
});

export const uploadUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  content_type: z.string().regex(/^(audio|image)\//),
  size: z.number().int().positive().max(100 * 1024 * 1024), // 100MB max
});

export const completeUploadSchema = z.object({
  r2_key: z.string().min(1),
  type: z.enum(['audio', 'photo']),
  file_size: z.number().int().positive().optional(),
  duration_seconds: z.number().positive().optional(),
  mime_type: z.string().optional(),
});

// --------------- Admin Auth ---------------
export const pinSchema = z.object({
  pin: z.string().length(4).regex(/^\d{4}$/),
});

// --------------- Response Annotation ---------------
export const annotateResponseSchema = z.object({
  admin_notes: z.string().max(2000).optional().nullable(),
  flagged: z.number().int().min(0).max(1).optional(),
});
