import { z } from "zod";

/** Shape of GET /api/health, shared by the route and the client indicator. */
export const AiHealthSchema = z.object({
  reachable: z.boolean(),
  model: z.string(),
  modelAvailable: z.boolean(),
  error: z.string().optional(),
});

export const HealthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  ai: AiHealthSchema,
});

export type AiHealth = z.infer<typeof AiHealthSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
