// components/player-database.tsx
"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PlayerSummary {
  username: string
  totalGames: number
  wins: number
  losses: number
  winRate: number
  lastPlayed: string | null
  decks: string[]
}

export function PlayerDatabasePanel() {
  const [query, setQuery] = useState("")
  const [players, setPlayers] = useState<PlayerSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    const trimmed = query.trim()
    if (!trimmed) {
      setPlayers([])
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const res = await fetch(
        `/api/player-search?query=${encodeURIComponent(trimmed)}`,
      )
      if (!res.ok) {
        throw new Error(`Status ${res.status}`)
      }

      const data = await res.json()
      setPlayers(data.players || [])
    } catch (err) {
      console.error("Player search failed", err)
      setError("Could not search players. Please try again.")
      setPlayers([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search row */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Search by PTCGL username (e.g. capisz)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-9 w-full sm:w-64 bg-slate-100/90 dark:bg-slate-800/80 dark:text-slate-50"
        />
        <Button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="rounded-full px-5 h-9 text-sm bg-[#5e82ab] text-slate-50 hover:bg-sky-600 dark:bg-sky-200/90 dark:text-slate-900"
        >
          {loading ? "Searching..." : "Search"}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      {/* Results */}
      {players.length > 0 && (
        <div className="mt-2 space-y-2">
          {players.map((p) => (
            <div
              key={p.username}
              className="rounded-xl border border-slate-200 bg-white/70 p-3 shadow-sm
                         dark:border-slate-700 dark:bg-slate-900/70"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-50">
                    {p.username}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {p.totalGames} games • {p.wins}–{p.losses} ({p.winRate}%)
                    {p.lastPlayed && ` • Last played ${p.lastPlayed}`}
                  </div>
                </div>
                {p.decks.length > 0 && (
                  <div className="text-right">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Common decks
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end mt-1">
                      {p.decks.slice(0, 3).map((deck) => (
                        <span
                          key={deck}
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px]",
                            "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200",
                          )}
                        >
                          {deck}
                        </span>
                      ))}
                      {p.decks.length > 3 && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          +{p.decks.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && players.length === 0 && query.trim() && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No players found matching “{query.trim()}”.
        </p>
      )}
    </div>
  )
}
