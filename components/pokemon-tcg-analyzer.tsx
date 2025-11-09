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
import { useTheme } from "next-themes"
import { getUser } from "@/app/actions"

export function PokemonTCGAnalyzer() {
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

  const { theme } = useTheme()

  useEffect(() => {
    getUser().then(setUser)
  }, [])

  useEffect(() => {
    if (user) {
      if (user.username === "Guest") {
        const storedGames = localStorage.getItem("guestGames")
        if (storedGames) {
          setGames(JSON.parse(storedGames))
        }
      } else {
        // Fetch games from the server for logged-in users
        // This is where you'd typically make an API call to get the user's games
      }
    }
  }, [user])

  // Clean up timers when component unmounts
  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current)
      }
      if (buttonTimerRef.current) {
        clearTimeout(buttonTimerRef.current)
      }
    }
  }, [])

  const validateGameLog = useCallback((log: string) => {
    // Basic validation - check for common patterns in game logs
    const hasGamePatterns =
      log.includes("chose") &&
      log.includes("for the opening coin flip") &&
      log.includes("won the coin toss") &&
      log.includes("drew") &&
      log.includes("Turn #")

    return hasGamePatterns
  }, [])

  const addGame = useCallback(
    (log: string, swapPlayers = false, customUserMainAttacker?: string, customOpponentMainAttacker?: string) => {
      const gameSummary = analyzeGameLog(log, swapPlayers, customUserMainAttacker, customOpponentMainAttacker)
      setGames((prevGames) => {
        const newGames = [...prevGames, gameSummary]
        if (user?.username === "Guest") {
          localStorage.setItem("guestGames", JSON.stringify(newGames))
        }
        return newGames
      })
      setManualInput("")
    },
    [user],
  )

  const handleManualSubmit = useCallback(() => {
    // Button click animation
    setIsButtonPressed(true)
    if (buttonTimerRef.current) {
      clearTimeout(buttonTimerRef.current)
    }
    buttonTimerRef.current = setTimeout(() => {
      setIsButtonPressed(false)
    }, 300)

    // Clear any existing timers
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current)
      fadeTimerRef.current = null
    }

    if (manualInput.trim() === "") {
      setValidationStatus("invalid")

      // Set up the fade out sequence
      fadeTimerRef.current = setTimeout(() => {
        setValidationStatus("none")
      }, 5000) // Show for 2 seconds, fade for 3 seconds

      return
    }

    const isValid = validateGameLog(manualInput)
    if (!isValid) {
      setValidationStatus("invalid")
      // Set up the fade out sequence
      fadeTimerRef.current = setTimeout(() => {
        setValidationStatus("none")
      }, 5000) // Show for 2 seconds, fade for 3 seconds
      return
    }

    // Get game data for confirmation
    try {
      const gameData = getGameDataForConfirmation(manualInput)
      setPendingGameData(gameData)
      setPendingGameLog(manualInput)
      setShowConfirmationDialog(true)
    } catch (error) {
      setValidationStatus("invalid")
      fadeTimerRef.current = setTimeout(() => {
        setValidationStatus("none")
      }, 5000)
    }
  }, [manualInput, validateGameLog])

  const handleConfirmImport = useCallback(
    (swapPlayers: boolean, userMainAttacker?: string, opponentMainAttacker?: string) => {
      setShowConfirmationDialog(false)
      setValidationStatus("valid")

      addGame(pendingGameLog, swapPlayers, userMainAttacker, opponentMainAttacker)

      // Set up the fade out sequence
      fadeTimerRef.current = setTimeout(() => {
        setValidationStatus("none")
      }, 5000) // Show for 2 seconds, fade for 3 seconds

      // Clear pending data
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
        if (user?.username === "Guest") {
          localStorage.setItem("guestGames", JSON.stringify(newGames))
        }
        return newGames
      })
      if (selectedGame && selectedGame.id === id) {
        setSelectedGame(null)
      }
    },
    [selectedGame, user],
  )

  const handleUpdateGame = useCallback(
    (updatedGame: GameSummary) => {
      setGames((prevGames) => {
        const newGames = prevGames.map((game) => (game.id === updatedGame.id ? updatedGame : game))
        if (user?.username === "Guest") {
          localStorage.setItem("guestGames", JSON.stringify(newGames))
        }
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

  const handleUpdateTags = useCallback((gameId: string, newTags: { text: string; color: string }[]) => {
    setGames((prevGames) =>
      prevGames.map((game) =>
        game.id === gameId
          ? {
              ...game,
              tags: newTags,
            }
          : game,
      ),
    )
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
      game.rawLog.toLowerCase().includes(searchLower) // Add this line to search through the entire game log
    )
  })

  const setSelectedGameSafely = useCallback(
    (game: GameSummary | null) => {
      if (game === null || games.some((g) => g.id === game.id)) {
        setSelectedGame(game)
      }
    },
    [games],
  )

  const buttonStyles = {
    transform: isButtonPressed ? "scale(0.95)" : "scale(1)",
    transition: "transform 0.1s ease-in-out",
  }

  return (
    <div className="container mx-auto p-4 min-h-screen">
      {!selectedGame && (
        <div className="mb-4 space-y-4">
          {" "}
          {/* Updated spacing here */}
          <div className="bg-blue-50 border-l-4 border-blue-300 text-blue-600 p-4 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200">
            <p className="font-bold">Welcome to the Pokémon TCG Game Analyzer!</p>
            <p>Paste your game log in the text area below to analyze it.</p>
          </div>
          <Textarea
            placeholder="Paste your game log here..."
            value={manualInput}
            onChange={(e) => {
              setManualInput(e.target.value)
              if (e.target.value.trim() === "") {
                setValidationStatus("none")
              }
            }}
            className="w-full h-40 bg-white dark:bg-[#272B33] text-gray-900 dark:text-white border-gray-300 dark:border-[#333740]"
          />
          <div className="flex items-center gap-3">
            <div className="custom-button-container">
              <Button
                onClick={handleManualSubmit}
                className={`bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white shadow-md hover:shadow-lg dark:shadow-gray-900/50 ${
                  isButtonPressed ? "scale-95" : "scale-100"
                }`}
              >
                Import
              </Button>
            </div>
            {validationStatus === "valid" && (
              <span
                className="text-green-600 dark:text-green-400 text-sm font-medium"
                style={{
                  animation: "fadeInOut 5s forwards",
                  opacity: 1,
                }}
              >
                Successful import
              </span>
            )}
            {validationStatus === "invalid" && (
              <span
                className="text-red-600 dark:text-red-400 text-sm font-medium"
                style={{
                  animation: "fadeInOut 5s forwards",
                  opacity: 1,
                }}
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
          onUpdateTags={handleUpdateTags}
        />
      ) : (
        <div>
          <div className="mb-4 relative">
            <div className="absolute right-0 bottom-0 z-10">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Adobe%20Express%20-%20file%20(1)-gw9KjtiqLw0FB7dvbasNRMwax0z9Qc.png"
                alt="Typhlosion pixel art"
                className="h-28 object-contain"
                style={{ transform: "scale(0.85)" }}
              />
            </div>
            <Input
              type="text"
              placeholder="Search for Pokémon..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-1/8 shadow-md bg-gray-100 dark:bg-[#272B33] dark:text-white dark:border-[#333740]"
            />
          </div>
          {filteredGames.length > 0 ? (
            <GameList
              games={filteredGames}
              onSelectGame={setSelectedGameSafely}
              onDeleteGame={handleDeleteGame}
              sortConfig={sortConfig}
              onSort={handleSort}
              showTags={true}
              isDarkMode={theme === "dark"}
            />
          ) : (
            <p className="text-gray-900 dark:text-white">No games found matching your search.</p>
          )}
        </div>
      )}

      {/* Import Confirmation Dialog */}
      <ImportConfirmationDialog
        open={showConfirmationDialog}
        onConfirm={handleConfirmImport}
        onCancel={handleCancelImport}
        gameData={
          pendingGameData || {
            userMainAttacker: "",
            opponentMainAttacker: "",
            username: "",
            opponent: "",
            allUserPokemon: [],
            allOpponentPokemon: [],
          }
        }
      />

      <style jsx global>{`
        @keyframes fadeInOut {
          0% { opacity: 0; }
          20% { opacity: 1; }
          60% { opacity: 1; }
          100% { opacity: 0; }
        }
        
        .custom-button-container {
          display: inline-block;
        }
      `}</style>
    </div>
  )
}
