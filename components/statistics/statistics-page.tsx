"use client"

import { useState, useEffect } from "react"
import type { User } from "@/types/auth"
import { UserProfile } from "./user-profile"
import { DeckList } from "./deck-list"
import { CardStatistics } from "./card-statistics"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OverallStats } from "./overall-stats"

interface StatisticsPageProps {
  user: User
}

interface DeckInfo {
  name: string
  list: string
  games: number
  wins: number
  losses: number
}

export function StatisticsPage({ user }: StatisticsPageProps) {
  const [decks, setDecks] = useState<DeckInfo[]>([])
  const [selectedDeck, setSelectedDeck] = useState<DeckInfo | null>(null)
  const [activeTab, setActiveTab] = useState("overview")

  // Load decks from localStorage
  useEffect(() => {
    const storedDecks = localStorage.getItem("pokemonDecks")
    if (storedDecks) {
      const parsedDecks = JSON.parse(storedDecks)

      // Add mock statistics for demonstration
      const decksWithStats = parsedDecks.map((deck: any) => ({
        ...deck,
        games: Math.floor(Math.random() * 20) + 5,
        wins: Math.floor(Math.random() * 15),
        losses: Math.floor(Math.random() * 10),
      }))

      setDecks(decksWithStats)

      // Set first deck as selected by default if available
      if (decksWithStats.length > 0) {
        setSelectedDeck(decksWithStats[0])
      }
    }
  }, [])

  // Load games from localStorage to calculate overall stats
  const [overallStats, setOverallStats] = useState({
    totalGames: 0,
    wins: 0,
    losses: 0,
    firstTurnWinRate: 0,
    avgTurns: 0,
    mostPlayedDeck: "",
    mostSuccessfulDeck: "",
  })

  useEffect(() => {
    const storedGames = localStorage.getItem("guestGames")
    if (storedGames) {
      const games = JSON.parse(storedGames)
      const totalGames = games.length
      const wins = games.filter((game: any) => game.userWon).length
      const losses = totalGames - wins
      const firstTurnGames = games.filter((game: any) => game.wentFirst)
      const firstTurnWins = firstTurnGames.filter((game: any) => game.userWon).length
      const firstTurnWinRate = firstTurnGames.length > 0 ? (firstTurnWins / firstTurnGames.length) * 100 : 0
      const avgTurns = games.reduce((acc: number, game: any) => acc + game.turns, 0) / totalGames

      // Find most played and most successful deck
      const deckCounts: Record<string, { games: number; wins: number }> = {}
      games.forEach((game: any) => {
        if (game.deckName) {
          if (!deckCounts[game.deckName]) {
            deckCounts[game.deckName] = { games: 0, wins: 0 }
          }
          deckCounts[game.deckName].games++
          if (game.userWon) {
            deckCounts[game.deckName].wins++
          }
        }
      })

      let mostPlayedDeck = ""
      let mostPlayedCount = 0
      let mostSuccessfulDeck = ""
      let bestWinRate = 0

      Object.entries(deckCounts).forEach(([deckName, stats]) => {
        if (stats.games > mostPlayedCount) {
          mostPlayedCount = stats.games
          mostPlayedDeck = deckName
        }

        const winRate = stats.games > 0 ? (stats.wins / stats.games) * 100 : 0
        if (stats.games >= 3 && winRate > bestWinRate) {
          bestWinRate = winRate
          mostSuccessfulDeck = deckName
        }
      })

      setOverallStats({
        totalGames,
        wins,
        losses,
        firstTurnWinRate,
        avgTurns,
        mostPlayedDeck: mostPlayedDeck || "None",
        mostSuccessfulDeck: mostSuccessfulDeck || "None",
      })
    }
  }, [])

  const handleDeckSelect = (deck: DeckInfo) => {
    setSelectedDeck(deck)
    setActiveTab("deck-stats")
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Statistics</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-1">
          <UserProfile user={user} />
        </div>
        <div className="md:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="deck-stats">Deck Statistics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <OverallStats stats={overallStats} />
            </TabsContent>

            <TabsContent value="deck-stats" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Your Decks</h3>
                  <DeckList decks={decks} selectedDeck={selectedDeck} onSelectDeck={handleDeckSelect} />
                </div>
                <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                  {selectedDeck ? (
                    <CardStatistics deck={selectedDeck} />
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                      Select a deck to view card statistics
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
