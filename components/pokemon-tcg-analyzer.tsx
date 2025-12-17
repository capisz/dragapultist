// components/pokemon-tcg-analyzer.tsx
"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { GameList } from "@/components/game-list"
import { GameDetail } from "@/components/game-detail"
import { ImportConfirmationDialog } from "@/components/import-confirmation-dialog"
import { analyzeGameLog, getGameDataForConfirmation } from "@/utils/game-analyzer"
import type { GameSummary } from "@/types/game"
import { getUser } from "@/app/actions"
import { PlayerDatabasePanel } from "@/components/player-database"
import { cn } from "@/lib/utils"
import { PrizeMapperPanel } from "@/components/prize-mapper-panel"
import { useTheme } from "next-themes"
import { SiteFooter } from "@/components/site-footer"

declare global {
  interface Window {
    dragapultist?: {
      onLogDetected?: (cb: (logText: string) => void) => () => void
    }
  }
}

export function PokemonTCGAnalyzer() {
  const [activeTab, setActiveTab] = useState<"games" | "players" | "prizeMapper">("games")

  const [games, setGames] = useState<GameSummary[]>([])
  const [selectedGame, setSelectedGame] = useState<GameSummary | null>(null)
  const [manualInput, setManualInput] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [sortConfig, setSortConfig] = useState<{
    key: keyof GameSummary
    direction: "asc" | "desc"
  }>({ key: "date", direction: "desc" })
  const [user, setUser] = useState<{ id: string; username: string } | null>(null)
  const [validationStatus, setValidationStatus] = useState<"none" | "valid" | "invalid">("none")
  const [isButtonPressed, setIsButtonPressed] = useState(false)
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false)
  const [pendingGameData, setPendingGameData] = useState<any>(null)
  const [pendingGameLog, setPendingGameLog] = useState<string>("")
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const buttonTimerRef = useRef<NodeJS.Timeout | null>(null)

  // PTCGL username used for "personal stats" in Prize Mapper
  const [ptcglUsername, setPtcglUsername] = useState<string>("")

  const { theme, resolvedTheme } = useTheme()
  const isDarkMode = (resolvedTheme ?? theme) === "dark"

  useEffect(() => {
    getUser().then(setUser)
  }, [])

  useEffect(() => {
    // Load saved PTCGL username
    try {
      const stored = localStorage.getItem("ptcglUsername")
      if (stored) setPtcglUsername(stored)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (user) {
      if (user.username === "Guest") {
        const storedGames = localStorage.getItem("guestGames")
        if (storedGames) {
          setGames(JSON.parse(storedGames))
        }
      } else {
        // TODO: fetch games for this logged-in user from the server
      }
    }
  }, [user])

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
      if (buttonTimerRef.current) clearTimeout(buttonTimerRef.current)
    }
  }, [])

  const validateGameLog = useCallback((log: string) => {
    const hasGamePatterns =
      log.includes("chose") &&
      log.includes("for the opening coin flip") &&
      log.includes("won the coin toss") &&
      log.includes("drew") &&
      log.includes("Turn #")
    return hasGamePatterns
  }, [])

  const addGame = useCallback(
    (
      log: string,
      options?: {
        swapPlayers?: boolean
        userArchetypeId?: string | null
        opponentArchetypeId?: string | null
      },
    ) => {
      const gameSummary = analyzeGameLog(
        log,
        options?.swapPlayers ?? false,
        undefined,
        undefined,
        options?.userArchetypeId ?? null,
        options?.opponentArchetypeId ?? null,
      )

      setGames((prevGames) => {
        const newGames = [...prevGames, gameSummary]
        if (user?.username === "Guest") {
          localStorage.setItem("guestGames", JSON.stringify(newGames))
        }
        return newGames
      })

      // Persist to backend (Mongo) – fire-and-forget
      console.log("Saving game to backend for player:", (gameSummary as any).username)
      fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameSummary }),
      }).catch((err) => {
        console.error("Failed to save game to backend", err)
      })

      setManualInput("")
    },
    [user],
  )

  const processLogForManualImport = useCallback(
    (log: string) => {
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current)
        fadeTimerRef.current = null
      }

      if (log.trim() === "") {
        setValidationStatus("invalid")
        fadeTimerRef.current = setTimeout(() => setValidationStatus("none"), 5000)
        return
      }

      const isValid = validateGameLog(log)
      if (!isValid) {
        setValidationStatus("invalid")
        fadeTimerRef.current = setTimeout(() => setValidationStatus("none"), 5000)
        return
      }

      try {
        const gameData = getGameDataForConfirmation(log)
        setPendingGameData(gameData)
        setPendingGameLog(log)
        setShowConfirmationDialog(true)
      } catch {
        setValidationStatus("invalid")
        fadeTimerRef.current = setTimeout(() => setValidationStatus("none"), 5000)
      }
    },
    [validateGameLog],
  )

  const handleManualSubmit = useCallback(() => {
    setIsButtonPressed(true)
    if (buttonTimerRef.current) clearTimeout(buttonTimerRef.current)
    buttonTimerRef.current = setTimeout(() => setIsButtonPressed(false), 300)
    processLogForManualImport(manualInput)
  }, [manualInput, processLogForManualImport])

  useEffect(() => {
    if (typeof window === "undefined") return

    const api = window.dragapultist
    if (!api || !api.onLogDetected) return

    const unsubscribe = api.onLogDetected((logText: string) => {
      setManualInput(logText)

      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current)
        fadeTimerRef.current = null
      }

      const isValid = validateGameLog(logText)
      if (!isValid) {
        setValidationStatus("invalid")
        fadeTimerRef.current = setTimeout(() => setValidationStatus("none"), 5000)
        return
      }

      addGame(logText)

      setValidationStatus("valid")
      fadeTimerRef.current = setTimeout(() => setValidationStatus("none"), 5000)
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [addGame, validateGameLog])

  const handleConfirmImport = useCallback(
    (swapPlayers: boolean, userArchetypeId?: string | null, opponentArchetypeId?: string | null) => {
      setShowConfirmationDialog(false)
      setValidationStatus("valid")

      addGame(pendingGameLog, { swapPlayers, userArchetypeId, opponentArchetypeId })

      fadeTimerRef.current = setTimeout(() => setValidationStatus("none"), 5000)

      setPendingGameData(null)
      setPendingGameLog("")
    },
    [addGame, pendingGameLog],
  )

  const handleCancelImport = useCallback(() => {
    setShowConfirmationDialog(false)
    setPendingGameData(null)
    setPendingGameLog("")
  }, [])

  const handleDeleteGame = useCallback(
    (id: string) => {
      setGames((prevGames) => {
        const newGames = prevGames.filter((game) => game.id !== id)
        if (user?.username === "Guest") localStorage.setItem("guestGames", JSON.stringify(newGames))
        return newGames
      })
      if (selectedGame && selectedGame.id === id) setSelectedGame(null)
    },
    [selectedGame, user],
  )

  const handleUpdateGame = useCallback(
    (updatedGame: GameSummary) => {
      setGames((prevGames) => {
        const newGames = prevGames.map((game) => (game.id === updatedGame.id ? updatedGame : game))
        if (user?.username === "Guest") localStorage.setItem("guestGames", JSON.stringify(newGames))
        return newGames
      })
    },
    [user],
  )

  const handleSort = useCallback((key: keyof GameSummary) => {
    setSortConfig((prevConfig) => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === "asc" ? "desc" : "asc",
    }))
  }, [])

  const sortedGames = [...games].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1
    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1
    return 0
  })

  const filteredGames = sortedGames.filter((game) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      game.userMainAttacker.toLowerCase().includes(searchLower) ||
      game.opponentMainAttacker.toLowerCase().includes(searchLower) ||
      game.userOtherPokemon.some((pokemon) => pokemon.toLowerCase().includes(searchLower)) ||
      game.opponentOtherPokemon.some((pokemon) => pokemon.toLowerCase().includes(searchLower)) ||
      game.tags?.some((tag) => tag.text.toLowerCase().includes(searchLower)) ||
      game.rawLog.toLowerCase().includes(searchLower)
    )
  })

  const setSelectedGameSafely = useCallback(
    (game: GameSummary | null) => {
      if (game === null || games.some((g) => g.id === game.id)) setSelectedGame(game)
    },
    [games],
  )

  const buttonStyles = {
    transform: isButtonPressed ? "scale(0.95)" : "scale(1)",
    transition: "transform 0.1s ease-in-out",
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 w-full px-4 pb-10 pt-4 md:px-6 md:pt-6">
        <div className="mx-auto w-full max-w-6xl">
          {/* Tabs */}
          <div className="mb-4 flex items-end gap-2 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab("games")}
              className={cn(
                "px-3 py-2 text-sm font-medium border-b-2",
                activeTab === "games"
                  ? "border-sky-500 text-sky-600 dark:text-sky-300"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
              )}
            >
              Game log
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("players")}
              className={cn(
                "px-3 py-2 text-sm font-medium border-b-2",
                activeTab === "players"
                  ? "border-sky-500 text-sky-600 dark:text-sky-300"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
              )}
            >
              Player database
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("prizeMapper")}
              className={cn(
                "px-3 py-2 text-sm font-medium border-b-2",
                activeTab === "prizeMapper"
                  ? "border-sky-500 text-sky-600 dark:text-sky-300"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
              )}
            >
              Prize mapper
            </button>

            {/* PTCGL username only relevant for prize mapper */}
            {/* {activeTab === "prizeMapper" && (
              <div className="ml-auto pb-2 flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  PTCGL username
                </span>
                <Input
                  value={ptcglUsername}
                  onChange={(e) => {
                    const v = e.target.value
                    setPtcglUsername(v)
                    try {
                      localStorage.setItem("ptcglUsername", v.trim())
                    } catch {
                      // ignore
                    }
                  }}
                  placeholder="capisz…"
                  className="h-9 w-48 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                />
              </div>
            )} */}
            {/* removed ptcgl username thing */}
          </div>

          {activeTab === "games" ? (
            <>
              {!selectedGame && (
                <div className="mb-6 space-y-4">
                 <Textarea
  placeholder="Paste your game log here..."
  value={manualInput}
  onChange={(e) => {
    setManualInput(e.target.value)
    if (e.target.value.trim() === "") setValidationStatus("none")
  }}
  className={cn(
    "w-full h-40 rounded-3xl",
    "bg-slate-100/90 text-gray-900 placeholder:text-slate-400",
    "border border-slate-200 shadow-[0_0_22px_rgba(42,81,128,0.1)]",

    // key: kill the ring offset “black outline”
    "ring-offset-0 focus:ring-offset-0 focus-visible:ring-offset-0",
    "focus:outline-none focus:ring-2 focus:ring-slate-300",

    "dark:bg-slate-500/50 dark:text-white dark:placeholder:text-slate-200/90",
    "dark:border-slate-600 dark:shadow-[0_0_32px_rgba(56,189,248,0.1)]",
    "dark:focus:ring-slate-300/70"
  )}
/>


                  <div className="flex items-center gap-3">
                    <div className="custom-button-container">
                      <Button
                        onClick={handleManualSubmit}
                        className={`
                         rounded-full px-5 h-9 text-sm
            bg-[#5e82ab] text-slate-50 hover:bg-sky-800/50
            dark:bg-sky-200/90 dark:text-slate-900 dark:hover:bg-sky-100

                          
                          ${isButtonPressed ? "scale-95" : "scale-100"}
                        `}
                        style={buttonStyles}
                      >
                        Import
                      </Button>
                    </div>

                    {validationStatus === "valid" && (
                      <span
                        className="text-green-600 dark:text-green-400 text-sm font-medium"
                        style={{ animation: "fadeInOut 5s forwards", opacity: 1 }}
                      >
                        Successful import
                      </span>
                    )}
                    {validationStatus === "invalid" && (
                      <span
                        className="text-red-600 dark:text-red-400 text-sm font-medium"
                        style={{ animation: "fadeInOut 5s forwards", opacity: 1 }}
                      >
                        Improper import format
                      </span>
                    )}
                  </div>
                </div>
              )}

              {selectedGame ? (
                <GameDetail
                  game={selectedGame}
                  onBack={() => setSelectedGameSafely(null)}
                  allGames={games}
                  onUpdateGame={handleUpdateGame}
                />
              ) : (
                <div>
                  <div className="mb-4 relative">
                    <div className="absolute right-0 bottom-0 z-10">
                      <img
                        src="pultist-nobg.png"
                        alt="dragapult"
                        className="h-28 object-contain drop-shadow-[0_0_22px_rgba(42,81,128,0.8)] dark:drop-shadow-[0_0_22px_rgba(186,230,253,1)] "
                        style={{ transform: "scale(0.85)", opacity: 0.6}}
                      />
                    </div>
                   <Input
  type="text"
  placeholder="Search for Pokémon..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  className={cn(
    "w-64",
    "bg-slate-100/90 text-gray-900 placeholder:text-slate-400",
    "border border-slate-300",
    "shadow-[0_0_22px_rgba(42,81,128,0.15)]",

    // key: remove the dark ring-offset outline
    "ring-offset-0 focus:ring-offset-0 focus-visible:ring-offset-0",
    "focus:outline-none focus:ring-2 focus:ring-white",

    "dark:bg-slate-500/70 dark:text-slate-100 dark:placeholder:text-slate-300",
    "dark:border-slate-600",
    "dark:shadow-[0_0_32px_rgba(56,189,248,0.1)]",
    "dark:focus:ring-slate-300"
  )}
/>


                  </div>

                  {filteredGames.length > 0 ? (
                    <GameList
                      games={filteredGames}
                      onSelectGame={setSelectedGameSafely}
                      onDeleteGame={handleDeleteGame}
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      showTags={false}
                      isDarkMode={isDarkMode}
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">
                      No games found matching your search.
                    </p>
                  )}
                </div>
              )}

              <ImportConfirmationDialog
                open={showConfirmationDialog}
                onConfirm={handleConfirmImport}
                onCancel={handleCancelImport}
                gameData={
                  pendingGameData || {
                    username: "",
                    opponent: "",
                    suggestedUserArchetype: null,
                    suggestedOpponentArchetype: null,
                  }
                }
              />
            </>
          ) : activeTab === "players" ? (
            <PlayerDatabasePanel />
          ) : (
            <PrizeMapperPanel ptcglUsername={ptcglUsername} />
          )}
        </div>

        <style jsx global>{`
          @keyframes fadeInOut {
            0% {
              opacity: 0;
            }
            20% {
              opacity: 1;
            }
            60% {
              opacity: 1;
            }
            100% {
              opacity: 0;
            }
          }

          .custom-button-container {
            display: inline-block;
          }
        `}</style>
      </main>

    </div>
  )
}
