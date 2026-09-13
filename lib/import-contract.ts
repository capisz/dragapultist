import { z } from "zod"

const MAX_IMPORT_BYTES = 262_144

function jsonByteLength(value: unknown) {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8")
  } catch {
    return Number.POSITIVE_INFINITY
  }
}

export const importInputSchema = z
  .object({
    rawText: z.string().trim().min(10).refine((value) => Buffer.byteLength(value, "utf8") <= MAX_IMPORT_BYTES),
    title: z.string().trim().min(1).max(120).nullable().optional(),
    parsed: z.unknown().refine((value) => jsonByteLength(value) <= MAX_IMPORT_BYTES).optional(),
  })
  .strict()

