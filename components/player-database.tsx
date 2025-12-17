"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"
import {
  canonicalizeArchetypeId,
  formatArchetypeLabel,
  getArchetypeIconCandidatePaths,
} from "@/utils/archetype-mapping"

interface PlayerDeckStat {
  archetypeId: string | null
  games: number
  wins: number
  winRate: number // 0..100 (computed in API)
}

interface PlayerSummary {
  username: string
  totalGames: number
  wins: number
  losses: number
  winRate: number
  lastPlayed: string | null
  decks: string[]
  deckStats?: PlayerDeckStat[]
}

type MatchupStat = {
  opponentArchetypeId: string | null
  games: number
  wins: number
  winRate: number
}

type DeckBreakdown = {
  archetypeId: string | null
  games: number
  wins: number
  losses: number
  winRate: number
  matchups: MatchupStat[]
}

const FALLBACK_ICON = "/sprites/substitute.png"

function CandidateSprite({
  candidates,
  alt,
  size = 26,
  className,
}: {
  candidates: string[]
  alt: string
  size?: number
  className?: string
}) {
  const [idx, setIdx] = useState(0)
  const src = candidates[Math.min(idx, candidates.length - 1)] ?? FALLBACK_ICON

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      style={{ width: size, height: size }}
      className={cn("object-contain shrink-0 bg-transparent", className)}
      onError={() => setIdx((v) => Math.min(v + 1, candidates.length - 1))}
    />
  )
}

function ArchetypeIconPair({ archetypeId, size = 26 }: { archetypeId: string | null; size?: number }) {
  const slots = getArchetypeIconCandidatePaths(archetypeId)

  const slotA = slots?.[0]?.length ? slots[0] : [FALLBACK_ICON]
  const slotB = slots?.[1]?.length ? slots[1] : null

  // Tailwind -ml-1 = 0.25rem = 4px
  const overlapPx = 4
  const totalW = size * 2 - overlapPx

  return (
    <div className="flex items-center" style={{ width: totalW }}>
      <CandidateSprite candidates={slotA} alt="icon" size={size} />

      {slotB ? (
        <CandidateSprite candidates={slotB} alt="icon" size={size} className="-ml-1" />
      ) : (
        <span aria-hidden className="-ml-1 shrink-0" style={{ width: size, height: size }} />
      )}
    </div>
  )
}

function deckKey(username: string, archetypeId: string | null) {
  return `${username}::${archetypeId ?? "__unknown__"}`
}

export function PlayerDatabasePanel() {
  const [query, setQuery] = useState("")
  const [players, setPlayers] = useState<PlayerSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isButtonPressed, setIsButtonPressed] = useState(false)

  const [openUsername, setOpenUsername] = useState<string | null>(null)
  const [openDeck, setOpenDeck] = useState<string | null>(null)

  const [breakdowns, setBreakdowns] = useState<Record<string, DeckBreakdown | undefined>>({})
  const [breakdownLoading, setBreakdownLoading] = useState<Record<string, boolean | undefined>>({})

  const handleSearch = async () => {
    const trimmed = query.trim()
    if (!trimmed) {
      setPlayers([])
      setError(null)
      setOpenUsername(null)
      setOpenDeck(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/player-search?query=${encodeURIComponent(trimmed)}`)
      if (!res.ok) throw new Error(`Status ${res.status}`)

      const data = await res.json()
      setPlayers((data.players || []) as PlayerSummary[])
      setOpenUsername(null)
      setOpenDeck(null)
    } catch (err) {
      console.error("Player search failed", err)
      setError("Could not search players. Please try again.")
      setPlayers([])
      setOpenUsername(null)
      setOpenDeck(null)
    } finally {
      setLoading(false)
    }
  }

  const ensureDeckBreakdown = async (username: string, archetypeId: string | null) => {
    const key = deckKey(username, archetypeId)
    if (breakdowns[key] || breakdownLoading[key]) return

    try {
      setBreakdownLoading((m) => ({ ...m, [key]: true }))
      const res = await fetch(
        `/api/player-deck-breakdown?username=${encodeURIComponent(username)}&archetypeId=${encodeURIComponent(
          archetypeId ?? "__unknown__",
        )}`,
      )
      if (!res.ok) throw new Error(`Status ${res.status}`)
      const data = (await res.json()) as { breakdown?: DeckBreakdown }
      setBreakdowns((m) => ({ ...m, [key]: data.breakdown }))
    } catch (e) {
      console.error("Deck breakdown fetch failed", e)
      setBreakdowns((m) => ({ ...m, [key]: undefined }))
    } finally {
      setBreakdownLoading((m) => ({ ...m, [key]: false }))
    }
  }

  const filteredPlayers = useMemo(() => players, [players])

  // Theme-safe surfaces:
  // Light: use black overlays (gives "slate-100/200" feel without matching the page)
  // Dark: use *darker* slate overlays (avoid the bright grey look from white overlays)
  const rowBase =
    "transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60 dark:focus-visible:ring-sky-200/40"
  const rowHover = "hover:bg-black/6 dark:hover:bg-slate-950/18"
  const rowSelected = "bg-black/10 dark:bg-slate-950/30"
  const rowSelectedHover = "hover:bg-black/12 dark:hover:bg-slate-950/36"

  const matchupPanelBg = "bg-black/10 dark:bg-slate-950/22"
  const matchupRowHover = "hover:bg-black/8 dark:hover:bg-slate-950/18"

  

  return (
    
    <div className="space-y-4">
      
     <header className="space-y-1">
  <h2 className="text-xl font-semibold tracking-tight text-slate-700/80 dark:text-sky-100">
    Player Database
  </h2>
  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
    Search for players in our database to view their saved games and archetype win-rate breakdowns.
  </p>
</header>


      
      <div className="flex flex-wrap gap-2 items-center">
        
        <Input
          placeholder="Search by PTCGL username (e.g. azulgg)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch()
          }}
          className={cn(
            "h-10 w-full sm:w-72 rounded-xl",
            "bg-slate-100/90 text-slate-900 placeholder:text-slate-400 border border-slate-200/60",
            "shadow-[0_0_22px_rgba(42,81,128,0.12)]",
            "focus-visible:ring-2 focus-visible:ring-slate-200 focus-visible:ring-offset-0",
            "dark:bg-slate-500/60 dark:text-slate-100 dark:placeholder:text-slate-200/70",
            "dark:border-slate-900/35 dark:shadow-[0_0_32px_rgba(56,189,248,0.10)] dark:focus-visible:ring-slate-400",
          )}
        />

        <Button
          type="button"
          onMouseDown={() => setIsButtonPressed(true)}
          onMouseUp={() => setIsButtonPressed(false)}
          onMouseLeave={() => setIsButtonPressed(false)}
          onClick={handleSearch}
          className={cn(
            "rounded-full px-5 h-9 text-sm transition-transform duration-150",
            "bg-[#5e82ab] text-slate-50 hover:bg-sky-800/50",
            "dark:bg-[#b1cce8] dark:text-[#121212] dark:hover:bg-[#a1c2e4]",
            isButtonPressed ? "scale-95" : "scale-100",
          )}
        >
          {loading ? "Searching..." : "Search"}
        </Button>
      </div>

      {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

      {/* Results */}
      {filteredPlayers.length > 0 && (
        <div className="mt-2 space-y-2">
          {filteredPlayers.map((p) => {
            const isOpen = openUsername === p.username

            const deckStats = (p.deckStats ?? [])
              .map((d) => ({
                ...d,
                archetypeId: canonicalizeArchetypeId(d.archetypeId) ?? d.archetypeId ?? null,
              }))
              .sort((a, b) => b.games - a.games)

            const topDeckStats = deckStats.slice(0, 5)

            return (
              <Collapsible
                key={p.username}
                open={isOpen}
                onOpenChange={(v) => {
                  setOpenUsername(v ? p.username : null)
                  if (!v) setOpenDeck(null)
                }}
                className={cn(
                  "rounded-2xl border overflow-hidden backdrop-blur-sm",
                  "border-slate-200/40 bg-white/25 shadow-[0_10px_30px_rgba(15,23,42,0.08)]",
                  "dark:border-slate-700/35 dark:bg-[#162638]/55 dark:shadow-[0_18px_45px_rgba(0,0,0,0.25)]",
                )}
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "w-full text-left p-3 transition-colors",
                      "hover:bg-white/20",
                      "dark:hover:bg-slate-950/14",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-slate-50 truncate">
                          {p.username}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300/80">
                          {p.totalGames} games • {p.wins}–{p.losses} ({p.winRate}%)
                          {p.lastPlayed && ` • Last played ${p.lastPlayed}`}
                        </div>
                      </div>

                      <ChevronDown
                        className={cn(
                          "h-5 w-5 text-slate-500 dark:text-slate-200/80 transition-transform",
                          isOpen && "rotate-180",
                        )}
                      />
                    </div>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent className="px-3 pb-3">
                  {topDeckStats.length > 0 ? (
                    <div
                      className={cn(
    "rounded-2xl overflow-hidden",
    "bg-black/6 ring-1 ring-black/10",
    "divide-y divide-black/10",
    "dark:bg-slate-950/12 dark:ring-white/10 dark:divide-white/10",
  )}
                    >
                      {topDeckStats.map((d, i) => {
                        const losses = d.games - d.wins
                        const dk = deckKey(p.username, d.archetypeId)
                        const isSelected = openDeck === dk

                        return (
                          <div key={`${dk}::row::${i}`}>
                            <button
                              type="button"
                              onClick={() => {
                                const next = isSelected ? null : dk
                                setOpenDeck(next)
                                if (!isSelected) ensureDeckBreakdown(p.username, d.archetypeId)
                              }}
                              className={cn(
                                "w-full flex items-center justify-between gap-3 px-3 py-3 text-left",
                                rowBase,
                                isSelected ? cn(rowSelected, rowSelectedHover) : rowHover,
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <ArchetypeIconPair archetypeId={d.archetypeId} size={28} />
                                <div className="min-w-0">
                                  <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                                    {formatArchetypeLabel(d.archetypeId)}
                                  </div>
                                  <div className="text-xs text-slate-600 dark:text-slate-200/70 tabular-nums">
                                    {d.games} game{d.games !== 1 && "s"}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right tabular-nums">
                                <div className="font-semibold text-slate-900 dark:text-slate-100">
                                  {d.winRate.toFixed(1)}%
                                </div>
                                <div className="text-xs text-slate-600 dark:text-slate-200/70">
                                  {d.wins}–{losses}
                                </div>
                              </div>
                            </button>

                            {/* Animated dropdown */}
                            <div
                              className={cn(
                                "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                                isSelected ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                              )}
                            >
                              <div className="overflow-hidden">
                                {isSelected && (
                                  <div className={cn(
        "border-t border-black/10 dark:border-white/10",
        "bg-black/6 dark:bg-slate-950/18",
        "px-3 py-3",
      )}>
                                    {breakdownLoading[dk] ? (
                                      <div className="text-xs text-slate-600 dark:text-slate-200/70 py-2">
                                        Loading…
                                      </div>
                                    ) : breakdowns[dk] ? (
                                      <div
  className={cn(
    "rounded-2xl overflow-hidden",
    // slightly lighter than the selected deck row
    "bg-black/6 dark:bg-slate-950/16",
    "ring-1 ring-black/10 dark:ring-white/10",
  )}
>
  {/* summary row (aligned) */}
  <div className="px-3 py-2 text-[11px] text-slate-700 dark:text-slate-200/80 tabular-nums border-b border-black/10 dark:border-white/10">
    {breakdowns[dk]!.wins}/{breakdowns[dk]!.games} wins • {breakdowns[dk]!.winRate.toFixed(1)}%
  </div>

  {breakdowns[dk]!.matchups.length === 0 ? (
    <div className="px-3 py-3 text-xs text-slate-600 dark:text-slate-200/70">
      No matchup data recorded for this deck yet.
    </div>
  ) : (
    <div className="divide-y divide-black/10 dark:divide-white/10">
      {breakdowns[dk]!.matchups.slice(0, 8).map((m, mi) => {
        const mid =
          canonicalizeArchetypeId(m.opponentArchetypeId) ?? m.opponentArchetypeId ?? null

        return (
          <div
            key={`${dk}-m-${mi}-${mid ?? "__unknown__"}`}
            className={cn(
              // very slightly lighter than the panel, for separation
              "bg-black/4 dark:bg-slate-950/12",
              "hover:bg-black/7 dark:hover:bg-slate-950/18 transition-colors",
            )}
          >
            <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-slate-800 dark:text-slate-100">
              <div className="flex items-center gap-2 min-w-0">
                <ArchetypeIconPair archetypeId={mid} size={22} />
                <span className="truncate">vs {formatArchetypeLabel(mid)}</span>
              </div>

              <div className="text-right tabular-nums">
                <span className="font-semibold">{m.winRate.toFixed(1)}%</span>{" "}
                <span className="text-slate-600 dark:text-slate-200/70">
                  ({m.wins}/{m.games})
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )}
</div>

                                    ) : (
                                      <div className="text-xs text-slate-600 dark:text-slate-200/70 py-2">
                                        No breakdown available (check /api/player-deck-breakdown).
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600 dark:text-slate-200/70">
                      No deck history recorded yet for this player.
                    </p>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </div>
      )}

      {!loading && !error && filteredPlayers.length === 0 && query.trim() && (
        <p className="text-sm text-slate-600 dark:text-slate-200/70">
          No players found matching “{query.trim()}”.
        </p>
      )}
    </div>
  )
}
