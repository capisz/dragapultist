/**
 * Probability of drawing ZERO successes when drawing n cards
 * from deck size N with K successes (outs).
 */
export function probNoHit(N: number, K: number, n: number) {
  const draws = Math.min(Math.max(0, n), Math.max(0, N))
  const outs = Math.min(Math.max(0, K), Math.max(0, N))
  if (draws === 0) return 1
  if (N <= 0) return 1
  if (outs <= 0) return 1
  if (outs >= N) return 0

  let p = 1
  for (let i = 0; i < draws; i++) {
    p *= (N - outs - i) / (N - i)
  }
  return Math.max(0, Math.min(1, p))
}

export function probAtLeastOne(N: number, K: number, n: number) {
  return 1 - probNoHit(N, K, n)
}
