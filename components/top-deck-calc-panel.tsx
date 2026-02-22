"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type Copies = 1 | 2 | 3 | 4

function clampInt(v: number, min: number, max: number) {
  if (!Number.isFinite(v)) return min
  return Math.max(min, Math.min(max, Math.trunc(v)))
}

/**
 * Probability of drawing ZERO successes when drawing n cards
 * from deck size N with K successes (outs).
 */
function probNoHit(N: number, K: number, n: number) {
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

function probAtLeastOne(N: number, K: number, n: number) {
  return 1 - probNoHit(N, K, n)
}

function pct(p: number) {
  return `${(p * 100).toFixed(1)}%`
}

export function TopDeckCalcPanel() {
  // keep as TEXT while typing so deleting doesn't force a fallback number
  const [deckRemainingText, setDeckRemainingText] = useState<string>("40")
  const [resetPressed, setResetPressed] = useState(false)
  const [copiesA, setCopiesA] = useState<Copies>(3)
  const [showSecond, setShowSecond] = useState(false)
  const [copiesB, setCopiesB] = useState<Copies>(2)

  const draws = [1, 2, 3, 4, 5, 6, 7]

  const inputClass = cn(
    "h-10 rounded-2xl",
    "bg-slate-100/90 text-slate-900 placeholder:text-slate-400",
    "border border-slate-100 shadow-[0_0_22px_rgba(42,81,128,0.08)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/35 focus-visible:ring-offset-0",
    "dark:bg-slate-500/50 dark:text-white dark:placeholder:text-slate-200/70",
    "dark:border-slate-600 dark:shadow-[0_0_32px_rgba(56,189,248,0.08)]",
    "dark:focus-visible:ring-slate-300/70",
  )

 const copyOptionBase = cn(
  "h-10 w-10 rounded-xl text-sm font-semibold tabular-nums",
  "transition-colors",
  // light (unselected)
  "bg-slate-200/60 text-slate-800 hover:bg-slate-200/80",
  // dark (unselected)
  "dark:bg-white/10 dark:text-slate-50 dark:hover:bg-white/15",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60 dark:focus-visible:ring-sky-200/40",
)

const copyOptionSelected = cn(
  // light (selected) — your blue button style
  "bg-[#5e82ab] text-slate-50 hover:bg-sky-800/50",
  // dark (selected) — your pale blue button style
  "dark:bg-[#b1cce8] dark:text-[#121212] dark:hover:bg-[#a1c2e4]",
  
)

  const deckRemainingNum = useMemo(() => {
    const n = parseInt(deckRemainingText, 10)
    return Number.isFinite(n) ? n : 0
  }, [deckRemainingText])

  const normalized = useMemo(() => {
    // allow empty while editing; on blur we clamp back to 1..60
    const N = deckRemainingText === "" ? 0 : clampInt(deckRemainingNum, 1, 60)

    const KA = N > 0 ? Math.min(copiesA, N) : 0
    // keep disjoint outs sane; if deck is tiny, B effectively becomes 0
    const KB = showSecond && N > 0 ? Math.min(copiesB, Math.max(0, N - KA)) : 0

    return { N, KA, KB }
  }, [deckRemainingText, deckRemainingNum, copiesA, copiesB, showSecond])

  const results = useMemo(() => {
    const { N, KA, KB } = normalized

    return draws.map((n) => {
      if (N <= 0) {
        return {
          n,
          pA: null as number | null,
          pB: null as number | null,
          pEither: null as number | null,
          pBoth: null as number | null,
        }
      }

      const pA = KA > 0 ? probAtLeastOne(N, KA, n) : 0
      const pB = KB > 0 ? probAtLeastOne(N, KB, n) : 0

      let pBoth = 0
      if (KB > 0 && KA > 0) {
        // P(A and B) = 1 - P(noA) - P(noB) + P(noA and noB)
        const pNoA = probNoHit(N, KA, n)
        const pNoB = probNoHit(N, KB, n)
        const pNoAB = probNoHit(N, KA + KB, n)
        pBoth = Math.max(0, Math.min(1, 1 - pNoA - pNoB + pNoAB))
      }

      const pEither = KB > 0 ? Math.max(0, Math.min(1, pA + pB - pBoth)) : null

      return {
        n,
        pA,
        pB: KB > 0 ? pB : null,
        pEither,
        pBoth: KB > 0 ? pBoth : null,
      }
    })
  }, [normalized])

  const cols = showSecond ? "grid-cols-5" : "grid-cols-2"
  const fmt = (p: number | null) => (p == null ? "—" : pct(p))

  return (
  <div className="space-y-4">
    {/* Header OUTSIDE the box (like your last pasted version) */}
    <header className="space-y-1">
      <h2 className="text-xl font-semibold tracking-tight text-slate-700/80 dark:text-sky-100">
        Top Deck Calculator
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
        Estimate the odds of drawing one (or two) specific cards in your next 1–7 draws based on your
        current deck size remaining.
      </p>
    </header>

    {/* Form box */}
    <div
      className={cn(
        "rounded-3xl p-4 md:p-5",
        "bg-white/30 border border-slate-200/50 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-sm",
        "dark:bg-[#162638]/55 dark:border-slate-700/35 dark:shadow-[0_18px_45px_rgba(0,0,0,0.25)]",
      )}
    
    > {/* Prize Mapper-style header */}
      <div className="flex flex-col md:flex-row gap-4 md:items-start">
        {/* Left: cards remaining */}
        <div className="md:w-52 shrink-0 space-y-1">
          <div className="text-xs font-medium text-slate-600 dark:text-slate-200/80">
            Cards remaining (1–60)
          </div>

          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="40"
            value={deckRemainingText}
            onChange={(e) => {
              const next = e.target.value.replace(/[^\d]/g, "")
              setDeckRemainingText(next)
            }}
            onBlur={() => {
              const n = parseInt(deckRemainingText, 10)
              const clamped = clampInt(Number.isFinite(n) ? n : 0, 1, 60)
              setDeckRemainingText(String(clamped))
            }}
            className={cn(inputClass, "w-32")}
          />

          <div className="text-[11px] text-slate-500 dark:text-slate-200/60">
            Current deck size remaining.
          </div>
        </div>

        {/* Right: Card A / Card B + Reset aligned */}
        <div className="flex-1 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            {/* A + B sit side-by-side when enabled */}
            <div className="grid gap-4 md:gap-6 sm:grid-cols-2">

             {/* Card A */}
<div className="space-y-1">
  <div className="text-xs font-medium text-slate-600 dark:text-slate-200/80">
    Card A copies remaining (1–4)
  </div>

  <div className="flex items-center gap-2">
    {[1, 2, 3, 4].map((n) => {
      const selected = copiesA === n
      return (
        <button
          key={`A-${n}`}
          type="button"
          onClick={() => setCopiesA(n as Copies)}
          className={cn(copyOptionBase, selected && copyOptionSelected)}
          aria-pressed={selected}
        >
          {n}
        </button>
      )
    })}
  </div>

  {/* reserve space so the row height matches Card B (prevents subtle shifts) */}
  <div className="text-[11px] text-slate-500 dark:text-slate-200/60 min-h-[16px]" />
</div>

{/* Card B (always rendered; content swaps) */}
<div className="space-y-1">
  <div className="text-xs font-medium text-slate-600 dark:text-slate-200/80">
    Card B copies remaining (1–4)
  </div>

  <div className="flex items-center gap-2">
    {showSecond ? (
      <>
        {[1, 2, 3, 4].map((n) => {
          const selected = copiesB === n
          return (
            <button
              key={`B-${n}`}
              type="button"
              onClick={() => setCopiesB(n as Copies)}
              className={cn(copyOptionBase, selected && copyOptionSelected)}
              aria-pressed={selected}
            >
              {n}
            </button>
          )
        })}

        <button
          type="button"
          onClick={() => setShowSecond(false)}
          className={cn(copyOptionBase, "flex items-center justify-center")}
          aria-label="Remove second card"
          title="Remove second card"
        >
          –
        </button>
      </>
    ) : (
      <button
        type="button"
        onClick={() => setShowSecond(true)}
        className={cn(copyOptionBase, "flex items-center justify-center")}
        aria-label="Add a second card"
        title="Add a second card"
      >
        +
      </button>
    )}
  </div>

  <div className="text-[11px] text-slate-500 dark:text-slate-200/60 min-h-[16px]">
    {showSecond ? "If A + B outs exceed deck remaining, B is capped." : ""}
  </div>
</div>

              
            </div>

            {/* Reset */}
            <Button
              type="button"
              variant="secondary"
              onMouseDown={() => setResetPressed(true)}
              onMouseUp={() => setResetPressed(false)}
              onMouseLeave={() => setResetPressed(false)}
              onClick={() => {
                setDeckRemainingText("40")
                setCopiesA(3)
                setShowSecond(false)
                setCopiesB(2)
              }}
              className={cn(
                "rounded-full h-9 px-4 text-sm transition-transform duration-150 shrink-0",
                "bg-[#5e82ab] text-slate-50 hover:bg-sky-800/50",
                "dark:bg-[#b1cce8] dark:text-[#121212] dark:hover:bg-[#a1c2e4]",
                resetPressed ? "scale-95" : "scale-100",
              )}
            >
              Reset
            </Button>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-black/5 dark:bg-white/10 px-3 py-1 text-slate-700 dark:text-slate-100">
              Deck remaining: <span className="font-semibold">{normalized.N || "—"}</span>
            </span>
            <span className="rounded-full bg-black/5 dark:bg-white/10 px-3 py-1 text-slate-700 dark:text-slate-100">
              A outs: <span className="font-semibold">{normalized.KA}</span>
            </span>
            {showSecond && (
              <span className="rounded-full bg-black/5 dark:bg-white/10 px-3 py-1 text-slate-700 dark:text-slate-100">
                B outs: <span className="font-semibold">{normalized.KB}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Results (leave your existing results block exactly as-is below) */}
<div className={cn("mt-4 rounded-3xl overflow-hidden", "bg-slate-100/70 dark:bg-white/[0.06]")}>
        <div className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-50">
          Odds in the next N draws
        </div>

        <div className={cn("px-4 pb-2 text-[11px] text-slate-600 dark:text-slate-200/75")}>
          <div className={cn("grid items-center gap-3", cols)}>
            <div />
            <div className="text-right">Card A</div>
            {showSecond && <div className="text-right">Card B</div>}
            {showSecond && <div className="text-right">Either</div>}
            {showSecond && <div className="text-right">Both</div>}
          </div>
        </div>

        <div className="px-2 pb-2">
          <div className="rounded-2xl overflow-hidden">
            {results.map((r, idx) => (
  <div
    key={r.n}
    className={cn(
      "grid items-center gap-3 px-4 py-3 text-sm",
      cols,
      "text-slate-800 dark:text-slate-100",
      "border-t border-black/5 dark:border-white/10",
      idx % 2 === 0 ? "bg-transparent dark:bg-white/[0.03]" : "bg-black/5 dark:bg-white/[0.07]",
      "hover:bg-black/10 dark:hover:bg-white/[0.12] transition-colors",
    )}
  >

                <div className="font-medium tabular-nums">Draw {r.n}</div>
                <div className="text-right tabular-nums font-semibold">{fmt(r.pA)}</div>

                {showSecond && (
                  <>
                    <div className="text-right tabular-nums font-semibold">{fmt(r.pB)}</div>
                    <div className="text-right tabular-nums font-semibold">{fmt(r.pEither)}</div>
                    <div className="text-right tabular-nums font-semibold">{fmt(r.pBoth)}</div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 pb-4 text-[11px] text-slate-600 dark:text-slate-200/70">
          “Either” = at least one copy of A or at least one copy of B within the next N draws.
          <br />
          “Both” = at least one copy of A and at least one copy of B within the next N draws.
        </div>
      </div>
    </div>
  </div>
)

}
