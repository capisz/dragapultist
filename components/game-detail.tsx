"use client"

import { useMemo, useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Book, FileText } from 'lucide-react'
import { parseGameTurns, highlightAceSpecCards } from "@/utils/game-analyzer"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { CheckIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface GameSummary {
  // ... existing properties
  notes?: { [key: number]: string }
  date: string
  opponent: string
  wentFirst: boolean
  userMainAttacker: string
  userOtherPokemon: string[]
  opponentMainAttacker: string
  opponentOtherPokemon: string[]
  userWon: boolean
  damageDealt: number
  userPrizeCardsTaken: number
  opponentPrizeCardsTaken: number
  turns: number
  rawLog: string
  tags?: { text: string; color: string }[]
  deckList?: string
  deckName?: string
  userAceSpecs?: string[]
  opponentAceSpecs?: string[]
}

interface DeckInfo {
  name: string
  list: string
}

interface GameDetailProps {
  game: GameSummary
  onBack: () => void
  allGames?: GameSummary[]
  onUpdateGame: (updatedGame: GameSummary) => void
}

export function GameDetail({ game, onBack, allGames, onUpdateGame }: GameDetailProps) {
  const turns = parseGameTurns(game.rawLog)
  const [tags, setTags] = useState<{ text: string; color: string }[]>(game.tags || [])
  const [newTag, setNewTag] = useState("")
  const [newTagColor, setNewTagColor] = useState("#FF9999")
  const [isAddingTag, setIsAddingTag] = useState(false)
  const [turnNotes, setTurnNotes] = useState<{ [key: number]: string }>(game.notes || {})
  const [selectedPokemon, setSelectedPokemon] = useState<string | null>(null)
  const [isBackButtonPressed, setIsBackButtonPressed] = useState(false)
  const [isAddTagButtonPressed, setIsAddTagButtonPressed] = useState(false)
  const [isCancelTagButtonPressed, setIsCancelTagButtonPressed] = useState(false)
  const [isAddButtonPressed, setIsAddButtonPressed] = useState(false)
  const [flippedTurns, setFlippedTurns] = useState<Set<number>>(new Set())
  const [turnStats, setTurnStats] = useState<{[key: number]: {
    userCardsRemaining: number
    opponentCardsRemaining: number
    userCardsDrawn: number
    opponentCardsDrawn: number
    userCardsDiscarded: number
    opponentCardsDiscarded: number
    userEnergyAttached: number
    opponentEnergyAttached: number
  }}>({})

  // Main attackers are now edited in the import dialog

  // Add a deckName state
  const [deckList, setDeckList] = useState<string>(game.deckList || "")
  const [deckName, setDeckName] = useState<string>(game.deckName || "")
  const [showDeckListDialog, setShowDeckListDialog] = useState(false)
  const [deckListError, setDeckListError] = useState<string | null>(null)
  const [isDeckListValid, setIsDeckListValid] = useState(false)
  const [deckListStats, setDeckListStats] = useState<{
    pokemon: number
    trainer: number
    energy: number
    total: number
  }>({ pokemon: 0, trainer: 0, energy: 0, total: 0 })

  // Add state for existing decks
  const [existingDecks, setExistingDecks] = useState<DeckInfo[]>([])
  const [isNewDeck, setIsNewDeck] = useState(true)
  const [showNewDeckInput, setShowNewDeckInput] = useState(false)
  const [newDeckName, setNewDeckName] = useState("")

  // Load existing decks from localStorage
  useEffect(() => {
    const storedDecks = localStorage.getItem("pokemonDecks")
    if (storedDecks) {
      setExistingDecks(JSON.parse(storedDecks))
    }
  }, [])

  // Check if current deck matches any existing deck
  useEffect(() => {
    if (deckList && existingDecks.length > 0) {
      // Normalize deck list for comparison (remove whitespace, lowercase)
      const normalizedDeckList = deckList.replace(/\s+/g, " ").toLowerCase().trim()

      // Find matching deck
      const matchingDeck = existingDecks.find(
        (deck) => deck.list.replace(/\s+/g, " ").toLowerCase().trim() === normalizedDeckList,
      )

      if (matchingDeck) {
        setDeckName(matchingDeck.name)
        setIsNewDeck(false)
        setShowNewDeckInput(false)
      } else {
        setIsNewDeck(true)
        if (!deckName) {
          setShowNewDeckInput(true)
        }
      }
    }
  }, [deckList, existingDecks])

  // Initialize validation when dialog opens
  useEffect(() => {
    if (showDeckListDialog && deckList) {
      validateDeckList(deckList)
    }
  }, [showDeckListDialog, deckList])

  // Reset new deck input state when dialog opens
  useEffect(() => {
    if (showDeckListDialog) {
      // If there's no existing deck list, default to new deck mode
      if (
        !deckList ||
        !existingDecks.some(
          (deck) =>
            deck.list.replace(/\s+/g, " ").toLowerCase().trim() === deckList.replace(/\s+/g, " ").toLowerCase().trim(),
        )
      ) {
        setIsNewDeck(true)
        setShowNewDeckInput(true)
      }
    }
  }, [showDeckListDialog, deckList, existingDecks])

  // Calculate turn statistics from game log
  useEffect(() => {
    const calculateTurnStats = () => {
      const lines = game.rawLog.split('\n')
      const stats: any = {}
      let userDeckSize = 60
      let opponentDeckSize = 60
      let currentTurn = 0
      let setupComplete = false
      
      // Get player names from the log
      let username = ""
      let opponent = ""
      for (const line of lines) {
        if (line.includes("chose tails") || line.includes("chose heads")) {
          username = line.split(" ")[0]
        } else if (line.includes("won the coin toss")) {
          const winner = line.split(" ")[0]
          opponent = winner !== username ? winner : ""
          break
        }
      }

      // First pass: calculate initial deck sizes after setup
      let userInitialDraw = 7
      let opponentInitialDraw = 7
      let userMulligans = 0
      let opponentMulligans = 0

      lines.forEach((line) => {
        // Count mulligans during setup
        if (!setupComplete && line.includes("mulligan")) {
          if (line.startsWith(username)) {
            userMulligans++
          } else if (line.startsWith(opponent)) {
            opponentMulligans++
          }
        }
        
        // Setup is complete when first turn starts
        if (line.startsWith("Turn #")) {
          setupComplete = true
        }
      })

      // Calculate initial deck sizes: 60 - 7 (initial draw) - 6 (prize cards) - mulligans
      userDeckSize = 60 - userInitialDraw - 6 - userMulligans
      opponentDeckSize = 60 - opponentInitialDraw - 6 - opponentMulligans
      
      setupComplete = false // Reset for second pass

      lines.forEach((line) => {
        // Track turn changes
        if (line.startsWith("Turn #")) {
          const turnNumber = parseInt(line.split("#")[1])
          const gameTurn = Math.ceil(turnNumber / 2)
          if (gameTurn !== currentTurn) {
            currentTurn = gameTurn
            stats[currentTurn] = {
              userCardsRemaining: userDeckSize,
              opponentCardsRemaining: opponentDeckSize,
              userCardsDrawn: 0,
              opponentCardsDrawn: 0,
              userCardsDiscarded: 0,
              opponentCardsDiscarded: 0,
              userEnergyAttached: 0,
              opponentEnergyAttached: 0
            }
          }
          setupComplete = true
        }

        if (setupComplete && currentTurn > 0 && stats[currentTurn]) {
          // Track cards drawn - look for various patterns
          if (line.includes("drew") && (line.includes("card") || line.includes("cards"))) {
            // Match patterns like "drew 1 card", "drew 3 cards", "drew a card"
            const drawnMatch = line.match(/drew (?:a card|(\d+) cards?)/i)
            let drawnCount = 1
            if (drawnMatch && drawnMatch[1]) {
              drawnCount = parseInt(drawnMatch[1])
            }
            
            if (line.startsWith(username)) {
              stats[currentTurn].userCardsDrawn += drawnCount
              userDeckSize -= drawnCount
              stats[currentTurn].userCardsRemaining = userDeckSize
            } else if (line.startsWith(opponent)) {
              stats[currentTurn].opponentCardsDrawn += drawnCount
              opponentDeckSize -= drawnCount
              stats[currentTurn].opponentCardsRemaining = opponentDeckSize
            }
          }

          // Track cards discarded - look for specific discard patterns
          if (line.includes("discarded")) {
            // Look for patterns like "discarded 5 cards", "discarded 1 card", "discarded a card"
            const discardMatch = line.match(/discarded (?:a card|(\d+) cards?)/i)
            let discardCount = 1
            if (discardMatch && discardMatch[1]) {
              discardCount = parseInt(discardMatch[1])
            }
            
            if (line.startsWith(username)) {
              stats[currentTurn].userCardsDiscarded += discardCount
            } else if (line.startsWith(opponent)) {
              stats[currentTurn].opponentCardsDiscarded += discardCount
            }
          }

          // Track specific trainer card effects
          if (line.includes("Professor's Research") || line.includes("Professor Oak's Research")) {
            // These typically discard hand and draw 7
            if (line.startsWith(username)) {
              stats[currentTurn].userCardsDrawn += 7
              userDeckSize -= 7
              stats[currentTurn].userCardsRemaining = userDeckSize
              // Professor's Research typically discards your hand first
              stats[currentTurn].userCardsDiscarded += 7 // Approximate hand size
            } else if (line.startsWith(opponent)) {
              stats[currentTurn].opponentCardsDrawn += 7
              opponentDeckSize -= 7
              stats[currentTurn].opponentCardsRemaining = opponentDeckSize
              stats[currentTurn].opponentCardsDiscarded += 7
            }
          }

          // Track Battle VIP Pass and similar search effects
          if (line.includes("Battle VIP Pass") || line.includes("searched their deck")) {
            // These typically let you search for cards
            const searchMatch = line.match(/(?:found|took|added).*?(\d+)/i)
            let searchCount = 1
            if (searchMatch && searchMatch[1]) {
              searchCount = parseInt(searchMatch[1])
            }
            
            if (line.startsWith(username)) {
              userDeckSize -= searchCount
              stats[currentTurn].userCardsRemaining = userDeckSize
            } else if (line.startsWith(opponent)) {
              opponentDeckSize -= searchCount
              stats[currentTurn].opponentCardsRemaining = opponentDeckSize
            }
          }

          // Track Ultra Ball and similar discard-to-search effects
          if (line.includes("Ultra Ball") || (line.includes("discarded") && line.includes("searched"))) {
            // Ultra Ball typically discards 2 cards and searches for 1
            if (line.startsWith(username)) {
              stats[currentTurn].userCardsDiscarded += 2
              userDeckSize -= 1 // One card taken from deck
              stats[currentTurn].userCardsRemaining = userDeckSize
            } else if (line.startsWith(opponent)) {
              stats[currentTurn].opponentCardsDiscarded += 2
              opponentDeckSize -= 1
              stats[currentTurn].opponentCardsRemaining = opponentDeckSize
            }
          }

          // Track Pokégear 3.0 and similar effects
          if (line.includes("Pokégear") || line.includes("looked at the top")) {
            // These effects typically look at top cards and add some to hand
            const lookMatch = line.match(/looked at the top (\d+)/i)
            const addedMatch = line.match(/added (?:a card|(\d+) cards?) to.*?hand/i)
            
            if (addedMatch) {
              let addedCount = 1
              if (addedMatch[1]) {
                addedCount = parseInt(addedMatch[1])
              }
              
              if (line.startsWith(username)) {
                stats[currentTurn].userCardsDrawn += addedCount
                userDeckSize -= addedCount
                stats[currentTurn].userCardsRemaining = userDeckSize
              } else if (line.startsWith(opponent)) {
                stats[currentTurn].opponentCardsDrawn += addedCount
                opponentDeckSize -= addedCount
                stats[currentTurn].opponentCardsRemaining = opponentDeckSize
              }
            }
          }

          // Track energy attachments
          if (line.includes("attached") && line.includes("Energy")) {
            if (line.startsWith(username)) {
              stats[currentTurn].userEnergyAttached += 1
            } else if (line.startsWith(opponent)) {
              stats[currentTurn].opponentEnergyAttached += 1
            }
          }

          // Track cards put back into deck
          if (line.includes("put") && line.includes("back") && line.includes("deck")) {
            const putBackMatch = line.match(/put (?:a card|(\d+) cards?) back.*?deck/i)
            let putBackCount = 1
            if (putBackMatch && putBackMatch[1]) {
              putBackCount = parseInt(putBackMatch[1])
            }
            
            if (line.startsWith(username)) {
              userDeckSize += putBackCount
              stats[currentTurn].userCardsRemaining = userDeckSize
            } else if (line.startsWith(opponent)) {
              opponentDeckSize += putBackCount
              stats[currentTurn].opponentCardsRemaining = opponentDeckSize
            }
          }

          // Track deck shuffling effects that might return cards
          if (line.includes("shuffled") && line.includes("deck")) {
            // Some shuffle effects return discarded cards to deck
            // This is complex to track accurately without more context
            // For now, we'll just note that a shuffle occurred
          }

          // Track specific card effects that draw cards
          if (line.includes("Colress's Experiment") || line.includes("Cynthia's Ambition")) {
            // These typically draw 5 cards
            if (line.startsWith(username)) {
              stats[currentTurn].userCardsDrawn += 5
              userDeckSize -= 5
              stats[currentTurn].userCardsRemaining = userDeckSize
            } else if (line.startsWith(opponent)) {
              stats[currentTurn].opponentCardsDrawn += 5
              opponentDeckSize -= 5
              stats[currentTurn].opponentCardsRemaining = opponentDeckSize
            }
          }

          // Track Nest Ball and similar basic Pokemon search
          if (line.includes("Nest Ball") || (line.includes("searched") && line.includes("Basic"))) {
            if (line.startsWith(username)) {
              userDeckSize -= 1
              stats[currentTurn].userCardsRemaining = userDeckSize
            } else if (line.startsWith(opponent)) {
              opponentDeckSize -= 1
              stats[currentTurn].opponentCardsRemaining = opponentDeckSize
            }
          }

          // Update remaining cards for current turn
          if (stats[currentTurn]) {
            stats[currentTurn].userCardsRemaining = Math.max(0, userDeckSize)
            stats[currentTurn].opponentCardsRemaining = Math.max(0, opponentDeckSize)
          }
        }
      })

      setTurnStats(stats)
    }

    calculateTurnStats()
  }, [game.rawLog])

  const addTag = (tagText: string, tagColor: string) => {
    if (tagText && !tags.some((tag) => tag.text === tagText)) {
      setIsAddButtonPressed(true)
      setTimeout(() => {
        setIsAddButtonPressed(false)
        setTags([...tags, { text: tagText, color: tagColor }])
        setNewTag("")
        setNewTagColor("#FF9999")
        setIsAddingTag(false)
      }, 150)
    }
  }

  const cleanName = useCallback((name: string) => name.replace(/^.*'s\s/, ""), [])

  const mainPokemonWinRate = useMemo(() => {
    if (!allGames || !game.userMainAttacker) return null
    const mainPokemonGames = allGames.filter((g) => g.userMainAttacker.includes(cleanName(game.userMainAttacker)))
    const wins = mainPokemonGames.filter((g) => g.userWon).length
    const losses = mainPokemonGames.length - wins
    return { wins, losses, total: mainPokemonGames.length }
  }, [allGames, game.userMainAttacker, cleanName])

  const formatPokemonList = (mainAttacker: string, otherPokemon: string[], isUser: boolean) => {
    const uniquePokemon = [mainAttacker, ...otherPokemon]
      .map(cleanName)
      .filter((value, index, self) => self.indexOf(value) === index)

    const allPokemonUsed = [mainAttacker, ...otherPokemon]
      .map(cleanName)
      .filter((value, index, self) => self.indexOf(value) === index)

    const getWinRateColor = (wins: number, total: number) => {
      const winRate = total > 0 ? (wins / total) * 100 : 0
      if (winRate > 50) return "text-green-600"
      if (winRate < 50) return "text-red-600"
      return "text-yellow-600"
    }

    const handlePokemonClick = (pokemon: string) => {
      if (selectedPokemon === pokemon) {
        setSelectedPokemon(null)
        return
      }

      setSelectedPokemon(pokemon)

      const allTurnElements = document.querySelectorAll("[data-pokemon-action]")
      for (const element of allTurnElements) {
        if (element.textContent?.includes(pokemon)) {
          element.scrollIntoView({ behavior: "smooth", block: "center" })
          break
        }
      }
    }

    return (
      <>
        <div className="mb-2">
          <strong>
            {cleanName(mainAttacker)}{" "}
            {isUser && mainPokemonWinRate && (
              <span className={getWinRateColor(mainPokemonWinRate.wins, mainPokemonWinRate.total)}>
                ({mainPokemonWinRate.wins} - {mainPokemonWinRate.losses})
              </span>
            )}
          </strong>
        </div>
        {uniquePokemon.length > 1 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="link" className="p-0 h-auto font-normal ml-2">
                {uniquePokemon.length - 1} more
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto z-[60]" sideOffset={5} collisionPadding={20}>
              <ul className="list-disc pl-4">
                {uniquePokemon.slice(1).map((pokemon, index) => (
                  <li
                    key={index}
                    onClick={() => handlePokemonClick(pokemon)}
                    className={cn(
                      "cursor-pointer hover:text-blue-500 transition-colors",
                      selectedPokemon === pokemon && "text-blue-500 font-semibold",
                    )}
                  >
                    {pokemon}
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        )}
      </>
    )
  }

  // Update the handleBackClick function to save the deck name as well
  const handleBackClick = () => {
    setIsBackButtonPressed(true)
    setTimeout(() => {
      setIsBackButtonPressed(false)
      onUpdateGame({
        ...game,
        tags,
        notes: turnNotes,
        deckList,
        deckName,
      })
      onBack()
    }, 150)
  }

  // Function to validate and parse the deck list
  const validateDeckList = (list: string) => {
    // Reset error state
    setDeckListError(null)

    // Basic validation
    if (!list.trim()) {
      setDeckListError("Deck list cannot be empty")
      setIsDeckListValid(false)
      setDeckListStats({ pokemon: 0, trainer: 0, energy: 0, total: 0 })
      return
    }

    // Count cards by category
    const lines = list.split("\n").filter((line) => line.trim() !== "")
    let pokemonCount = 0
    let trainerCount = 0
    let energyCount = 0
    let currentSection = ""

    for (const line of lines) {
      // Check for section headers
      if (line.toLowerCase().includes("pokémon:") || line.toLowerCase().includes("pokemon:")) {
        currentSection = "pokemon"
        continue
      } else if (line.toLowerCase().includes("trainer:")) {
        currentSection = "trainer"
        continue
      } else if (line.toLowerCase().includes("energy:")) {
        currentSection = "energy"
        continue
      }

      // Parse card entries (e.g., "4 Pikachu V")
      const cardMatch = line.trim().match(/^(\d+)\s+(.+)/)
      if (cardMatch) {
        const count = Number.parseInt(cardMatch[1], 10)
        if (!isNaN(count)) {
          if (currentSection === "pokemon") {
            pokemonCount += count
          } else if (currentSection === "trainer") {
            trainerCount += count
          } else if (currentSection === "energy") {
            energyCount += count
          }
        }
      }
    }

    const totalCards = pokemonCount + trainerCount + energyCount

    setDeckListStats({
      pokemon: pokemonCount,
      trainer: trainerCount,
      energy: energyCount,
      total: totalCards,
    })

    if (totalCards !== 60) {
      setDeckListError(`Deck must contain exactly 60 cards. Current count: ${totalCards}`)
      setIsDeckListValid(false)
    } else {
      setIsDeckListValid(true)
    }
  }

  const handleSaveDeckList = () => {
    // If it's a new deck and we have a new name, save it
    if (isNewDeck && newDeckName.trim()) {
      const newDeck: DeckInfo = {
        name: newDeckName.trim(),
        list: deckList,
      }

      const updatedDecks = [...existingDecks, newDeck]
      setExistingDecks(updatedDecks)
      localStorage.setItem("pokemonDecks", JSON.stringify(updatedDecks))

      // Update the current deck name
      setDeckName(newDeckName.trim())
    }

    // Always update the game data when saved
    onUpdateGame({ ...game, deckList, deckName: isNewDeck ? newDeckName : deckName })
    setShowDeckListDialog(false)
  }

  const handleDeckSelection = (value: string) => {
    if (value === "new") {
      setIsNewDeck(true)
      setShowNewDeckInput(true)
      // Don't clear newDeckName if user is toggling back to "new"
    } else {
      setIsNewDeck(false)
      setShowNewDeckInput(false)
      setDeckName(value)

      // Find the deck and update the deck list
      const selectedDeck = existingDecks.find((deck) => deck.name === value)
      if (selectedDeck) {
        setDeckList(selectedDeck.list)
        validateDeckList(selectedDeck.list)
      }
    }
  }

  const handleTurnClick = (turnNumber: number) => {
    setFlippedTurns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(turnNumber)) {
        newSet.delete(turnNumber)
      } else {
        newSet.add(turnNumber)
      }
      return newSet
    })
  }

  return (
    <div className="space-y-4 text-gray-900 dark:text-white p-6 max-w-5xl mx-auto">
      <Button
        onClick={handleBackClick}
        className={`mb-4 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white transition-colors duration-200 shadow-md hover:shadow-lg dark:shadow-gray-900/50 ${
          isBackButtonPressed ? "scale-95" : "scale-100"
        }`}
      >
        &larr; Back to List
      </Button>
      <img
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Adobe%20Express%20-%20file%20(2)-eYxDSEggdsfteCbM9eAtv5qsFsZTh5.png"
        alt="Decorative Pokemon"
        className="float-right h-auto w-[200px] lg:w-[250px] xl:w-[300px] object-contain opacity-80 pointer-events-none -mr-4 mt-4 lg:mt-[400px]"
      />
      <h2 className="text-2xl font-bold">Game Details</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <p>
            <strong>Date:</strong> {game.date}
          </p>
          <p>
            <strong>Opponent:</strong> {game.opponent}
          </p>
          <p>
            <strong>Went First:</strong> {game.wentFirst ? "Yes" : "No"}
          </p>
          <p>
            <strong>Pokémon:</strong>
          </p>
          <div className="grid grid-cols-2 gap-4 mt-2 mb-4">
            <div className="max-h-[6em] overflow-hidden relative z-50">
              <strong>Your team:</strong>
              <br />
              {formatPokemonList(game.userMainAttacker, game.userOtherPokemon, true)}
            </div>
            <div className="max-h-[6em] overflow-hidden relative z-50">
              <strong>Opponent's team:</strong>
              <br />
              {formatPokemonList(game.opponentMainAttacker, game.opponentOtherPokemon, false)}
            </div>
          </div>
        </div>
        <div>
          <div>
            <p>
              <strong>Result:</strong>{" "}
              <span className={game.userWon ? "text-green-600" : "text-red-600"}>{game.userWon ? "Won" : "Lost"}</span>
            </p>
            <p>
              <strong>Damage Dealt:</strong> {game.damageDealt}
            </p>
            <p>
              <strong>Prize Cards Taken:</strong> {game.userPrizeCardsTaken} - {game.opponentPrizeCardsTaken}
            </p>
            <p>
              <strong>Turns:</strong> {game.turns}
            </p>
            {(game.userAceSpecs && game.userAceSpecs.length > 0) ||
            (game.opponentAceSpecs && game.opponentAceSpecs.length > 0) ? (
              <p>
                <strong>ACE SPEC Cards Used:</strong>
                <div className="mt-1">
                  {game.userAceSpecs && game.userAceSpecs.length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">You:</span> {game.userAceSpecs.join(", ")}
                    </div>
                  )}
                  {game.opponentAceSpecs && game.opponentAceSpecs.length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">Opponent:</span> {game.opponentAceSpecs.join(", ")}
                    </div>
                  )}
                </div>
              </p>
            ) : null}
            <p className="mt-2">
              <Button
                onClick={() => setShowDeckListDialog(true)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white transition-colors duration-200 shadow-md hover:shadow-lg dark:shadow-gray-900/50"
              >
                <FileText className="mr-2 h-4 w-4" />
                {game.deckList || deckList ? "View/Edit Deck List" : "Add Deck List"}
              </Button>
            </p>
            <div className="mt-4 flex items-center flex-wrap">
              <strong className="mr-2">Tags:</strong>
              <div className="flex flex-wrap gap-2 items-center">
                {tags
                  .filter((tag) => tag.text !== "Win" && tag.text !== "Loss")
                  .map((tag, index) => (
                    <Badge
                      key={index}
                      style={{
                        backgroundColor: tag.color,
                        color: getContrastColor(tag.color),
                      }}
                      className="flex items-center bg-opacity-70 hover:bg-opacity-100 transition-colors duration-200 shadow-sm hover:shadow-md"
                    >
                      {tag.text}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setTags(tags.filter((_, i) => i !== index))
                        }}
                        className="ml-2 text-xs font-bold hover:text-red-500 focus:outline-none"
                        aria-label={`Remove ${tag.text} tag`}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                {game.userPrizeCardsTaken === 6 && game.opponentPrizeCardsTaken === 0 && (
                  <Badge
                    style={{ backgroundColor: "#FFD1DC", color: "#000000" }}
                    className="flex items-center bg-opacity-70 hover:bg-opacity-100 transition-colors duration-200 shadow-sm hover:shadow-md"
                  >
                    Flawless
                  </Badge>
                )}
                {isAddingTag ? (
                  <>
                    <Input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          addTag(newTag, newTagColor)
                        }
                      }}
                      className="w-24 mr-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                    />
                    <div className="flex space-x-2">
                      {["#FFB7B2", "#FFDAC1", "#E2F0CB", "#B5EAD7", "#C7CEEA", "#FF9AA2"].map((color) => (
                        <button
                          key={color}
                          className={cn(
                            "w-6 h-6 rounded-full border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-500",
                            newTagColor === color && "border-gray-400",
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewTagColor(color)}
                        />
                      ))}
                    </div>
                    <Button
                      onClick={() => {
                        setIsAddButtonPressed(true)
                        setTimeout(() => {
                          setIsAddButtonPressed(false)
                          addTag(newTag, selectedPokemon ? getBabyColor(selectedPokemon) : newTagColor)
                        }, 150)
                      }}
                      size="sm"
                      className={`bg-blue-100 hover:bg-blue-200 text-blue-800 transition-colors duration-200 shadow-sm hover:shadow-md ${
                        isAddButtonPressed ? "scale-95" : "scale-100"
                      }`}
                    >
                      Add
                    </Button>
                    <Button
                      onClick={() => {
                        setIsCancelTagButtonPressed(true)
                        setTimeout(() => {
                          setIsCancelTagButtonPressed(false)
                          setIsAddingTag(false)
                        }, 150)
                      }}
                      size="sm"
                      className={`bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors duration-200 shadow-sm hover:shadow-md ${
                        isCancelTagButtonPressed ? "scale-95" : "scale-100"
                      }`}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => {
                      setIsAddTagButtonPressed(true)
                      setTimeout(() => {
                        setIsAddTagButtonPressed(false)
                        setIsAddingTag(true)
                      }, 150)
                    }}
                    size="sm"
                    className={`bg-blue-100 hover:bg-blue-200 text-blue-800 transition-colors duration-200 shadow-sm hover:shadow-md ${
                      isAddTagButtonPressed ? "scale-95" : "scale-100"
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto relative z-0">
        <div className="space-y-4 shadow-[0_0_10px_rgba(0,0,0,0.1)] dark:shadow-[0_0_15px_rgba(0,0,0,0.3)]">
          {turns.map((turn) => (
            <div
              key={turn.turnNumber}
              className="rounded-2xl p-4 shadow-md dark:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.2),0_2px_4px_-2px_rgba(0,0,0,0.2)] relative overflow-hidden cursor-pointer"
              onClick={() => handleTurnClick(turn.turnNumber)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#FBF8F1] to-[#F7F2E7] dark:from-[#2A2F38] dark:to-[#232831] pointer-events-none"></div>
              <div className="relative z-10 rounded-xl overflow-hidden">
                <h3 className="text-lg font-semibold mb-2 flex items-center justify-between">
                  {turn.turnNumber === 0 ? "Setup" : `Turn ${turn.turnNumber}`}
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {flippedTurns.has(turn.turnNumber) ? "Click to hide stats" : "Click to show stats"}
                  </span>
                </h3>
                
                {!flippedTurns.has(turn.turnNumber) ? (
                  // Normal turn view
                  <>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="absolute bottom-2 right-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 z-20">
                          {turnNotes[turn.turnNumber] ? (
                            <Book className="w-4 h-4 text-blue-500" />
                          ) : (
                            <Pencil className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-0 overflow-hidden rounded-lg">
                        <div className="relative">
                          <Textarea
                            placeholder="Add a note for this turn..."
                            value={turnNotes[turn.turnNumber] || ""}
                            onChange={(e) => {
                              const newNotes = { ...turnNotes, [turn.turnNumber]: e.target.value }
                              setTurnNotes(newNotes)
                            }}
                            className="min-h-[80px] max-h-[120px] border-none focus:ring-0 rounded-none pr-10 text-sm bg-gray-50 dark:bg-gray-800"
                          />
                          <Button
                            className="absolute top-2 right-2 h-6 w-6 p-0 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
                            onClick={() => {
                              onUpdateGame({ ...game, notes: turnNotes })
                              const popoverTrigger = document.querySelector(
                                `[data-state="open"][aria-haspopup="dialog"]`,
                              ) as HTMLElement
                              popoverTrigger?.click()
                            }}
                          >
                            <CheckIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-[#E8F5E9] to-[#C8E6C9] p-3 rounded-xl dark:from-[#AFDBD2] dark:to-[#8ECFC3]">
                        <h4 className="font-medium mb-1 dark:text-gray-800">You</h4>
                        <ul className="space-y-1 dark:text-gray-800">
                          {turn.userActions.map((action, index) => (
                            <li
                              key={index}
                              data-pokemon-action
                              className={`text-sm ${
                                selectedPokemon && action.includes(selectedPokemon)
                                  ? "bg-[#FFF4CC] dark:bg-[#FFF4CC] px-1 rounded transition-colors duration-200"
                                  : ""
                              }`}
                              dangerouslySetInnerHTML={{
                                __html:
                                  action.includes("drew") || action.includes("drawn")
                                    ? `<strong><em>${highlightAceSpecCards(action)}</em></strong>`
                                    : action.includes("damage")
                                      ? `<strong>${action.includes("Knocked Out") ? `<u>${highlightAceSpecCards(action)}</u>` : highlightAceSpecCards(action)}</strong>`
                                      : action.includes("Knocked Out")
                                        ? `<strong><u>${highlightAceSpecCards(action)}</u></strong>`
                                        : action.includes("conceded the game")
                                          ? `<strong style="color: #dc2626;">${highlightAceSpecCards(action)}</strong>`
                                          : action.includes("You won")
                                            ? `<strong style="color: #16a34a;" class="flex items-center gap-2">${highlightAceSpecCards(action)}<img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/494-Kl7SRdC5ClhprQJ6w3ugfVSUCwsfCH.webp" alt="Victory Victini" class="w-12 h-12 inline-block -mt-2" /></strong>`
                                            : highlightAceSpecCards(action),
                              }}
                            />
                          ))}
                        </ul>
                      </div>
                      <div className="bg-gradient-to-br from-[#E8F0FE] to-[#C5CAE9] p-3 rounded-xl dark:from-[#B3E5FC] dark:to-[#81D4FA]">
                        <h4 className="font-medium mb-1 dark:text-gray-800">Opponent</h4>
                        <ul className="space-y-1 dark:text-gray-800">
                          {turn.opponentActions.map((action, index) => (
                            <li
                              key={index}
                              data-pokemon-action
                              className={`text-sm ${
                                selectedPokemon && action.includes(selectedPokemon)
                                  ? "bg-[#FFF4CC] dark:bg-[#FFF4CC] px-1 rounded transition-colors duration-200"
                                  : ""
                              }`}
                              dangerouslySetInnerHTML={{
                                __html:
                                  action.includes("drew") || action.includes("drawn")
                                    ? `<strong><em>${highlightAceSpecCards(action)}</em></strong>`
                                    : action.includes("damage")
                                      ? `<strong>${action.includes("Knocked Out") ? `<u>${highlightAceSpecCards(action)}</u>` : highlightAceSpecCards(action)}</strong>`
                                      : action.includes("Knocked Out")
                                        ? `<strong><u>${highlightAceSpecCards(action)}</u></strong>`
                                        : action.includes("conceded the game")
                                          ? `<strong style="color: #dc2626;">${highlightAceSpecCards(action)}</strong>`
                                          : action.includes("Opponent won")
                                            ? `<strong style="color: #dc2626;">${highlightAceSpecCards(action)}</strong>`
                                            : highlightAceSpecCards(action),
                              }}
                            />
                          ))}
                        </ul>
                      </div>
                    </div>
                  </>
                ) : (
                  // Statistics view
                  <div className="bg-gradient-to-br from-[#F0F8FF] to-[#E6F3FF] dark:from-[#1E3A5F] dark:to-[#2D4A6B] p-4 rounded-xl">
                    <h4 className="font-medium mb-3 text-center dark:text-white">Turn Statistics</h4>
                    {turnStats[turn.turnNumber] ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg">
                          <h5 className="font-semibold mb-2 text-green-700 dark:text-green-300">You</h5>
                          <div className="space-y-1 text-sm">
                            <div>Cards Remaining: <span className="font-medium">{turnStats[turn.turnNumber].userCardsRemaining}</span></div>
                            <div>Cards Drawn: <span className="font-medium">{turnStats[turn.turnNumber].userCardsDrawn}</span></div>
                            <div>Cards Discarded: <span className="font-medium">{turnStats[turn.turnNumber].userCardsDiscarded}</span></div>
                            <div>Energy Attached: <span className="font-medium">{turnStats[turn.turnNumber].userEnergyAttached}</span></div>
                          </div>
                        </div>
                        <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg">
                          <h5 className="font-semibold mb-2 text-blue-700 dark:text-blue-300">Opponent</h5>
                          <div className="space-y-1 text-sm">
                            <div>Cards Remaining: <span className="font-medium">{turnStats[turn.turnNumber].opponentCardsRemaining}</span></div>
                            <div>Cards Drawn: <span className="font-medium">{turnStats[turn.turnNumber].opponentCardsDrawn}</span></div>
                            <div>Cards Discarded: <span className="font-medium">{turnStats[turn.turnNumber].opponentCardsDiscarded}</span></div>
                            <div>Energy Attached: <span className="font-medium">{turnStats[turn.turnNumber].opponentEnergyAttached}</span></div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        No statistics available for this turn
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <Button
        onClick={handleBackClick}
        className={`mt-4 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white transition-colors duration-200 shadow-md hover:shadow-lg dark:shadow-gray-900/50 ${
          isBackButtonPressed ? "scale-95" : "scale-100"
        }`}
      >
        &larr; Back to List
      </Button>

      {/* Deck List Dialog */}
      <Dialog open={showDeckListDialog} onOpenChange={setShowDeckListDialog}>
        <DialogContent className="sm:max-w-[600px] bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
              {game.deckList ? "View/Edit Deck List" : "Add Deck List"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="deckName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Deck Name
              </label>

              {/* Deck selection with conditional rendering for new deck input */}
              <div className="space-y-2">
                <Select value={isNewDeck ? "new" : deckName} onValueChange={handleDeckSelection}>
                  <SelectTrigger className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700">
                    <SelectValue placeholder="Select a deck or create new" />
                  </SelectTrigger>
                  <SelectContent>
                    {existingDecks.map((deck) => (
                      <SelectItem key={deck.name} value={deck.name}>
                        {deck.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="new">+ Create New Deck</SelectItem>
                  </SelectContent>
                </Select>

                {/* Always show input when creating a new deck */}
                {showNewDeckInput && (
                  <div className="mt-2">
                    <Input
                      type="text"
                      id="newDeckName"
                      placeholder="Enter a name for your new deck"
                      value={newDeckName}
                      onChange={(e) => setNewDeckName(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700"
                    />
                  </div>
                )}
              </div>
            </div>
            <Textarea
              placeholder="Paste your deck list here..."
              value={deckList}
              onChange={(e) => {
                setDeckList(e.target.value)
                validateDeckList(e.target.value)
              }}
              className="min-h-[300px] font-mono text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700"
            />

            {/* Update the color logic in the deck list dialog */}
            {deckListStats.total > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">Pokémon: {deckListStats.pokemon}</span>
                <span className="text-gray-700 dark:text-gray-300">Trainer: {deckListStats.trainer}</span>
                <span className="text-gray-700 dark:text-gray-300">Energy: {deckListStats.energy}</span>
                <span
                  className={`font-bold ${deckListStats.total === 60 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                >
                  Total: {deckListStats.total}/60
                </span>
              </div>
            )}

            {deckListError && <p className="text-red-500 dark:text-red-400 text-sm">{deckListError}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeckListDialog(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveDeckList}
              className="bg-blue-500 hover:bg-blue-600 text-white"
              disabled={isNewDeck && !newDeckName.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getContrastColor(hexColor: string) {
  const r = Number.parseInt(hexColor.slice(1, 3), 16)
  const g = Number.parseInt(hexColor.slice(3, 5), 16)
  const b = Number.parseInt(hexColor.slice(5, 7), 16)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 128 ? "black" : "white"
}

function getLighterColor(color: string): string {
  return color === "black" ? "#333333" : "#FFFFFF"
}

function getBabyColor(tagText: string): string {
  const colors = [
    "#FFB7B2", // Light Pink
    "#FFDAC1", // Light Peach
    "#E2F0CB", // Light Mint
    "#B5EAD7", // Light Turquoise
    "#C7CEEA", // Light Periwinkle
    "#FF9AA2", // Light Coral
  ]

  // Simple hash function to consistently assign colors based on tag text
  const hash = tagText.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}
