"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface DeckInfo {
  name: string
  list: string
  games: number
  wins: number
  losses: number
}

interface CardStat {
  name: string
  count: number
  usagePercentage: number
  firstTurnPercentage: number
  firstTurnWinPercentage: number
}

interface CardStatisticsProps {
  deck: DeckInfo
}

export function CardStatistics({ deck }: CardStatisticsProps) {
  const [cards, setCards] = useState<CardStat[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  // Parse deck list and generate mock statistics
  useEffect(() => {
    if (!deck.list) return

    const lines = deck.list.split("\n").filter((line) => line.trim() !== "")
    const cardStats: CardStat[] = []

    lines.forEach((line) => {
      // Parse card entries (e.g., "4 Pikachu V")
      const cardMatch = line.trim().match(/^(\d+)\s+(.+)/)
      if (cardMatch) {
        const count = Number.parseInt(cardMatch[1], 10)
        const name = cardMatch[2]

        if (!isNaN(count) && name) {
          // Generate mock statistics
          const usagePercentage = Math.floor(Math.random() * 100)
          const firstTurnPercentage = Math.floor(Math.random() * 60)
          const firstTurnWinPercentage = Math.floor(Math.random() * 100)

          cardStats.push({
            name,
            count,
            usagePercentage,
            firstTurnPercentage,
            firstTurnWinPercentage,
          })
        }
      }
    })

    setCards(cardStats)
  }, [deck])

  const filteredCards = cards.filter((card) => card.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{deck.name} Statistics</h3>
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input
            placeholder="Search cards..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100 dark:bg-gray-800">
              <TableHead className="w-[180px]">Card</TableHead>
              <TableHead className="text-center">Count</TableHead>
              <TableHead className="text-center">Usage %</TableHead>
              <TableHead className="text-center">First Turn %</TableHead>
              <TableHead className="text-center">First Turn Win %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCards.length > 0 ? (
              filteredCards.map((card, index) => (
                <TableRow key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                  <TableCell className="font-medium">{card.name}</TableCell>
                  <TableCell className="text-center">{card.count}</TableCell>
                  <TableCell className="text-center">{card.usagePercentage}%</TableCell>
                  <TableCell className="text-center">{card.firstTurnPercentage}%</TableCell>
                  <TableCell className="text-center">
                    <span
                      className={
                        card.firstTurnWinPercentage > 60
                          ? "text-green-600 dark:text-green-400"
                          : card.firstTurnWinPercentage < 40
                            ? "text-red-600 dark:text-red-400"
                            : ""
                      }
                    >
                      {card.firstTurnWinPercentage}%
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-gray-500 dark:text-gray-400">
                  {searchTerm ? "No cards match your search" : "No cards found in this deck"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        <p>
          <strong>Usage %:</strong> Percentage of games where this card was played
        </p>
        <p>
          <strong>First Turn %:</strong> Percentage of games where this card was played on the first turn
        </p>
        <p>
          <strong>First Turn Win %:</strong> Win rate when this card is played on the first turn
        </p>
      </div>
    </div>
  )
}
