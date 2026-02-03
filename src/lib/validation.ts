import { z } from 'zod';

// Auth schemas - Twitter verification flow
export const getVerificationCodeSchema = z.object({});

export const verifyTweetSchema = z.object({
  tweetUrl: z
    .string()
    .url('Invalid URL')
    .regex(
      /^https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/,
      'Must be a valid Twitter/X tweet URL'
    ),
  code: z.string().min(1, 'Verification code is required'),
});

export const loginSchema = z.object({
  twitterHandle: z
    .string()
    .min(1, 'Twitter handle is required')
    .regex(/^@?[\w]{1,15}$/, 'Invalid Twitter handle'),
});

// Bot schemas
export const createBotSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name must be at most 50 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Name can only contain letters, numbers, spaces, hyphens, and underscores'),
});

// Qualification schemas
export const startQualificationSchema = z.object({
  botId: z.string().cuid('Invalid bot ID'),
});

export const submitQualificationSchema = z.object({
  botId: z.string().cuid('Invalid bot ID'),
  promptId: z.string().uuid('Invalid prompt ID'), // Changed from cuid to uuid
  humanResponse: z
    .string()
    .min(1, 'Human response is required')
    .max(400, 'Response must be at most 400 characters (short paragraph only)'),
  botResponse: z
    .string()
    .min(1, 'Bot response is required')
    .max(400, 'Response must be at most 400 characters (short paragraph only)'),
});

// Arena schemas
export const arenaMatchSchema = z.object({
  matchId: z.string().cuid('Invalid match ID'),
});

// Arena compete - no body needed, uses auth token
export const arenaCompeteSchema = z.object({});

// Arena respond - bot submits their response
export const arenaRespondSchema = z.object({
  response: z
    .string()
    .min(1, 'Response is required')
    .max(400, 'Response must be at most 400 characters'),
});

// Judge vote - judge submits their verdict
export const judgeVoteSchema = z.object({
  matchId: z.string().cuid('Invalid match ID'),
  vote: z.enum(['a', 'b'], { message: 'Vote must be "a" or "b"' }),
  reasoning: z
    .string()
    .min(10, 'Reasoning must be at least 10 characters')
    .max(1000, 'Reasoning must be at most 1000 characters'),
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
export type VerifyTweetInput = z.infer<typeof verifyTweetSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateBotInput = z.infer<typeof createBotSchema>;
export type StartQualificationInput = z.infer<typeof startQualificationSchema>;
export type SubmitQualificationInput = z.infer<typeof submitQualificationSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type ArenaRespondInput = z.infer<typeof arenaRespondSchema>;
export type JudgeVoteInput = z.infer<typeof judgeVoteSchema>;

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
