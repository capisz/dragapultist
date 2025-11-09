"use client"

import { useState, useEffect, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, ArrowUp, ArrowDown, Trash2, Undo } from "lucide-react"
import type { GameSummary } from "../types/game"

const scrollbarStyles = `
.custom-scrollbar {
  overflow-y: auto;
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) rgba(229, 231, 235, 0.1);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(229, 231, 235, 0.1);
  border-radius: 100px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 100px;
  border: 2px solid transparent;
  background-clip: content-box;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.7);
}

/* Dark mode styles */
.dark .custom-scrollbar {
  scrollbar-color: rgba(75, 85, 99, 0.5) rgba(31, 41, 55, 0.1);
}

.dark .custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(31, 41, 55, 0.1);
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(75, 85, 99, 0.5);
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(75, 85, 99, 0.7);
}

/* Hide default scrollbar buttons */
.custom-scrollbar::-webkit-scrollbar-button {
  display: none;
}

/* Deleted row styles */
.deleted-row {
  position: relative;
}

.deleted-row::after {
  content: '';
  position: absolute;
  left: 50px; /* Width of the first cell */
  right: 0;
  top: 50%;
  border-top: 2px solid #ef4444;
  z-index: 1;
}

.deleted-row > *:not(:first-child) {
  opacity: 0.5;
}
`

interface GameListProps {
  games: GameSummary[]
  onSelectGame: (game: GameSummary) => void
  onDeleteGame: (id: string) => void
  sortConfig: { key: keyof GameSummary; direction: "asc" | "desc" }
  onSort: (key: keyof GameSummary) => void
}

export function GameList({ games: initialGames, onSelectGame, onDeleteGame, sortConfig, onSort }: GameListProps) {
  const [games, setGames] = useState(initialGames)
  const [deletedRows, setDeletedRows] = useState<Record<string, number>>({})

  useEffect(() => {
    setGames(initialGames)
  }, [initialGames])

  useEffect(() => {
    const timers: Record<string, NodeJS.Timeout> = {}

    Object.entries(deletedRows).forEach(([id, timestamp]) => {
      const remainingTime = timestamp + 10000 - Date.now()
      if (remainingTime > 0) {
        timers[id] = setTimeout(() => {
          setDeletedRows((prev) => {
            const { [id]: _, ...rest } = prev
            return rest
          })
          setGames((prevGames) => prevGames.filter((game) => game.id !== id))
          onDeleteGame(id) // Call onDeleteGame when item is permanently deleted
        }, remainingTime)
      } else {
        setDeletedRows((prev) => {
          const { [id]: _, ...rest } = prev
          return rest
        })
        setGames((prevGames) => prevGames.filter((game) => game.id !== id))
        onDeleteGame(id) // Call onDeleteGame for immediate deletions
      }
    })

    return () => {
      Object.values(timers).forEach((timer) => clearTimeout(timer))
    }
  }, [deletedRows, onDeleteGame])

  useEffect(() => {
    const handleBeforeUnload = () => {
      Object.keys(deletedRows).forEach((id) => {
        setGames((prevGames) => prevGames.filter((game) => game.id !== id))
        onDeleteGame(id) // Call onDeleteGame when unloading the page
      })
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [deletedRows, onDeleteGame])

  const deleteRow = useCallback((id: string) => {
    setDeletedRows((prev) => ({ ...prev, [id]: Date.now() }))
  }, [])

  const undoDelete = useCallback((id: string) => {
    setDeletedRows((prev) => {
      const { [id]: _, ...rest } = prev
      return rest
    })
  }, [])

  const calculateWinRate = useCallback(
    (pokemon: string) => {
      const pokemonGames = games.filter((g) => g.userMainAttacker.includes(pokemon) && !deletedRows[g.id])
      const wins = pokemonGames.filter((g) => g.userWon).length
      const losses = pokemonGames.length - wins
      return `${wins} - ${losses}`
    },
    [games, deletedRows],
  )

  const getSortIcon = (key: keyof GameSummary) => {
    if (sortConfig && sortConfig.key === key) {
      return sortConfig.direction === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
    }
    return <ArrowUpDown className="h-4 w-4" />
  }

  const headers: { key: keyof GameSummary; label: string }[] = [
    { key: "date", label: "Date" },
    { key: "userMainAttacker", label: "Your Main Attacker" },
    { key: "opponentMainAttacker", label: "Opponent Main Attacker" },
    { key: "userWon", label: "Result" },
    { key: "damageDealt", label: "Damage Dealt" },
    { key: "userPrizeCardsTaken", label: "Prize Cards Taken" },
    { key: "turns", label: "Turns" },
    { key: "wentFirst", label: "Went First" },
    { key: "userAceSpecs", label: "ACE SPEC Used" },
  ]

  return (
    <>
      <style>{scrollbarStyles}</style>
      <div className="rounded-lg border dark:border-[#333740] overflow-auto custom-scrollbar max-h-[calc(100vh-200px)]">
        <Table>
          <thead className="bg-gray-900 text-white dark:bg-[#1A1E24]">
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              {headers.map(({ key, label }) => (
                <TableHead key={key} className="bg-gray-900 text-white font-semibold h-10 p-0 dark:bg-[#1A1E24]">
                  <Button
                    variant="ghost"
                    onClick={() => onSort(key)}
                    className="w-full h-full text-white hover:text-white/80 hover:bg-gray-800 transition-all hover:scale-105 dark:hover:bg-[#333740]"
                  >
                    {label}
                    {getSortIcon(key)}
                  </Button>
                </TableHead>
              ))}
            </TableRow>
          </thead>
          <TableBody>
            {games.map((game, index) => (
              <TableRow
                key={game.id}
                className={`${
                  index % 2 === 0 ? "bg-gray-100 dark:bg-[#2A2F38]" : "bg-white dark:bg-[#1E2328]"
                } hover:bg-blue-100 dark:hover:bg-[#333740] cursor-pointer ${
                  deletedRows[game.id] ? "deleted-row cursor-default" : "cursor-pointer"
                }`}
                onClick={() => {
                  if (!deletedRows[game.id]) {
                    onSelectGame(game)
                  }
                }}
              >
                <TableCell className="w-[50px]">
                  {deletedRows[game.id] ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        undoDelete(game.id)
                      }}
                      className="hover:bg-transparent transition-transform duration-200 hover:scale-110"
                    >
                      <Undo className="h-4 w-4 text-gray-500 dark:text-white" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteRow(game.id)
                      }}
                      className="hover:bg-transparent transition-transform duration-200 hover:scale-110"
                    >
                      <Trash2 className="h-4 w-4 text-gray-500 dark:text-white" />
                    </Button>
                  )}
                </TableCell>
                <TableCell className="font-medium text-gray-900 dark:text-white">{game.date}</TableCell>
                <TableCell className="text-gray-900 dark:text-white">
                  {game.userMainAttacker.replace(/^.*'s\s/, "")} ({calculateWinRate(game.userMainAttacker)})
                </TableCell>
                <TableCell className="text-gray-900 dark:text-white">
                  {game.opponentMainAttacker.replace(/^.*'s\s/, "")}
                </TableCell>
                <TableCell>
                  <span
                    className={game.userWon ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
                  >
                    {game.userWon ? "Won" : "Lost"}
                    {game.userConceded && " (You conceded)"}
                    {game.opponentConceded && " (Opponent conceded)"}
                  </span>
                </TableCell>
                <TableCell className="text-gray-900 dark:text-white">{game.damageDealt}</TableCell>
                <TableCell className="text-gray-900 dark:text-white">
                  {game.userPrizeCardsTaken} - {game.opponentPrizeCardsTaken}
                </TableCell>
                <TableCell className="text-gray-900 dark:text-white">{game.turns}</TableCell>
                <TableCell className="text-gray-900 dark:text-white">{game.wentFirst ? "Yes" : "No"}</TableCell>
                <TableCell className="text-gray-900 dark:text-white">
                  {game.userAceSpecs && game.userAceSpecs.length > 0 ? (
                    <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                      {game.userAceSpecs[0]}
                      {game.userAceSpecs.length > 1 ? ` +${game.userAceSpecs.length - 1}` : ""}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">None</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

function getContrastColor(hexColor: string) {
  const r = Number.parseInt(hexColor.slice(1, 3), 16)
  const g = Number.parseInt(hexColor.slice(3, 5), 16)
  const b = Number.parseInt(hexColor.slice(5, 7), 16)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 128 ? "black" : "white"
}
