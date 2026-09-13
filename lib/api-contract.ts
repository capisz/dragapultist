import { z } from "zod"

export const apiErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "SESSION_EXPIRED",
  "FORBIDDEN",
  "NOT_FOUND",
  "REVISION_CONFLICT",
  "RATE_LIMITED",
  "UNAVAILABLE",
  "INTERNAL_ERROR",
])

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>

export const apiErrorSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string().min(1).max(240),
    retryable: z.boolean(),
    requestId: z.string().min(1).max(128).optional(),
    fieldErrors: z.record(z.array(z.string().max(160))).optional(),
  }).strict(),
}).strict()

export type ApiErrorEnvelope = z.infer<typeof apiErrorSchema>

export const persistenceStateSchema = z.enum([
  "idle",
  "loading",
  "saving",
  "saved",
  "unavailable",
  "validation_error",
  "unauthorized",
  "expired",
  "conflict",
  "retryable_failure",
])

export type PersistenceState = z.infer<typeof persistenceStateSchema>

export function errorEnvelope(code: ApiErrorCode, message: string, retryable = false, requestId?: string): ApiErrorEnvelope {
  return { error: { code, message, retryable, ...(requestId ? { requestId } : {}) } }
}

