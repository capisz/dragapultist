"use client"

import { cn } from "@/lib/utils"

interface DeckInfo {
  name: string
  list: string
  games: number
  wins: number
  losses: number
}

interface DeckListProps {
  decks: DeckInfo[]
  selectedDeck: DeckInfo | null
  onSelectDeck: (deck: DeckInfo) => void
}

export function DeckList({ decks, selectedDeck, onSelectDeck }: DeckListProps) {
  if (decks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No decks found. Add a deck when analyzing a game.
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
      {decks.map((deck) => (
        <div
          key={deck.name}
          className={cn(
            "p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700",
            selectedDeck?.name === deck.name
              ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500"
              : "bg-gray-50 dark:bg-gray-800/50",
          )}
          onClick={() => onSelectDeck(deck)}
        >
          <h4 className="font-medium text-gray-900 dark:text-white">{deck.name}</h4>
          <div className="flex justify-between mt-1 text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {deck.games} {deck.games === 1 ? "game" : "games"}
            </span>
            <span
              className={
                deck.wins > deck.losses ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }
            >
              {deck.wins} - {deck.losses}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
