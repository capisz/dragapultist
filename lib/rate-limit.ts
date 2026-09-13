type Bucket = { startedAt: number; count: number }

const buckets = new Map<string, Bucket>()

/** Per-process abuse guard. Production should add a shared edge/gateway limit. */
export function allowRequest(key: string, maximum: number, windowMs: number, now = Date.now()) {
  const bucket = buckets.get(key)
  if (!bucket || now - bucket.startedAt >= windowMs) {
    buckets.set(key, { startedAt: now, count: 1 })
    return true
  }
  if (bucket.count >= maximum) return false
  bucket.count += 1
  return true
}

export function resetRateLimitsForTests() {
  buckets.clear()
}
