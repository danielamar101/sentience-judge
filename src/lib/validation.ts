import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Bot schemas
export const createBotSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name must be at most 50 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Name can only contain letters, numbers, spaces, hyphens, and underscores'),
  systemPrompt: z
    .string()
    .min(10, 'System prompt must be at least 10 characters')
    .max(2000, 'System prompt must be at most 2000 characters'),
});

// Qualification schemas
export const startQualificationSchema = z.object({
  botId: z.string().cuid('Invalid bot ID'),
});

export const submitQualificationSchema = z.object({
  botId: z.string().cuid('Invalid bot ID'),
  promptId: z.string().cuid('Invalid prompt ID'),
  humanResponse: z
    .string()
    .min(1, 'Response is required')
    .max(2000, 'Response must be at most 2000 characters'),
});

// Arena schemas
export const arenaMatchSchema = z.object({
  matchId: z.string().cuid('Invalid match ID'),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ID param schema
export const idParamSchema = z.object({
  id: z.string().cuid('Invalid ID'),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateBotInput = z.infer<typeof createBotSchema>;
export type StartQualificationInput = z.infer<typeof startQualificationSchema>;
export type SubmitQualificationInput = z.infer<typeof submitQualificationSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;

// Validation helper
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues || [];
    const errors = issues.map((e: { message: string }) => e.message).join(', ');
    throw new Error(errors);
  }
  return result.data;
}

// Safe parse helper that returns validation errors
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const issues = result.error.issues || [];
  return {
    success: false,
    errors: issues.map((e: { message: string }) => e.message),
  };
}
