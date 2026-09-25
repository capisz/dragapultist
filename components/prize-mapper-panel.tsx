// components/prize-mapper-panel.tsx
"use client"

import { GhostScaffold } from "./ghost-scaffold"
import { useEffect, useMemo, useState } from "react"
import { ArchetypeSelector } from "./archetype-selector"
import { ArchetypeIconPair as SharedArchetypeIconPair } from "./archetype-icon-pair"
import type { GameSummary } from "@/types/game"
import { cn } from "@/lib/utils"
import {
  ARCHETYPE_RULES,
  canonicalizeArchetypeId,
  formatArchetypeLabel,
  getArchetypeIconCandidatePaths,
  inferArchetypesForSummary,
} from "@/utils/archetype-mapping"
import { getPokemonSpriteCandidateSourcesForDisplayName } from "@/utils/pokeapi-sprites"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { MatchSprite } from "./match-sprite"

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
  observedPaths: PrizePathStat[]
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

function deriveWinnerKOSequenceFromRawLog(rawLog: string, winnerName: string): string[] {
  if (!rawLog || !winnerName) return []

  const winnerNorm = normalizeLoose(winnerName)
  if (!winnerNorm) return []

  const lines = rawLog.split(/\r?\n/)

  // pending KOs in the order they occurred
  const pendingKOs: { ownerNorm: string; victim: string }[] = []
  const out: string[] = []

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    // Owned KO: "capisz's Dusknoir was Knocked Out!"
    const ownedKO = line.match(/^(.+?)['’]s\s+(.+?)\s+was Knocked Out[!.]/i)
    if (ownedKO) {
      const ownerNorm = normalizeLoose((ownedKO[1] ?? "").trim())
      const victim = stripOwnerPrefix((ownedKO[2] ?? "").trim())
      if (victim) pendingKOs.push({ ownerNorm, victim })
      continue
    }

    // Bare KO: "Dusknoir was Knocked Out!"
    const bareKO = line.match(/^(.+?)\s+was Knocked Out[!.]/i)
    if (bareKO) {
      const victim = stripOwnerPrefix((bareKO[1] ?? "").trim())
      if (victim) pendingKOs.push({ ownerNorm: "", victim })
      continue
    }

    // Prize line: "capisz took a Prize card." / "capisz took 2 Prize cards."
    const pm = line.match(/^(.+?)\s+took\s+(?:a|an|\d+)\s+Prize card(?:s)?\./i)
    if (!pm) continue

    const takerNorm = normalizeLoose((pm[1] ?? "").trim())
    if (!takerNorm) continue

    // Pair this prize with the most recent KO from the OTHER side.
    let idx = -1
    for (let i = pendingKOs.length - 1; i >= 0; i--) {
      const ko = pendingKOs[i]
      if (!ko.ownerNorm || ko.ownerNorm !== takerNorm) {
        idx = i
        break
      }
    }
    if (idx < 0) continue

    const [{ victim }] = pendingKOs.splice(idx, 1)

    // Only record prize events taken by the winner
    if (takerNorm === winnerNorm && victim) {
      out.push(victim)
    }
  }

  return out
}

function buildPrizeSpriteCandidates(displayName: string): string[] {
  return getPokemonSpriteCandidateSourcesForDisplayName(displayName)
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
  const sources = [...new Set([...candidates.filter(path => path.startsWith("/sprites/")), FALLBACK_ICON])]
  const src = sources[Math.min(idx, sources.length - 1)] ?? FALLBACK_ICON

  return (
    <img
      src={src}
      alt={alt}
      title={title}
      decoding="async"
      style={{ width: size, height: size }}
      className={cn("object-contain shrink-0 bg-transparent", className)}
      onError={() => setIdx((v) => Math.min(v + 1, sources.length - 1))}
    />
  )
}

function ArchetypeIconPair({ archetypeId }: { archetypeId: string | null }) { return <SharedArchetypeIconPair archetypeId={archetypeId} size={36} /> }

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

export function PrizeMapperPanel({ ptcglUsername, games, loading = false, error = null, onRetry, onImport, isGuest = true }: {
  ptcglUsername?: string | null; games: GameSummary[]; loading?: boolean; error?: string | null; onRetry?: () => void; onImport?: () => void; isGuest?: boolean
}) {
  const [selectedDeckId, setSelectedDeckId] = useState<string>("")
  const [archetypeQuery, setArchetypeQuery] = useState("")

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
        deckOnUserSide && (!normalizedPtcgl || (!!gUsername && gUsername === normalizedPtcgl))

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
        observedPaths: allPathsRaw,
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
      const userId = resolveSideArchetypeId(g, "user")
      const oppId = resolveSideArchetypeId(g, "opponent")
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
    if (!selectedDeckId) return { games: 0, wins: 0 }
    let total = 0
    let wins = 0

    for (const g of games) {
      const gUsername = normalizeLoose((g as any).username ?? "")
      if (normalizedPtcgl && (!gUsername || gUsername !== normalizedPtcgl)) continue

      const userId = resolveSideArchetypeId(g, "user")
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

  const usedDecks = Array.from(new Set(games.flatMap(game => [resolveSideArchetypeId(game, "user"), resolveSideArchetypeId(game, "opponent")]).filter(Boolean))) as string[]
  const allDecks = Array.from(new Set([...usedDecks, ...ARCHETYPE_RULES.map(rule => rule.id)]))
  const filteredDecks = allDecks.filter(id => formatArchetypeLabel(id).toLowerCase().includes(archetypeQuery.toLowerCase()))
  const renderPath = (path: PrizePathStat, row: MatchupRow, index: number) => <div className="prize-path" key={path.key}>
    <div className="prize-path-caption"><span>{row.allPaths.some(top => top.key === path.key) ? 'Frequent path' : 'Observed path'} {index + 1}</span><strong>{path.count}/{row.globalWins} wins · {path.percentOfWins.toFixed(0)}%</strong></div>
    <ol>{path.sequence.map((pokemon, step) => <li key={step}><span className="path-step">{step + 1}</span>{pokemon === '(no prize path recorded)' ? <span>No prize path recorded</span> : <><MatchSprite name={pokemon} /><span>{pokemon}</span></>}</li>)}</ol>
  </div>

  return <section className="prize-workspace" aria-label="Prize Mapper">
    <div className="prize-picker">
      <p className="prize-picker-label">Prize archetype</p>
      <ArchetypeSelector value={selectedDeckId} onValueChange={setSelectedDeckId} label="Prize archetype" availableIds={usedDecks} counts={Object.fromEntries(usedDecks.map(id => [id, games.filter(game => resolveSideArchetypeId(game,"user") === id || resolveSideArchetypeId(game,"opponent") === id).length]))} />
      <div className="available-decks" aria-label="Available archetypes">{usedDecks.map(id => <button className="archetype-choice" key={id} aria-pressed={selectedDeckId === id} onClick={() => setSelectedDeckId(id)}><ArchetypeIconPair archetypeId={id} /><span>{formatArchetypeLabel(id)}</span></button>)}</div>
      {archetypeQuery && !filteredDecks.length && <p role="status">No archetypes match this search.</p>}
    </div>
    {loading && <><p role="status" className="sr-only">Loading your match collection…</p><GhostScaffold kind="prizes" /></>}
    {error && <div className="tool-status" role="alert"><p>Match history is unavailable.</p><button className="action" onClick={onRetry}>Retry loading games</button></div>}
    {!loading && !error && !games.length && <div className="tool-status"><p>No imported games.</p>{onImport && <button className="secondary" onClick={onImport}>Import a game</button>}</div>}
    {!loading && !error && !!games.length && !!selectedDeckId && <>
      <header className="prize-selected"><div className="archetype-label"><ArchetypeIconPair archetypeId={selectedDeckId} /><h3>{formatArchetypeLabel(selectedDeckId)}</h3></div>
        <div className="compact-record"><strong>{globalDeckTotals.games ? `${globalWinPct.toFixed(1)}%` : '—'}</strong><span>{globalDeckTotals.wins}/{globalDeckTotals.games} collection wins</span></div>
        <div className="compact-record"><strong>{personalDeckTotals.games ? `${personalWinPct.toFixed(1)}%` : '—'}</strong><span>{personalDeckTotals.wins}/{personalDeckTotals.games} wins on your side</span></div>
      </header>
      {!matchups.length && !!games.length && <p>No games recorded for this archetype.</p>}
      <div className="prize-lanes">{matchups.map(row => <article key={row.opponentId ?? 'unknown'}>
        <header><div className="archetype-label"><ArchetypeIconPair archetypeId={row.opponentId} /><div><h3>vs {row.opponentId ? formatArchetypeLabel(row.opponentId) : 'Unknown archetype'}</h3><p>{row.globalGames} games{row.globalGames < MIN_MATCHUP_GAMES_FOR_CONFIDENCE ? ' · Low sample' : ''}</p></div></div>
          <div className="matchup-counts"><span><strong>{(row.globalWins / row.globalGames * 100).toFixed(1)}%</strong>{row.globalWins}/{row.globalGames} collection wins</span><span><strong>{row.personalGames ? `${(row.personalWins / row.personalGames * 100).toFixed(1)}%` : '—'}</strong>{row.personalWins}/{row.personalGames} personal wins</span></div>
        </header>
        {!row.observedPaths.length && <p>No winning prize path recorded.</p>}
        {!!row.observedPaths.length && !row.allPaths.length && <p className="sample-caution">Observed paths; too few wins to rank reliably.</p>}
        {row.observedPaths.slice(0, 3).map((path, index) => renderPath(path, row, index))}
        {row.observedPaths.length > 3 && <details><summary>Show all {row.observedPaths.length} observed paths</summary>{row.observedPaths.slice(3).map((path, index) => renderPath(path, row, index + 3))}</details>}
      </article>)}</div>
    </>}
    <details className="tool-info"><summary>About prize paths</summary><p>Each step is a knocked-out Pokémon associated with a prize event; a multi-prize knockout is one step. Counts refer to recorded wins. Frequent paths require at least {MIN_PATH_WINS} wins and {(MIN_PATH_SHARE * 100).toFixed(0)}% of wins.</p><p>Collection includes the selected deck on either side. Personal includes your recorded player side{normalizedPtcgl ? ', restricted to your configured PTCGL username' : ''}. Public population comparison is unavailable.</p><p>Use Set Players in Match Review to assign missing archetypes.</p></details>
  </section>
}
