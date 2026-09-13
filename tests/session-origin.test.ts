import { afterEach, describe, expect, it } from "vitest"
import { assertTrustedOrigin } from "@/lib/session"

const originalAppOrigin = process.env.APP_ORIGIN

afterEach(() => {
  if (originalAppOrigin === undefined) delete process.env.APP_ORIGIN
  else process.env.APP_ORIGIN = originalAppOrigin
})

describe("assertTrustedOrigin", () => {
  it("accepts a same-origin mutation", () => {
    const request = new Request("http://localhost:3000/api/games", { headers: { origin: "http://localhost:3000" } })
    expect(() => assertTrustedOrigin(request)).not.toThrow()
  })

  it("rejects a cross-origin mutation", () => {
    const request = new Request("http://localhost:3000/api/games", { headers: { origin: "https://attacker.example" } })
    expect(() => assertTrustedOrigin(request)).toThrow("Untrusted request origin")
  })

  it("rejects a mutation without an Origin header", () => {
    const request = new Request("http://localhost:3000/api/games")
    expect(() => assertTrustedOrigin(request)).toThrow("Missing request origin")
  })

  it("allows the explicitly configured application origin", () => {
    process.env.APP_ORIGIN = "https://dragapultist.example"
    const request = new Request("http://internal:3000/api/games", {
      headers: { origin: "https://dragapultist.example" },
    })
    expect(() => assertTrustedOrigin(request)).not.toThrow()
  })
})
