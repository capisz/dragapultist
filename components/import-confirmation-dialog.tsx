"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeftRight } from "lucide-react"

interface ImportConfirmationDialogProps {
  open: boolean
  onConfirm: (swapPlayers: boolean, userMainAttacker?: string, opponentMainAttacker?: string) => void
  onCancel: () => void
  gameData: {
    userMainAttacker: string
    opponentMainAttacker: string
    username: string
    opponent: string
    allUserPokemon: string[]
    allOpponentPokemon: string[]
  }
}

export function ImportConfirmationDialog({ open, onConfirm, onCancel, gameData }: ImportConfirmationDialogProps) {
  const [swapPlayers, setSwapPlayers] = useState(false)
  const [selectedUserMainAttacker, setSelectedUserMainAttacker] = useState("")
  const [selectedOpponentMainAttacker, setSelectedOpponentMainAttacker] = useState("")

  // Reset selections when dialog opens or game data changes
  useEffect(() => {
    if (open && gameData) {
      setSelectedUserMainAttacker(gameData.userMainAttacker)
      setSelectedOpponentMainAttacker(gameData.opponentMainAttacker)
    }
  }, [open, gameData])

  // Update selections when swapping players
  useEffect(() => {
    if (gameData) {
      if (swapPlayers) {
        setSelectedUserMainAttacker(gameData.opponentMainAttacker)
        setSelectedOpponentMainAttacker(gameData.userMainAttacker)
      } else {
        setSelectedUserMainAttacker(gameData.userMainAttacker)
        setSelectedOpponentMainAttacker(gameData.opponentMainAttacker)
      }
    }
  }, [swapPlayers, gameData])

  const handleSwap = () => {
    setSwapPlayers(!swapPlayers)
  }

  const handleConfirm = () => {
    onConfirm(swapPlayers, selectedUserMainAttacker, selectedOpponentMainAttacker)
    setSwapPlayers(false) // Reset for next time
  }

  const handleCancel = () => {
    onCancel()
    setSwapPlayers(false) // Reset for next time
  }

  // Determine what to display based on swap state
  const displayUsername = swapPlayers ? gameData.opponent : gameData.username
  const displayOpponentName = swapPlayers ? gameData.username : gameData.opponent
  const displayUserPokemon = swapPlayers ? gameData.allOpponentPokemon : gameData.allUserPokemon
  const displayOpponentPokemon = swapPlayers ? gameData.allUserPokemon : gameData.allOpponentPokemon

  // Clean Pokemon names (remove player prefixes)
  const cleanName = (name: string) => name.replace(/^.*'s\s/, "")

  // Check if main attackers are the same
  const sameAttackers = cleanName(gameData.userMainAttacker) === cleanName(gameData.opponentMainAttacker)

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[600px] bg-white dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
            Confirm Player Assignments & Main Attackers
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <p className="text-gray-700 dark:text-gray-300">
            Please confirm the player assignments and select the correct main attackers:
          </p>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-4">
            {/* Your Main Attacker Section */}
            <div className="space-y-2">
              <div className="font-medium text-gray-900 dark:text-white">
                Your Main Attacker:
                {sameAttackers && (
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">({displayUsername})</span>
                )}
              </div>
              <Select
                value={cleanName(selectedUserMainAttacker)}
                onValueChange={(value) => setSelectedUserMainAttacker(value)}
              >
                <SelectTrigger className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600">
                  <SelectValue placeholder="Select your main attacker" />
                </SelectTrigger>
                <SelectContent>
                  {displayUserPokemon.map((pokemon) => (
                    <SelectItem key={pokemon} value={cleanName(pokemon)}>
                      {cleanName(pokemon)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSwap}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white dark:border-gray-600"
              >
                <ArrowLeftRight className="h-4 w-4" />
                Swap Players
              </Button>
            </div>

            {/* Opponent Main Attacker Section */}
            <div className="space-y-2">
              <div className="font-medium text-gray-900 dark:text-white">
                Opponent's Main Attacker:
                {sameAttackers && (
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">({displayOpponentName})</span>
                )}
              </div>
              <Select
                value={cleanName(selectedOpponentMainAttacker)}
                onValueChange={(value) => setSelectedOpponentMainAttacker(value)}
              >
                <SelectTrigger className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600">
                  <SelectValue placeholder="Select opponent's main attacker" />
                </SelectTrigger>
                <SelectContent>
                  {displayOpponentPokemon.map((pokemon) => (
                    <SelectItem key={pokemon} value={cleanName(pokemon)}>
                      {cleanName(pokemon)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {swapPlayers && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-200">⚠️ Players will be swapped when imported</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="bg-blue-500 hover:bg-blue-600 text-white">
            Import Game
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
