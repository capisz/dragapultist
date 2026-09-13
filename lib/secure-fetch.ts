"use client"

export async function secureJsonFetch(path: string, init: RequestInit = {}) {
  const csrfResponse = await fetch("/api/auth/session", { cache: "no-store", signal: init.signal })
  const csrf = await csrfResponse.json().catch(() => null)
  if (!csrfResponse.ok || typeof csrf?.csrfToken !== "string") throw new Error("Could not start a secure request.")
  const headers = new Headers(init.headers)
  headers.set("X-CSRF-Token", csrf.csrfToken)
  if (init.body !== undefined && !headers.has("Content-Type")) headers.set("Content-Type", "application/json")
  return fetch(path, { ...init, headers })
}
