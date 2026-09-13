import { describe, expect, it } from "vitest"
import { importInputSchema } from "@/lib/import-contract"

describe("importInputSchema", () => {
  it("accepts a bounded import", () => {
    expect(importInputSchema.safeParse({ rawText: "a valid imported game log", title: "League match" }).success).toBe(true)
  })

  it("rejects unknown fields and oversized raw text", () => {
    expect(importInputSchema.safeParse({ rawText: "a valid imported game log", userId: "forged" }).success).toBe(false)
    expect(importInputSchema.safeParse({ rawText: "x".repeat(262_145) }).success).toBe(false)
  })

  it("rejects oversized parsed data", () => {
    expect(importInputSchema.safeParse({ rawText: "a valid imported game log", parsed: { value: "x".repeat(262_145) } }).success).toBe(false)
  })
})

