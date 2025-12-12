import { z } from 'zod';

export const ReviewRequestSchema = z.object({
  userId: z.string().uuid(),
  cardId: z.string().uuid(),
  quality: z.number().int().min(0).max(5),
  timeSpent: z.number().int().nonnegative(),
  correct: z.boolean(),
  pointsEarned: z.number().int().nonnegative(),
  reviewId: z.string().uuid().optional()
});

export const ReviewResponseSchema = z.object({
  srsData: z.object({
    cardId: z.string().uuid(),
    userId: z.string().uuid(),
    ease: z.number(),
    interval: z.number(),
    repetitions: z.number().int(),
    lastReview: z.string().datetime(),
    nextReview: z.string().datetime(),
    quality: z.number()
  }),
  points: z.number().int().nonnegative(),
  mastery: z.number().min(0).max(100)
});

export const AIProxyRequestSchema = z.object({
  model: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string()
    })
  ),
  temperature: z.number().optional(),
  max_tokens: z.number().optional(),
  max_output_tokens: z.number().optional()
});

export const AIProxyResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({ content: z.string() })
    })
  ),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number()
  })
});

export type ReviewRequestPayload = z.infer<typeof ReviewRequestSchema>;
export type ReviewResponsePayload = z.infer<typeof ReviewResponseSchema>;
export type AIProxyRequestPayload = z.infer<typeof AIProxyRequestSchema>;
export type AIProxyResponsePayload = z.infer<typeof AIProxyResponseSchema>;
