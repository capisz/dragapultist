// components/game-list.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import type { GameSummary } from "@/types/game"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronUp } from "lucide-react"
import { formatArchetypeLabel } from "@/utils/archetype-mapping"

type SortConfig = {
  key: keyof GameSummary
  direction: "asc" | "desc"
}

interface GameListProps {
  games: GameSummary[]
  onSelectGame: (game: GameSummary) => void
  onDeleteGame: (id: string) => void
  sortConfig: SortConfig
  onSort: (key: keyof GameSummary) => void
  showTags?: boolean
  isDarkMode?: boolean // analyzer passes this
}

export function GameList({
  games,
  onSelectGame,
  onDeleteGame,
  sortConfig,
  onSort,
  showTags = true,
}: GameListProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const deleteTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
    }
  }, [])

  const startDeleteTimer = (id: string) => {
    if (pendingDeleteId === id) {
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current)
        deleteTimerRef.current = null
      }
      setPendingDeleteId(null)
      onDeleteGame(id)
      return
    }

    setPendingDeleteId(id)
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
    deleteTimerRef.current = setTimeout(() => setPendingDeleteId(null), 3000)
  }

  const renderSortableHeader = (label: string, key: keyof GameSummary) => {
    const isActive = sortConfig.key === key
    const Icon = sortConfig.direction === "asc" ? ChevronUp : ChevronDown

    return (
      <button
        type="button"
        onClick={() => onSort(key)}
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-semibold tracking-[0.08em] uppercase",
          "text-slate-700 hover:text-slate-900",
          "dark:text-slate-200 dark:hover:text-white",
        )}
      >
        <span>{label}</span>
        {isActive && <Icon className="h-3 w-3" aria-hidden="true" />}
      </button>
    )
  }

  const containerClasses = cn(
    "overflow-hidden rounded-3xl border",
    "border-slate-200 bg-slate-50",
    "dark:border-slate-600/40 dark:bg-slate-700/40",
  )

  const headerClasses = cn(
    "grid grid-cols-[1.1fr,1.3fr,2.4fr,1.3fr,0.9fr,1.2fr,1.5fr] items-center px-4 py-2.5",
    "bg-slate-200/60 text-slate-800 border-b border-slate-200",
    "dark:bg-slate-600/90 dark:text-slate-50 dark:border-slate-800",
  )

  const rowClasses = cn(
    "grid grid-cols-[1.1fr,1.3fr,2.4fr,1.3fr,0.9fr,1.2fr,1.5fr] items-center px-4 py-2.5 text-[13px] border-t",
    "border-slate-200 bg-white hover:bg-slate-50 text-slate-900",
    "dark:border-slate-800/60 dark:bg-slate-800/85 dark:hover:bg-slate-700/80 dark:text-slate-50",
  )

  const resultPillClasses = (win: boolean) =>
    cn(
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border",
      win
        ? [
            "border-emerald-500 text-emerald-700 bg-emerald-50",
            "dark:border-emerald-400 dark:text-emerald-200 dark:bg-emerald-500/10",
          ]
        : [
            "border-rose-400 text-rose-700 bg-rose-50",
            "dark:border-rose-300 dark:text-rose-200 dark:bg-rose-500/10",
          ],
    )

  const deleteButtonClasses = (isPending: boolean) =>
    cn(
      "rounded-full px-3 py-1 text-xs font-semibold border transition-colors",
      isPending
        ? [
            "border-rose-500 bg-rose-100 text-rose-700",
            "dark:border-rose-400 dark:bg-rose-500/25 dark:text-rose-50",
          ]
        : [
            "border-rose-400 bg-rose-50 text-rose-600 hover:bg-rose-100",
            "dark:border-rose-400 dark:bg-transparent dark:text-rose-200 dark:hover:bg-rose-500/20",
          ],
    )

  const viewButtonClasses = cn(
    "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
    "border-slate-300 bg-white text-slate-800 hover:bg-slate-100",
    "dark:border-slate-500 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
  )

  const labelPillClasses = (variant: "you" | "opp") =>
    cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
      variant === "you"
        ? ["bg-emerald-100 text-emerald-700", "dark:bg-emerald-500/20 dark:text-emerald-200"]
        : ["bg-rose-100 text-rose-700", "dark:bg-rose-500/20 dark:text-rose-200"],
    )

  return (
    <div className={containerClasses}>
      <div className={headerClasses}>
        <div>{renderSortableHeader("Date", "date")}</div>
        <div>{renderSortableHeader("Opponent", "opponent")}</div>
        <div className="text-[11px] font-semibold tracking-[0.08em] uppercase">Matchup</div>
        <div>{renderSortableHeader("Result", "userWon")}</div>
        <div className="text-right">{renderSortableHeader("Turns", "turns")}</div>
        <div className="text-right text-[11px] font-semibold tracking-[0.08em] uppercase">Prize trade</div>
        <div className="text-right text-[11px] font-semibold tracking-[0.08em] uppercase">Actions</div>
      </div>

      {games.map((game) => {
        const userLabel = formatArchetypeLabel((game as any).userArchetype)
        const oppLabel = formatArchetypeLabel((game as any).opponentArchetype)
        const isPendingDelete = pendingDeleteId === game.id

        return (
          <div key={game.id} className={rowClasses}>
            <div className="tabular-nums">{game.date}</div>
            <div className="font-medium">{game.opponent}</div>

            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className={labelPillClasses("you")}>You</span>
                <span>{userLabel}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={labelPillClasses("opp")}>Opp</span>
                <span>{oppLabel}</span>
              </div>
            </div>

            <div className="flex justify-start md:justify-center">
              <span className={resultPillClasses(game.userWon)}>
                {game.userWon ? "Win" : "Loss"}
                <span className="ml-2 text-[11px] font-normal opacity-80">
                  {game.wentFirst ? "(went first)" : "(went second)"}
                </span>
              </span>
            </div>

            <div className="text-right tabular-nums">
              {game.turns} <span className="text-[11px] opacity-70">turns</span>
            </div>

            <div className="text-right">
              {game.userPrizeCardsTaken} – {game.opponentPrizeCardsTaken}
            </div>

            <div className="flex items-center justify-end gap-2">
              {showTags && (
                <div className="flex flex-wrap gap-1 justify-end mr-1">
                  {game.tags?.map((tag) => (
                    <span
                      key={tag.text}
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-[11px] font-medium border",
                        "bg-slate-50 dark:bg-slate-900/80",
                      )}
                      style={{
                        borderColor: tag.color,
                        color: tag.color,
                      }}
                    >
                      {tag.text}
                    </span>
                  ))}
                </div>
              )}

              <Button type="button" onClick={() => onSelectGame(game)} className={viewButtonClasses} variant="outline">
                View
              </Button>

              <Button
                type="button"
                onClick={() => startDeleteTimer(game.id)}
                className={deleteButtonClasses(isPendingDelete)}
                variant="outline"
              >
                {isPendingDelete ? "Confirm" : "Delete"}
              </Button>
            </div>
          </div>
        )
      })}

      {games.length === 0 && (
        <div className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
          No games yet. Import a log to get started.
        </div>
      )}
    </div>
  )
}
