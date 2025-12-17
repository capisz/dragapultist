// components/prize-mapper-panel.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import type { GameSummary } from "@/types/game"
import { cn } from "@/lib/utils"
import {
  ARCHETYPE_RULES,
  canonicalizeArchetypeId,
  formatArchetypeLabel,
  getArchetypeIconCandidatePaths,
  inferArchetypesForSummary,
} from "@/utils/archetype-mapping"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

type GameWithUsername = GameSummary & {
  username?: string
  opponent?: string
  opponentName?: string
  opponentUsername?: string
}

type PrizePathStat = {
  key: string
  sequence: string[]
  count: number
  percentOfWins: number
}

type MatchupRow = {
  opponentId: string | null
  globalGames: number
  globalWins: number
  personalGames: number
  personalWins: number
  topPaths: PrizePathStat[]
  allPaths: PrizePathStat[]
}

const MIN_MATCHUP_GAMES_FOR_CONFIDENCE = 3
const MIN_PATH_WINS = 2
const MIN_PATH_SHARE = 0.12

// Use your requested “unknown/other” fallback sprite.
const FALLBACK_ICON = "/sprites/substitute.png"

function normalizeLoose(input: string): string {
  return input
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function safeStrArray(maybe: unknown): string[] {
  if (Array.isArray(maybe)) return maybe.filter((x) => typeof x === "string") as string[]
  return []
}

function uniquePreserveOrder(values: string[]) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of values) {
    if (!v || seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out
}

function stripOwnerPrefix(name: string): string {
  // "capisz’s Frillish" / "CShepS's Budew" -> "Frillish" / "Budew"
  return name.replace(/^[^'’]+['’]s\s+/i, "").trim()
}

/**
 * Parse raw log and return KO victim order for the player who is taking prizes.
 * We only count a KO if the winner takes at least one Prize card immediately after that KO.
 */
function deriveWinnerKOSequenceFromRawLog(rawLog: string, winnerName: string): string[] {
  if (!rawLog || !winnerName) return []

  const winnerNorm = normalizeLoose(winnerName)
  if (!winnerNorm) return []

  const lines = rawLog.split(/\r?\n/)
  const seq: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // "CShepS's Budew was Knocked Out!"
    // "capisz’s Frillish was Knocked Out!"
    let m = line.match(/^(.+?)['’]s\s+(.+?)\s+was Knocked Out!/i)
    if (!m) {
      // fallback: "Budew was Knocked Out!"
      const m2 = line.match(/^(.+?)\s+was Knocked Out!/i)
      if (!m2) continue
      m = ["", "", m2[1]]
    }

    const victimRaw = (m[2] ?? "").trim()
    if (!victimRaw) continue

    // Look ahead briefly for "X took a Prize card."
    let prizeTakenByWinner = false
    for (let j = i + 1; j < Math.min(lines.length, i + 12); j++) {
      const l2 = lines[j].trim()
      if (/^Turn\s+#/i.test(l2)) break

      const pm = l2.match(/^(.+?)\s+took a Prize card\./i)
      if (!pm) continue

      const taker = normalizeLoose(pm[1] ?? "")
      if (taker && taker === winnerNorm) {
        prizeTakenByWinner = true
      }
    }

    if (!prizeTakenByWinner) continue

    const cleanVictim = stripOwnerPrefix(victimRaw)
    if (!cleanVictim) continue

    seq.push(cleanVictim)
  }

  return seq
}

/**
 * Sprite candidates for a KO name.
 * Handles:
 * - “X ex” -> sprite without ex
 * - “Wellspring Mask Ogerpon ex” -> ogerpon-wellspring.png
 * - “Mega Lopunny ex” -> tries mega-lopunny and lopunny-mega
 */
function buildPrizeSpriteCandidates(displayName: string): string[] {
  const raw = stripOwnerPrefix(displayName)
  const n0 = normalizeLoose(raw)
  if (!n0) return [FALLBACK_ICON]

  const base = n0.replace(/\bex\b/g, "").replace(/\s+/g, " ").trim()

  // Drop filler token “mask”
  const tokens = base.split(" ").filter(Boolean).filter((t) => t !== "mask")

  // Ogerpon masks
  if (tokens.includes("ogerpon")) {
    const tset = new Set(tokens)
    const form =
      tset.has("wellspring")
        ? "ogerpon-wellspring"
        : tset.has("hearthflame")
          ? "ogerpon-hearthflame"
          : tset.has("cornerstone")
            ? "ogerpon-cornerstone"
            : "ogerpon"

    return uniquePreserveOrder([
      `/sprites/${form}.png`,
      `/sprites/${form}.webp`,
      `/sprites/ogerpon.png`,
      `/sprites/ogerpon.webp`,
      FALLBACK_ICON,
    ])
  }

  const slug = tokens.join("-")
  const slugUnderscore = tokens.join("_")

  let swapped: string | null = null
  let swappedUnderscore: string | null = null
  if (tokens.length >= 2) {
    const swappedTokens = [...tokens.slice(1), tokens[0]]
    swapped = swappedTokens.join("-")
    swappedUnderscore = swappedTokens.join("_")
  }

  return uniquePreserveOrder([
    `/sprites/${slug}.png`,
    `/sprites/${slug}.webp`,
    `/sprites/${slugUnderscore}.png`,
    `/sprites/${slugUnderscore}.webp`,
    swapped ? `/sprites/${swapped}.png` : "",
    swapped ? `/sprites/${swapped}.webp` : "",
    swappedUnderscore ? `/sprites/${swappedUnderscore}.png` : "",
    swappedUnderscore ? `/sprites/${swappedUnderscore}.webp` : "",
    FALLBACK_ICON,
  ])
}

function CandidateSprite({
  candidates,
  alt,
  title,
  size = 22,
  className,
}: {
  candidates: string[]
  alt: string
  title?: string
  size?: number
  className?: string
}) {
  const [idx, setIdx] = useState(0)
  const src = candidates[Math.min(idx, candidates.length - 1)] ?? FALLBACK_ICON

  return (
    <img
      src={src}
      alt={alt}
      title={title}
      loading="lazy"
      decoding="async"
      style={{ width: size, height: size }}
      className={cn("object-contain shrink-0 bg-transparent", className)}
      onError={() => setIdx((v) => Math.min(v + 1, candidates.length - 1))}
    />
  )
}

function ArchetypeIconPair({ archetypeId }: { archetypeId: string | null }) {
  const slots = getArchetypeIconCandidatePaths(archetypeId)
  return (
    <div className="flex items-center gap-0">
      {slots.slice(0, 3).map((cands, i) => (
        <CandidateSprite
          key={`${archetypeId ?? "unknown"}-${i}`}
          candidates={cands.length ? cands : [FALLBACK_ICON]}
          alt="icon"
          size={32}
          className={`opacity-80 dark:opacity-100 ${i === 0 ? "-ml-0.5" : "-ml-1.5"}`} //fixes icon spacing even if theres padding :)
        />
      ))}
    </div>
  )
}

function PrizeSprite({ name, size = 22 }: { name: string; size?: number }) {
  const candidates = buildPrizeSpriteCandidates(name)
  return (
    <CandidateSprite candidates={candidates} alt={name} title={stripOwnerPrefix(name)} size={size} />
  )
}

function SequenceIcons({ sequence, showPerc }: { sequence: string[]; showPerc?: string }) {
  return (
    <div className="inline-flex items-center gap-1">
      {sequence.map((step, i) => (
        <div key={`${step}-${i}`} className="inline-flex items-center gap-1">
          <PrizeSprite name={step} />
          {i < sequence.length - 1 && (
            <span className="text-slate-400 dark:text-slate-500 text-sm select-none">→</span>
          )}
        </div>
      ))}
      {showPerc && (
        <span className="ml-2 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
          {showPerc}
        </span>
      )}
    </div>
  )
}

function getOpponentName(g: GameWithUsername): string {
  return (g.opponent ?? g.opponentName ?? g.opponentUsername ?? "").trim()
}

export function PrizeMapperPanel({ ptcglUsername }: { ptcglUsername?: string | null }) {
  const [games, setGames] = useState<GameWithUsername[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDeckId, setSelectedDeckId] = useState<string>("")

  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch("/api/games", { cache: "no-store" })
        if (!res.ok) throw new Error(`Failed to load games (${res.status})`)
        const data = await res.json()
        setGames((data.games ?? []) as GameWithUsername[])
      } catch (err: any) {
        console.error("Failed to load games for prize mapper", err)
        setError(err?.message || "Failed to load games")
      } finally {
        setLoading(false)
      }
    }
    fetchGames()
  }, [])

  const normalizedPtcgl = useMemo(() => normalizeLoose(ptcglUsername ?? ""), [ptcglUsername])

  function resolveSideArchetypeId(g: GameWithUsername, side: "user" | "opponent"): string | null {
    const raw = side === "user" ? g.userArchetype : g.opponentArchetype
    const canon = canonicalizeArchetypeId(raw ?? null)
    if (canon) return canon

    const inferred = inferArchetypesForSummary({
      userMainAttacker: g.userMainAttacker,
      userOtherPokemon: safeStrArray((g as any).userOtherPokemon),
      opponentMainAttacker: g.opponentMainAttacker,
      opponentOtherPokemon: safeStrArray((g as any).opponentOtherPokemon),
    })

    return side === "user" ? inferred.userArchetype : inferred.opponentArchetype
  }

  const matchups: MatchupRow[] = useMemo(() => {
    if (!selectedDeckId || !games.length) return []

    type Acc = {
      opponentId: string | null
      globalGames: number
      globalWins: number
      personalGames: number
      personalWins: number
      winPaths: Map<string, { seq: string[]; count: number }>
    }

    const map = new Map<string, Acc>()

    for (const g of games) {
      const userId = resolveSideArchetypeId(g, "user")
      const oppId = resolveSideArchetypeId(g, "opponent")

      if (userId !== selectedDeckId && oppId !== selectedDeckId) continue

      const deckOnUserSide = userId === selectedDeckId
      const opponentId = deckOnUserSide ? oppId : userId
      const opponentKey = opponentId ?? "__unknown__"

      const deckWon = deckOnUserSide ? !!g.userWon : !g.userWon

      let acc = map.get(opponentKey)
      if (!acc) {
        acc = {
          opponentId,
          globalGames: 0,
          globalWins: 0,
          personalGames: 0,
          personalWins: 0,
          winPaths: new Map(),
        }
        map.set(opponentKey, acc)
      }

      acc.globalGames += 1
      if (deckWon) acc.globalWins += 1

      // Personal stats: only when YOU used the deck (deck on user side + username match)
      const gUsername = normalizeLoose((g as any).username ?? "")
      const isPersonal =
        !!normalizedPtcgl && !!gUsername && gUsername === normalizedPtcgl && deckOnUserSide

      if (isPersonal) {
        acc.personalGames += 1
        if (deckWon) acc.personalWins += 1
      }

      // Prize paths: only count paths from SELECTED DECK WINS
      if (deckWon) {
        const winnerName = deckOnUserSide ? ((g as any).username ?? "") : getOpponentName(g)
        const derived =
          typeof (g as any).rawLog === "string"
            ? deriveWinnerKOSequenceFromRawLog((g as any).rawLog, winnerName)
            : []

        const stored =
          Array.isArray((g as any).winnerPrizePath) && (g as any).winnerPrizePath.length > 0
            ? ((g as any).winnerPrizePath as string[])
            : []

        const seq =
          derived.length > 0
            ? derived
            : stored.length > 0
              ? stored
              : ["(no prize path recorded)"]

        const key = seq.join(" → ")

        const existing = acc.winPaths.get(key)
        if (existing) existing.count += 1
        else acc.winPaths.set(key, { seq, count: 1 })
      }
    }

    const rows: MatchupRow[] = Array.from(map.values()).map((acc) => {
      const wins = acc.globalWins

      const allPathsRaw: PrizePathStat[] = Array.from(acc.winPaths.entries())
        .map(([key, v]) => ({
          key,
          sequence: v.seq,
          count: v.count,
          percentOfWins: wins > 0 ? (v.count / wins) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count)

      const filtered = allPathsRaw.filter((p) => {
        if (wins < MIN_PATH_WINS) return false
        if (p.count < MIN_PATH_WINS) return false
        if (p.count / wins < MIN_PATH_SHARE) return false
        return true
      })

      return {
        opponentId: acc.opponentId,
        globalGames: acc.globalGames,
        globalWins: acc.globalWins,
        personalGames: acc.personalGames,
        personalWins: acc.personalWins,
        topPaths: filtered.slice(0, 3),
        allPaths: filtered,
      }
    })

    rows.sort((a, b) => {
      const aw = a.globalGames ? a.globalWins / a.globalGames : 0
      const bw = b.globalGames ? b.globalWins / b.globalGames : 0
      if (bw !== aw) return bw - aw
      return b.globalGames - a.globalGames
    })

    return rows
  }, [games, selectedDeckId, normalizedPtcgl])

  const globalDeckTotals = useMemo(() => {
    if (!selectedDeckId) return { games: 0, wins: 0 }
    let total = 0
    let wins = 0

    for (const g of games) {
      const userId = canonicalizeArchetypeId(g.userArchetype ?? null)
      const oppId = canonicalizeArchetypeId(g.opponentArchetype ?? null)
      const hasDeck = userId === selectedDeckId || oppId === selectedDeckId
      if (!hasDeck) continue

      const deckOnUser = userId === selectedDeckId
      const deckWon = deckOnUser ? !!g.userWon : !g.userWon
      total += 1
      if (deckWon) wins += 1
    }

    return { games: total, wins }
  }, [games, selectedDeckId])

  const personalDeckTotals = useMemo(() => {
    if (!selectedDeckId || !normalizedPtcgl) return { games: 0, wins: 0 }
    let total = 0
    let wins = 0

    for (const g of games) {
      const gUsername = normalizeLoose((g as any).username ?? "")
      if (!gUsername || gUsername !== normalizedPtcgl) continue

      const userId = canonicalizeArchetypeId(g.userArchetype ?? null)
      if (userId !== selectedDeckId) continue

      total += 1
      if (g.userWon) wins += 1
    }

    return { games: total, wins }
  }, [games, selectedDeckId, normalizedPtcgl])

  const globalWinPct =
    globalDeckTotals.games > 0 ? (globalDeckTotals.wins / globalDeckTotals.games) * 100 : 0
  const personalWinPct =
    personalDeckTotals.games > 0 ? (personalDeckTotals.wins / personalDeckTotals.games) * 100 : 0

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-slate-700/80 dark:text-sky-100">
          Prize mapper
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
          Select your deck archetype to see matchups, global win%, your win%, and top winning prize
          sequences. Sequences are filtered so tiny samples don’t dominate.
        </p>
      </header>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-700/60 dark:text-slate-300/80">
            Your deck archetype:
          </span>

         <Select
  value={selectedDeckId}
  onValueChange={(v) => setSelectedDeckId(v === "none" ? "" : v)}
>
  <SelectTrigger
    className={cn(
      "w-[340px]",
      "bg-slate-50 text-slate-900/60 border-slate-200",
      "dark:bg-slate-500/70 dark:text-slate-200/80 dark:border-slate-700",
    )}
  >
    <SelectValue placeholder="Select an archetype…" />
  </SelectTrigger>

  <SelectContent
    className={cn(
      
      "w-[--radix-select-trigger-width]",
      "bg-slate-50/95 text-slate-900 border-slate-200",
      "shadow-xl backdrop-blur-md",
      "dark:bg-slate-500/70 dark:text-slate-50 dark:border-slate-700",
    )}
  >
    <SelectItem
      value="none"
      className={cn(
        "text-slate-900",
        "data-[highlighted]:bg-slate-200/60 data-[highlighted]:text-slate-900",
        "data-[state=checked]:bg-slate-200/70",
        "dark:text-slate-50 dark:data-[highlighted]:bg-slate-50/10 dark:data-[state=checked]:bg-slate-50/15",
      )}
    >
      Select an archetype…
    </SelectItem>

    {ARCHETYPE_RULES.map((r) => (
      <SelectItem
        key={r.id}
        value={r.id}
        className={cn(
          "text-slate-900",
          "data-[highlighted]:bg-slate-200/60 data-[highlighted]:text-slate-900",
          "data-[state=checked]:bg-slate-200/70",
          "dark:text-slate-50 dark:data-[highlighted]:bg-slate-50/10 dark:data-[state=checked]:bg-slate-50/15",
        )}
      >
        <div className="flex items-center gap-2">
          <ArchetypeIconPair archetypeId={r.id} />
          <span>{r.label}</span>
        </div>
      </SelectItem>
    ))}
  </SelectContent>
</Select>

        </div>

        {/* {!!selectedDeckId && (
          <Badge
            variant="outline"
            className="text-[11px] px-3 py-1 rounded-full border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300"
          >
            {formatArchetypeLabel(selectedDeckId)}
          </Badge>
        )} */} 
        {/*removed badge ^^^^ to reduce clutter */}

        {!!selectedDeckId && (
          <div className="ml-auto flex flex-col items-end gap-1">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Global:{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">
                {globalWinPct.toFixed(1)}%
              </span>{" "}
              <span className="tabular-nums">
                ({globalDeckTotals.wins}/{globalDeckTotals.games})
              </span>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              You:{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">
                {personalWinPct.toFixed(1)}%
              </span>{" "}
              <span className="tabular-nums">
                ({personalDeckTotals.wins}/{personalDeckTotals.games})
              </span>
              {!normalizedPtcgl && (
                <span className="ml-2 text-[11px] text-slate-400">
                  (set your PTCGL username above)
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading games…</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!loading && !error && !!selectedDeckId && (
        <>
          {matchups.length === 0 ? (
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No games found where{" "}
                <span className="font-semibold">{formatArchetypeLabel(selectedDeckId)}</span>{" "}
                appears on either side yet.
              </p>
            </div>
          ) : (
           <div
  className={cn(
    "rounded-2xl border shadow-sm overflow-visible", // keep overflow-visible so your hover popover doesn't get clipped
    "border-slate-200/70 bg-white/55 backdrop-blur-md",
    "dark:border-slate-700/55 dark:bg-[#223a54]/40",
  )}
>
  {/* Header row (slightly darker than body) */}
  <div
    className={cn(
      "grid gap-x-6 items-center grid-cols-[minmax(0,2.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,3fr)] px-4 py-2",
      "text-xs font-semibold uppercase tracking-wide",
      "bg-slate-100/70 text-slate-600 border-b border-slate-200/60",
      "dark:bg-[#162234]/55 dark:text-slate-200/80 dark:border-slate-700/45",
    )}
  >
                <span>Matchup</span>
                <span className="text-right">Global</span>
                <span className="text-right">You</span>
                <span className="pl-2">Top winning prize sequences</span>
              </div>

              {matchups.map((row) => {
                const oppLabel = row.opponentId ? formatArchetypeLabel(row.opponentId) : "Unknown"
                const globalPct = row.globalGames ? (row.globalWins / row.globalGames) * 100 : 0
                const personalPct = row.personalGames ? (row.personalWins / row.personalGames) * 100 : 0
                const confidenceLow = row.globalGames < MIN_MATCHUP_GAMES_FOR_CONFIDENCE

                return (
                  <div
                    key={row.opponentId ?? "__unknown__"}
                    className={cn(
  "grid gap-x-6 items-center grid-cols-[minmax(0,2.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,3fr)] px-4 py-3 text-sm",
  "border-b border-slate-200/40 last:border-none",
  "odd:bg-white/25 even:bg-white/35",
  "hover:bg-slate-100/60 transition-colors",

  "dark:border-slate-700/35",
  "dark:odd:bg-[#1b2b41]/35 dark:even:bg-[#223a54]/30",
  "dark:hover:bg-[#2a4666]/45",
)}


                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ArchetypeIconPair archetypeId={row.opponentId} />
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          vs {oppLabel}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                          {row.globalGames} game{row.globalGames !== 1 && "s"}
                          {confidenceLow && <span className="ml-2">(low sample)</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right tabular-nums text-slate-800 dark:text-slate-100">
                      {globalPct.toFixed(1)}%
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        {row.globalWins}/{row.globalGames}
                      </div>
                    </div>

                    {/* Remove the em-dash placeholder that looked like a leading “-”.
                        Show 0.0% (0/0) when no personal games exist for that matchup. */}
                    <div className="text-right tabular-nums text-slate-800 dark:text-slate-100">
                      {row.personalGames > 0 ? `${personalPct.toFixed(1)}%` : "0.0%"}
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        {row.personalWins}/{row.personalGames}
                      </div>
                    </div>

                    <div className="relative group overflow-visible pl-2">
                      {row.globalWins < MIN_PATH_WINS ? (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Not enough winning samples yet to rank sequences.
                        </div>
                      ) : row.topPaths.length === 0 ? (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          No sequences passed the sample filter (min {MIN_PATH_WINS} wins and{" "}
                          {(MIN_PATH_SHARE * 100).toFixed(0)}% of wins).
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-3">
                          {row.topPaths.map((p) => (
                            <div
                              key={p.key}
                              className="rounded-xl border border-slate-200/70 dark:border-slate-700/70 bg-white/70 dark:bg-slate-900/60 px-2 py-1"
                            >
                              <SequenceIcons
                                sequence={p.sequence}
                                showPerc={`${p.percentOfWins.toFixed(0)}%`}
                              />
                            </div>
                          ))} 
                        </div>
                      )}

                      {row.allPaths.length > row.topPaths.length && (
                        <div className="pointer-events-none opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 absolute z-50 mt-2 w-[520px] max-w-[85vw] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                            More winning sequences (share of wins)
                          </div>

                          <div className="space-y-2">
                            {row.allPaths.slice(0, 10).map((p) => (
                              <div
                                key={`hover-${p.key}`}
                                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                              >
                                <SequenceIcons sequence={p.sequence} />
                                <div className="text-xs tabular-nums text-slate-600 dark:text-slate-300">
                                  {p.percentOfWins.toFixed(1)}%{" "}
                                  <span className="text-slate-400 dark:text-slate-500">
                                    ({p.count} win{p.count !== 1 && "s"})
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                            Note: sequences are ranked by frequency among wins for this matchup.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
