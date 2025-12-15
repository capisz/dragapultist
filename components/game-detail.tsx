"use client"

import { useMemo, useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Book, FileText, Map } from "lucide-react"
import { parseGameTurns, highlightAceSpecCards } from "@/utils/game-analyzer"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { CheckIcon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { GameSummary } from "@/types/game"

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

const FALLBACK_ICON = "/sprites/substitute.png"

export function GameDetail({ game, onBack, allGames, onUpdateGame }: GameDetailProps) {
  const turns = parseGameTurns(game.rawLog)

  const [tags, setTags] = useState<{ text: string; color: string }[]>(game.tags || [])
  const [newTag, setNewTag] = useState("")
  const [newTagColor, setNewTagColor] = useState("#FF9999")
  const [isAddingTag, setIsAddingTag] = useState(false)
  const [turnNotes, setTurnNotes] = useState<{ [key: number]: string }>(game.notes || {})
  const [selectedPokemon, setSelectedPokemon] = useState<string | null>(null)
  const [isBackButtonPressed, setIsBackButtonPressed] = useState(false)
  const [isCancelTagButtonPressed, setIsCancelTagButtonPressed] = useState(false)
  const [isAddButtonPressed, setIsAddButtonPressed] = useState(false)

  const [flippedTurns, setFlippedTurns] = useState<Set<number>>(new Set())
  const [turnStats, setTurnStats] = useState<{
    [key: number]: {
      userCardsRemaining: number
      opponentCardsRemaining: number
      userCardsDrawn: number
      opponentCardsDrawn: number
      userCardsDiscarded: number
      opponentCardsDiscarded: number
      userEnergyAttached: number
      opponentEnergyAttached: number
    }
  }>({})

  const [deckList, setDeckList] = useState<string>(game.deckList || "")
  const [deckName, setDeckName] = useState<string>(game.deckName || "")
  const [showDeckListDialog, setShowDeckListDialog] = useState(false)
  const [deckListError, setDeckListError] = useState<string | null>(null)
  const [_isDeckListValid, setIsDeckListValid] = useState(false)
  const [deckListStats, setDeckListStats] = useState<{
    pokemon: number
    trainer: number
    energy: number
    total: number
  }>({ pokemon: 0, trainer: 0, energy: 0, total: 0 })

  const [existingDecks, setExistingDecks] = useState<DeckInfo[]>([])
  const [isNewDeck, setIsNewDeck] = useState(true)
  const [showNewDeckInput, setShowNewDeckInput] = useState(false)
  const [newDeckName, setNewDeckName] = useState("")

  // Prize map popover (hoverable)
  const [prizePopoverOpen, setPrizePopoverOpen] = useState(false)

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
      const normalizedDeckList = deckList.replace(/\s+/g, " ").toLowerCase().trim()

      const matchingDeck = existingDecks.find(
        (deck) => deck.list.replace(/\s+/g, " ").toLowerCase().trim() === normalizedDeckList,
      )

      if (matchingDeck) {
        setDeckName(matchingDeck.name)
        setIsNewDeck(false)
        setShowNewDeckInput(false)
      } else {
        setIsNewDeck(true)
        if (!deckName) setShowNewDeckInput(true)
      }
    }
  }, [deckList, existingDecks, deckName])

  // Initialize validation when dialog opens
  useEffect(() => {
    if (showDeckListDialog && deckList) validateDeckList(deckList)
  }, [showDeckListDialog, deckList])

  // Reset new deck input state when dialog opens
  useEffect(() => {
    if (showDeckListDialog) {
      const matchesExisting = !!deckList &&
        existingDecks.some(
          (deck) =>
            deck.list.replace(/\s+/g, " ").toLowerCase().trim() ===
            deckList.replace(/\s+/g, " ").toLowerCase().trim(),
        )

      if (!matchesExisting) {
        setIsNewDeck(true)
        setShowNewDeckInput(true)
      }
    }
  }, [showDeckListDialog, deckList, existingDecks])

  // -------- Prize map derivation (per-player) --------
  const players = useMemo(() => {
    const fromLog = extractTwoPlayersFromRawLog(game.rawLog)
    const storedUser = ((game as any).username ?? "").trim()
    const storedOpp = (game.opponent ?? "").trim()

    // Prefer stored values if present
    let user = storedUser
    let opp = storedOpp

    // If we have two names from log and opponent is known, pick the other as user.
    if (fromLog.p1 && fromLog.p2) {
      if (!opp || opp === "-") {
        // try to pick opponent as "the other" relative to storedUser
        if (storedUser && normalizeLoose(storedUser) === normalizeLoose(fromLog.p1)) {
          opp = fromLog.p2
          user = storedUser
        } else if (storedUser && normalizeLoose(storedUser) === normalizeLoose(fromLog.p2)) {
          opp = fromLog.p1
          user = storedUser
        } else {
          // fallback: p1 as user, p2 as opponent
          user = user || fromLog.p1
          opp = opp || fromLog.p2
        }
      } else {
        // opponent known; determine user as the other log name if possible
        const oppNorm = normalizeLoose(opp)
        if (oppNorm === normalizeLoose(fromLog.p1)) {
          user = user || fromLog.p2
        } else if (oppNorm === normalizeLoose(fromLog.p2)) {
          user = user || fromLog.p1
        } else {
          user = user || fromLog.p1
        }
      }
    }

    return {
      user: user || fromLog.p1 || "",
      opp: opp || fromLog.p2 || "",
    }
  }, [game.rawLog, game.opponent])

  const userPrizeMap = useMemo(() => {
    if (!players.user) return []
    return derivePrizeMapForPlayer(game.rawLog, players.user)
  }, [game.rawLog, players.user])

  const oppPrizeMap = useMemo(() => {
    if (!players.opp) return []
    return derivePrizeMapForPlayer(game.rawLog, players.opp)
  }, [game.rawLog, players.opp])

  // Calculate turn statistics from game log
  useEffect(() => {
    const calculateTurnStats = () => {
      const lines = game.rawLog.split("\n")
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

      let userInitialDraw = 7
      let opponentInitialDraw = 7
      let userMulligans = 0
      let opponentMulligans = 0

      lines.forEach((line) => {
        if (!setupComplete && line.includes("mulligan")) {
          if (line.startsWith(username)) userMulligans++
          else if (line.startsWith(opponent)) opponentMulligans++
        }

        if (line.startsWith("Turn #")) setupComplete = true
      })

      userDeckSize = 60 - userInitialDraw - 6 - userMulligans
      opponentDeckSize = 60 - opponentInitialDraw - 6 - opponentMulligans

      setupComplete = false

      lines.forEach((line) => {
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
              opponentEnergyAttached: 0,
            }
          }
          setupComplete = true
        }

        if (setupComplete && currentTurn > 0 && stats[currentTurn]) {
          if (line.includes("drew") && (line.includes("card") || line.includes("cards"))) {
            const drawnMatch = line.match(/drew (?:a card|(\d+) cards?)/i)
            let drawnCount = 1
            if (drawnMatch && drawnMatch[1]) drawnCount = parseInt(drawnMatch[1])

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

          if (line.includes("discarded")) {
            const discardMatch = line.match(/discarded (?:a card|(\d+) cards?)/i)
            let discardCount = 1
            if (discardMatch && discardMatch[1]) discardCount = parseInt(discardMatch[1])

            if (line.startsWith(username)) stats[currentTurn].userCardsDiscarded += discardCount
            else if (line.startsWith(opponent)) stats[currentTurn].opponentCardsDiscarded += discardCount
          }

          if (line.includes("Professor's Research") || line.includes("Professor Oak's Research")) {
            if (line.startsWith(username)) {
              stats[currentTurn].userCardsDrawn += 7
              userDeckSize -= 7
              stats[currentTurn].userCardsRemaining = userDeckSize
              stats[currentTurn].userCardsDiscarded += 7
            } else if (line.startsWith(opponent)) {
              stats[currentTurn].opponentCardsDrawn += 7
              opponentDeckSize -= 7
              stats[currentTurn].opponentCardsRemaining = opponentDeckSize
              stats[currentTurn].opponentCardsDiscarded += 7
            }
          }

          if (line.includes("Battle VIP Pass") || line.includes("searched their deck")) {
            const searchMatch = line.match(/(?:found|took|added).*?(\d+)/i)
            let searchCount = 1
            if (searchMatch && searchMatch[1]) searchCount = parseInt(searchMatch[1])

            if (line.startsWith(username)) {
              userDeckSize -= searchCount
              stats[currentTurn].userCardsRemaining = userDeckSize
            } else if (line.startsWith(opponent)) {
              opponentDeckSize -= searchCount
              stats[currentTurn].opponentCardsRemaining = opponentDeckSize
            }
          }

          if (line.includes("Ultra Ball") || (line.includes("discarded") && line.includes("searched"))) {
            if (line.startsWith(username)) {
              stats[currentTurn].userCardsDiscarded += 2
              userDeckSize -= 1
              stats[currentTurn].userCardsRemaining = userDeckSize
            } else if (line.startsWith(opponent)) {
              stats[currentTurn].opponentCardsDiscarded += 2
              opponentDeckSize -= 1
              stats[currentTurn].opponentCardsRemaining = opponentDeckSize
            }
          }

          if (line.includes("Pokégear") || line.includes("looked at the top")) {
            const addedMatch = line.match(/added (?:a card|(\d+) cards?) to.*?hand/i)

            if (addedMatch) {
              let addedCount = 1
              if (addedMatch[1]) addedCount = parseInt(addedMatch[1])

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

          if (line.includes("attached") && line.includes("Energy")) {
            if (line.startsWith(username)) stats[currentTurn].userEnergyAttached += 1
            else if (line.startsWith(opponent)) stats[currentTurn].opponentEnergyAttached += 1
          }

          if (line.includes("put") && line.includes("back") && line.includes("deck")) {
            const putBackMatch = line.match(/put (?:a card|(\d+) cards?) back.*?deck/i)
            let putBackCount = 1
            if (putBackMatch && putBackMatch[1]) putBackCount = parseInt(putBackMatch[1])

            if (line.startsWith(username)) {
              userDeckSize += putBackCount
              stats[currentTurn].userCardsRemaining = userDeckSize
            } else if (line.startsWith(opponent)) {
              opponentDeckSize += putBackCount
              stats[currentTurn].opponentCardsRemaining = opponentDeckSize
            }
          }

          if (line.includes("Colress's Experiment") || line.includes("Cynthia's Ambition")) {
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

          if (line.includes("Nest Ball") || (line.includes("searched") && line.includes("Basic"))) {
            if (line.startsWith(username)) {
              userDeckSize -= 1
              stats[currentTurn].userCardsRemaining = userDeckSize
            } else if (line.startsWith(opponent)) {
              opponentDeckSize -= 1
              stats[currentTurn].opponentCardsRemaining = opponentDeckSize
            }
          }

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
        setTags((prev) => [...prev, { text: tagText, color: tagColor }])
        setNewTag("")
        setNewTagColor("#FF9999")
        setIsAddingTag(false)
      }, 150)
    }
  }

  const removeTag = (tagText: string) => {
    setTags((prev) => prev.filter((tag) => tag.text !== tagText))
  }

  const cleanName = useCallback((name: string) => name.replace(/^.*'s\s/, ""), [])

  const mainPokemonWinRate = useMemo(() => {
    if (!allGames || !game.userMainAttacker) return null
    const mainPokemonGames = allGames.filter((g) =>
      g.userMainAttacker.includes(cleanName(game.userMainAttacker)),
    )
    const wins = mainPokemonGames.filter((g) => g.userWon).length
    const losses = mainPokemonGames.length - wins
    return { wins, losses, total: mainPokemonGames.length }
  }, [allGames, game.userMainAttacker, cleanName])

  const formatPokemonList = (mainAttacker: string, otherPokemon: string[], isUser: boolean) => {
    const uniquePokemon = [mainAttacker, ...otherPokemon]
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

  const validateDeckList = (list: string) => {
    setDeckListError(null)

    if (!list.trim()) {
      setDeckListError("Deck list cannot be empty")
      setIsDeckListValid(false)
      setDeckListStats({ pokemon: 0, trainer: 0, energy: 0, total: 0 })
      return
    }

    const lines = list.split("\n").filter((line) => line.trim() !== "")
    let pokemonCount = 0
    let trainerCount = 0
    let energyCount = 0
    let currentSection = ""

    for (const line of lines) {
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

      const cardMatch = line.trim().match(/^(\d+)\s+(.+)/)
      if (cardMatch) {
        const count = Number.parseInt(cardMatch[1], 10)
        if (!isNaN(count)) {
          if (currentSection === "pokemon") pokemonCount += count
          else if (currentSection === "trainer") trainerCount += count
          else if (currentSection === "energy") energyCount += count
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
    if (isNewDeck && newDeckName.trim()) {
      const newDeck: DeckInfo = {
        name: newDeckName.trim(),
        list: deckList,
      }

      const updatedDecks = [...existingDecks, newDeck]
      setExistingDecks(updatedDecks)
      localStorage.setItem("pokemonDecks", JSON.stringify(updatedDecks))
      setDeckName(newDeckName.trim())
    }

    onUpdateGame({ ...game, deckList, deckName: isNewDeck ? newDeckName : deckName })
    setShowDeckListDialog(false)
  }

  const handleDeckSelection = (value: string) => {
    if (value === "new") {
      setIsNewDeck(true)
      setShowNewDeckInput(true)
      return
    }

    setIsNewDeck(false)
    setShowNewDeckInput(false)
    setDeckName(value)

    const selectedDeck = existingDecks.find((deck) => deck.name === value)
    if (selectedDeck) {
      setDeckList(selectedDeck.list)
      validateDeckList(selectedDeck.list)
    }
  }

  const handleTurnClick = (turnNumber: number) => {
    setFlippedTurns((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(turnNumber)) newSet.delete(turnNumber)
      else newSet.add(turnNumber)
      return newSet
    })
  }

  // ---------- RENDER ----------
  return (
    <div className="max-w-4xl mx-auto px-4 pb-16 text-slate-900 dark:text-slate-50 border border-slate-300/50 shadow shadow-slate-600/30 dark:shadow-slate-500/70 dark:border-slate-200/20 backdrop-blur-sm">
      {/* Back + summary row */}
      <div className="flex items-center justify-between gap-4 pt-4">
        <Button
  onClick={handleBackClick}
  className={cn(
    // Theme outline button (square/rectangular is preserved)
     "bg-[#5e82ab] text-slate-100 hover:bg-sky-600",
    "shadow-[0_0_22px_rgba(56,189,248,0.35)] transition-colors",
    "dark:bg-sky-200/90 dark:text-slate-950 dark:hover:bg-sky-400",
    "dark:shadow-[0_0_26px_rgba(56,189,248,0.55)]",
    isBackButtonPressed ? "scale-95" : "scale-100",
  )}
>
  &larr; Back to list
</Button>


        {/* Desktop stat pills */}
        <div className="hidden sm:flex flex-wrap gap-2 text-xs">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 font-semibold",
              game.userWon
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
            )}
          >
            Result: {game.userWon ? "Won" : "Lost"}
          </span>
          <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 font-medium text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
            Prize cards: {game.userPrizeCardsTaken} – {game.opponentPrizeCardsTaken}
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700 dark:bg-slate-800/60 dark:text-slate-100">
            Damage: {game.damageDealt}
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700 dark:bg-slate-800/60 dark:text-slate-100">
            Turns: {game.turns}
          </span>
        </div>
      </div>

      {/* Mobile stat pills */}
      <div className="mt-3 flex flex-wrap gap-2 text-xs sm:hidden">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1 font-semibold",
            game.userWon
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
              : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
          )}
        >
          {game.userWon ? "Won" : "Lost"}
        </span>
        <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 font-medium text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
          {game.userPrizeCardsTaken} – {game.opponentPrizeCardsTaken} prizes
        </span>
      </div>

      {/* GAME DETAILS + TAGS */}
      <section className="mt-4 space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">Game details</h2>

          {(game.userAceSpecs?.length || 0) > 0 || (game.opponentAceSpecs?.length || 0) > 0 ? (
            <div className="flex flex-wrap gap-2 text-[11px] sm:text-xs">
              {game.userAceSpecs && game.userAceSpecs.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-violet-100 px-3 py-1 font-medium text-violet-800 dark:bg-violet-900/40 dark:text-violet-100">
                  You: {game.userAceSpecs.join(", ")}
                </span>
              )}
              {game.opponentAceSpecs && game.opponentAceSpecs.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-violet-100 px-3 py-1 font-medium text-violet-800 dark:bg-violet-900/40 dark:text-violet-100">
                  Opponent: {game.opponentAceSpecs.join(", ")}
                </span>
              )}
            </div>
          ) : null}
        </div>

        {/* 2-column meta + Pokémon */}
        <div className="grid gap-4 md:grid-cols-2 items-start text-sm">
          {/* Left: meta */}
          <dl className="space-y-1.5">
            <div className="flex gap-2">
              <dt className="w-28 text-slate-500">Date</dt>
              <dd className="font-medium">{game.date}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 text-slate-500">Opponent</dt>
              <dd className="font-medium break-all">{game.opponent}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 text-slate-500">Went first</dt>
              <dd className="font-medium">{game.wentFirst ? "Yes" : "No"}</dd>
            </div>
          </dl>

          {/* Right: Pokémon + deck action */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pokémon</p>

                {/* Hoverable prize map */}
                <div
                  onMouseEnter={() => setPrizePopoverOpen(true)}
                  onMouseLeave={() => setPrizePopoverOpen(false)}
                  className="hidden sm:block"
                >
                  <Popover open={prizePopoverOpen} onOpenChange={setPrizePopoverOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "inline-flex items-center gap-2 text-xs font-medium",
                          "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-50",
                          "rounded-full px-3 py-1 border border-slate-300/70 dark:border-slate-700/70",
                          "bg-white/60 dark:bg-slate-900/50 hover:bg-white/80 dark:hover:bg-slate-900/70",
                          "transition-colors",
                        )}
                        aria-label="View prize map"
                      >
                        <Map className="h-3.5 w-3.5" />
                        View prize map
                      </button>
                    </PopoverTrigger>

                    <PopoverContent
                      className="w-[520px] max-w-[90vw] z-[70] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-950/95 backdrop-blur shadow-xl"
                      sideOffset={10}
                      collisionPadding={20}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                            Prize map
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Derived from “was Knocked Out!” + “took a Prize card.”
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-3">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 mb-2">
                            You ({players.user || "unknown"})
                          </div>
                          {userPrizeMap.length ? (
                            <PrizeMapStrip sequence={userPrizeMap} />
                          ) : (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              No prize KOs detected.
                            </div>
                          )}
                        </div>

                        <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-3">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300 mb-2">
                            Opponent ({players.opp || "unknown"})
                          </div>
                          {oppPrizeMap.length ? (
                            <PrizeMapStrip sequence={oppPrizeMap} />
                          ) : (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              No prize KOs detected.
                            </div>
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Your team
                  </p>
                  {formatPokemonList(game.userMainAttacker, game.userOtherPokemon, true)}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Opponent&apos;s team
                  </p>
                  {formatPokemonList(game.opponentMainAttacker, game.opponentOtherPokemon, false)}
                </div>
              </div>

              {/* Mobile prize map button (tap) */}
              <div className="sm:hidden mt-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-full">
                      <Map className="h-4 w-4 mr-2" />
                      View prize map
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[92vw] z-[70] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-950/95 backdrop-blur shadow-xl"
                    sideOffset={10}
                    collisionPadding={20}
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      Prize map
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Derived from “was Knocked Out!” + “took a Prize card.”
                    </div>

                    <div className="mt-3 space-y-3">
                      <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 mb-2">
                          You ({players.user || "unknown"})
                        </div>
                        {userPrizeMap.length ? (
                          <PrizeMapStrip sequence={userPrizeMap} />
                        ) : (
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            No prize KOs detected.
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300 mb-2">
                          Opponent ({players.opp || "unknown"})
                        </div>
                        {oppPrizeMap.length ? (
                          <PrizeMapStrip sequence={oppPrizeMap} />
                        ) : (
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            No prize KOs detected.
                          </div>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

          <Button
  onClick={() => setShowDeckListDialog(true)}
  className={cn(
    // Theme filled button (matches your Import button vibe)
    "bg-[#5e82ab] text-slate-100 hover:bg-sky-600",
    "shadow-[0_0_22px_rgba(56,189,248,0.35)] transition-colors",
    "dark:bg-sky-200/90 dark:text-slate-950 dark:hover:bg-sky-400",
    "dark:shadow-[0_0_26px_rgba(56,189,248,0.55)]",
  )}
>
  <FileText className="mr-2 h-4 w-4" />
  {game.deckList || deckList ? "View / edit deck list" : "Add deck list"}
</Button>

          </div>
        </div>

        {/* TAGS */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-600/80 dark:border-slate-300">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Tags
          </span>

          {tags.map((tag) => (
            <button key={tag.text} type="button" onClick={() => removeTag(tag.text)} className="group">
              <Badge
                className="text-[11px] font-medium rounded-full px-3 py-1 border-0 shadow-sm group-hover:opacity-80 group-active:scale-95 transition"
                style={{
                  backgroundColor: tag.color,
                  color: getContrastColor(tag.color),
                }}
              >
                {tag.text}
                <span className="ml-1 text-[10px] opacity-80 group-hover:opacity-100">×</span>
              </Badge>
            </button>
          ))}

          {!isAddingTag ? (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setIsAddingTag(true)}
              className="h-7 px-2 text-xs border-dashed border-slate-400/70 text-slate-600 dark:text-slate-300 dark:border-slate-600 bg-transparent hover:bg-slate-100/40 dark:hover:bg-slate-800/60"
            >
              <Plus className="mr-1 h-3 w-3" />
              Add tag
            </Button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                autoFocus
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Matchup, event, notes..."
                className="h-7 w-40 text-xs bg-slate-950/5 dark:bg-slate-900 border-slate-300 dark:border-slate-700"
              />
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="h-7 w-7 rounded-full border border-slate-300 dark:border-slate-600 cursor-pointer p-0 bg-transparent"
              />
              <Button
                type="button"
                size="xs"
                disabled={!newTag.trim()}
                onClick={() => addTag(newTag, newTagColor)}
                className={cn("h-7 px-2 text-xs bg-sky-500 text-white hover:bg-sky-600", isAddButtonPressed && "scale-95")}
              >
                Add
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => {
                  setIsCancelTagButtonPressed(true)
                  setTimeout(() => {
                    setIsCancelTagButtonPressed(false)
                    setIsAddingTag(false)
                    setNewTag("")
                    setNewTagColor("#FF9999")
                  }, 150)
                }}
                className={cn(
                  "h-7 px-2 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                  isCancelTagButtonPressed && "scale-95",
                )}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* TURN LIST */}
      <section className="mt-8 border-t border-slate-400/80 dark:border-slate-400/80 pt-6">
        <h3 className="text-lg font-semibold mb-4">Turn log</h3>

        <div className="space-y-3">
          {turns.map((turn) => {
            const isFlipped = flippedTurns.has(turn.turnNumber)

            return (
              <article
                key={turn.turnNumber}
                onClick={() => handleTurnClick(turn.turnNumber)}
                className="py-4 px-3 text-sm leading-relaxed cursor-pointer
                           rounded-lg border border-slate-300/80 dark:border-slate-500/70
                           transition-colors hover:bg-slate-900/40 shadow-[0_0_15px_rgba(255,255,255,0.1)] dark:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="font-medium text-slate-700 dark:text-slate-100">
                    {turn.turnNumber === 0 ? "Setup" : `Turn ${turn.turnNumber}`}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {isFlipped ? "Hide stats" : "Show stats"}
                    </span>

                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-full p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                        >
                          {turnNotes[turn.turnNumber] ? (
                            <Book className="h-4 w-4 text-sky-500" />
                          ) : (
                            <Pencil className="h-4 w-4 text-slate-500" />
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-64 p-0 overflow-hidden rounded-lg shadow-lg"
                        sideOffset={6}
                        onClick={(e) => e.stopPropagation()}
                      >
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
                            type="button"
                            className="absolute top-2 right-2 h-6 w-6 p-0 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
                            onClick={(e) => {
                              e.stopPropagation()
                              onUpdateGame({ ...game, notes: turnNotes })
                              const trigger = document.querySelector(
                                `[data-state="open"][aria-haspopup="dialog"]`,
                              ) as HTMLElement | null
                              trigger?.click()
                            }}
                          >
                            <CheckIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {!isFlipped ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* You */}
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                        You
                      </div>
                      <ul className="space-y-1 text-[13px] text-slate-800 dark:text-slate-100">
                        {turn.userActions.map((action, index) => (
                          <li
                            key={index}
                            data-pokemon-action
                            className={cn(
                              "transition-colors",
                              selectedPokemon && action.includes(selectedPokemon)
                                ? "rounded bg-amber-100/80 px-1 dark:bg-amber-200/80 dark:text-slate-900"
                                : "",
                            )}
                            dangerouslySetInnerHTML={{
                              __html:
                                action.includes("drew") || action.includes("drawn")
                                  ? `<strong><em>${highlightAceSpecCards(action)}</em></strong>`
                                  : action.includes("damage")
                                    ? `<strong>${
                                        action.includes("Knocked Out")
                                          ? `<u>${highlightAceSpecCards(action)}</u>`
                                          : highlightAceSpecCards(action)
                                      }</strong>`
                                    : action.includes("Knocked Out")
                                      ? `<strong><u>${highlightAceSpecCards(action)}</u></strong>`
                                      : action.includes("conceded the game")
                                        ? `<strong style="color: #dc2626;">${highlightAceSpecCards(action)}</strong>`
                                        : action.includes("You won")
                                          ? `<strong style="color: #16a34a;" class="flex items-center gap-2">${highlightAceSpecCards(
                                              action,
                                            )}<img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/494-Kl7SRdC5ClhprQJ6w3ugfVSUCwsfCH.webp" alt="Victory Victini" class="w-12 h-12 inline-block -mt-2" /></strong>`
                                          : highlightAceSpecCards(action),
                            }}
                          />
                        ))}
                      </ul>
                    </div>

                    {/* Opponent */}
                    <div className="md:border-l md:border-slate-500/70 md:pl-4 dark:md:border-slate-500">
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300">
                        Opponent
                      </div>
                      <ul className="space-y-1 text-[13px] text-slate-800 dark:text-slate-100">
                        {turn.opponentActions.map((action, index) => (
                          <li
                            key={index}
                            data-pokemon-action
                            className={cn(
                              "transition-colors",
                              selectedPokemon && action.includes(selectedPokemon)
                                ? "rounded bg-amber-100/80 px-1 dark:bg-amber-200/80 dark:text-slate-900"
                                : "",
                            )}
                            dangerouslySetInnerHTML={{
                              __html:
                                action.includes("drew") || action.includes("drawn")
                                  ? `<strong><em>${highlightAceSpecCards(action)}</em></strong>`
                                  : action.includes("damage")
                                    ? `<strong>${
                                        action.includes("Knocked Out")
                                          ? `<u>${highlightAceSpecCards(action)}</u>`
                                          : highlightAceSpecCards(action)
                                      }</strong>`
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
                ) : (
                  // Stats view
                  <div className="grid gap-4 md:grid-cols-2 text-[13px]">
                    {turnStats[turn.turnNumber] ? (
                      <>
                        <div>
                          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                            You
                          </div>
                          <dl className="space-y-1 text-slate-800 dark:text-slate-100">
                            <div className="flex justify-between">
                              <dt>Cards remaining</dt>
                              <dd className="font-medium">{turnStats[turn.turnNumber].userCardsRemaining}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt>Cards drawn</dt>
                              <dd className="font-medium">{turnStats[turn.turnNumber].userCardsDrawn}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt>Cards discarded</dt>
                              <dd className="font-medium">{turnStats[turn.turnNumber].userCardsDiscarded}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt>Energy attached</dt>
                              <dd className="font-medium">{turnStats[turn.turnNumber].userEnergyAttached}</dd>
                            </div>
                          </dl>
                        </div>

                        <div className="md:border-l md:border-slate-500/70 md:pl-4 dark:md:border-slate-500">
                          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300">
                            Opponent
                          </div>
                          <dl className="space-y-1 text-slate-800 dark:text-slate-100">
                            <div className="flex justify-between">
                              <dt>Cards remaining</dt>
                              <dd className="font-medium">{turnStats[turn.turnNumber].opponentCardsRemaining}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt>Cards drawn</dt>
                              <dd className="font-medium">{turnStats[turn.turnNumber].opponentCardsDrawn}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt>Cards discarded</dt>
                              <dd className="font-medium">{turnStats[turn.turnNumber].opponentCardsDiscarded}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt>Energy attached</dt>
                              <dd className="font-medium">{turnStats[turn.turnNumber].opponentEnergyAttached}</dd>
                            </div>
                          </dl>
                        </div>
                      </>
                    ) : (
                      <p className="text-slate-500 dark:text-slate-400">No statistics available for this turn.</p>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </section>

      {/* DECK LIST DIALOG (restyled) */}
      <Dialog open={showDeckListDialog} onOpenChange={setShowDeckListDialog}>
       <DialogContent
  className={cn(
    "sm:max-w-[680px]",
    "rounded-2xl border border-slate-200/70 dark:border-slate-700/70",
    "bg-white/95 dark:bg-slate-900/95",
    "shadow-[0_18px_60px_rgba(2,6,23,0.18)] dark:shadow-[0_18px_70px_rgba(0,0,0,0.55)]",
    "backdrop-blur-md",
    // smoother open/close
    "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
    "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
  )}
>
  <DialogHeader className="px-6 pt-6">
    <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900 dark:text-sky-100">
      {game.deckList ? "View / Edit Deck List" : "Add Deck List"}
    </DialogTitle>
    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
      Paste your list, then save it to reuse later.
    </p>
  </DialogHeader>

  <div className="px-6 pb-6 pt-4 space-y-4">
    <div>
      <label
        htmlFor="deckName"
        className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2"
      >
        Deck name
      </label>

      <div className="space-y-2">
        <Select value={isNewDeck ? "new" : deckName} onValueChange={handleDeckSelection}>
          <SelectTrigger
            className={cn(
              "w-full rounded-xl",
              "bg-slate-100/90 dark:bg-slate-800/80",
              "text-slate-900 dark:text-slate-50",
              "border border-slate-200 dark:border-slate-700",
              "shadow-[0_0_18px_rgba(42,81,128,0.18)] dark:shadow-[0_0_22px_rgba(56,189,248,0.10)]",
              "focus-visible:ring-2 focus-visible:ring-sky-300 dark:focus-visible:ring-sky-400",
            )}
          >
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

        {showNewDeckInput && (
          <Input
            type="text"
            id="newDeckName"
            placeholder="Enter a name for your new deck"
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
            className={cn(
              "rounded-xl",
              "bg-slate-100/90 dark:bg-slate-800/80",
              "text-slate-900 dark:text-slate-50",
              "border border-slate-200 dark:border-slate-700",
              "focus-visible:ring-2 focus-visible:ring-sky-300 dark:focus-visible:ring-sky-400",
            )}
          />
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
      className={cn(
        "min-h-[320px] rounded-2xl font-mono text-sm",
        "bg-slate-100/90 dark:bg-slate-800/80",
        "text-slate-900 dark:text-slate-50",
        "border border-slate-200 dark:border-slate-700",
        "shadow-[0_0_22px_rgba(42,81,128,0.18)] dark:shadow-[0_0_26px_rgba(56,189,248,0.10)]",
        "focus-visible:ring-2 focus-visible:ring-sky-300 dark:focus-visible:ring-sky-400",
      )}
    />

    {deckListStats.total > 0 && (
      <div className="flex flex-wrap justify-between gap-2 text-xs">
        <span className="text-slate-600 dark:text-slate-300">Pokémon: {deckListStats.pokemon}</span>
        <span className="text-slate-600 dark:text-slate-300">Trainer: {deckListStats.trainer}</span>
        <span className="text-slate-600 dark:text-slate-300">Energy: {deckListStats.energy}</span>
        <span
          className={cn(
            "font-semibold",
            deckListStats.total === 60
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400",
          )}
        >
          Total: {deckListStats.total}/60
        </span>
      </div>
    )}

    {deckListError && (
      <p className="text-sm text-rose-600 dark:text-rose-400">{deckListError}</p>
    )}

    <DialogFooter className="pt-2">
      <Button
        variant="outline"
        onClick={() => setShowDeckListDialog(false)}
        className={cn(
          "border-sky-200/70 text-slate-700 hover:bg-sky-50 hover:border-sky-300",
          "dark:border-sky-500/30 dark:text-slate-200 dark:hover:bg-slate-800/70",
        )}
      >
        Cancel
      </Button>

      <Button
        onClick={handleSaveDeckList}
        disabled={isNewDeck && !newDeckName.trim()}
        className={cn(
          "bg-[#5e82ab] text-slate-100 hover:bg-sky-600",
          "dark:bg-sky-200/90 dark:text-slate-950 dark:hover:bg-sky-400",
          "disabled:opacity-60 disabled:pointer-events-none",
        )}
      >
        Save
      </Button>
    </DialogFooter>
  </div>
</DialogContent>

      </Dialog>
    </div>
  )
}

/* ---------------- Prize-map UI helpers ---------------- */

function PrizeMapStrip({ sequence }: { sequence: string[] }) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1">
      {sequence.map((name, i) => (
        <span key={`${name}-${i}`} className="inline-flex items-center gap-1">
          <PrizeSprite name={name} />
          {i < sequence.length - 1 && (
            <span className="text-slate-400 dark:text-slate-500 text-sm select-none">→</span>
          )}
        </span>
      ))}
    </div>
  )
}

function PrizeSprite({ name, size = 22 }: { name: string; size?: number }) {
  const candidates = buildPrizeSpriteCandidates(name)
  return <CandidateSprite candidates={candidates} alt={name} title={stripOwnerPrefix(name)} size={size} />
}

function CandidateSprite({
  candidates,
  alt,
  title,
  size = 22,
}: {
  candidates: string[]
  alt: string
  title?: string
  size?: number
}) {
  const [idx, setIdx] = useState(0)
  const src = candidates[Math.min(idx, candidates.length - 1)] ?? FALLBACK_ICON

  return (
    <img
      src={src}
      alt={alt}
      title={title}
      loading="lazy"
      decoding="async"
      style={{ width: size, height: size }}
      className="object-contain shrink-0 bg-transparent"
      onError={() => setIdx((v) => Math.min(v + 1, candidates.length - 1))}
    />
  )
}

function normalizeLoose(input: string): string {
  return input
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function stripOwnerPrefix(name: string): string {
  return name.replace(/^[^'’]+['’]s\s+/i, "").trim()
}

function uniquePreserveOrder(values: string[]) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of values) {
    if (!v || seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out
}

function buildPrizeSpriteCandidates(displayName: string): string[] {
  const raw = stripOwnerPrefix(displayName)
  const n0 = normalizeLoose(raw)
  if (!n0) return [FALLBACK_ICON]

  const base = n0.replace(/\bex\b/g, "").replace(/\s+/g, " ").trim()
  const tokens = base.split(" ").filter(Boolean).filter((t) => t !== "mask")

  // Ogerpon masks
  if (tokens.includes("ogerpon")) {
    const tset = new Set(tokens)
    const form =
      tset.has("wellspring")
        ? "ogerpon-wellspring"
        : tset.has("hearthflame")
          ? "ogerpon-hearthflame"
          : tset.has("cornerstone")
            ? "ogerpon-cornerstone"
            : "ogerpon"

    return uniquePreserveOrder([
      `/sprites/${form}.png`,
      `/sprites/${form}.webp`,
      `/sprites/ogerpon.png`,
      `/sprites/ogerpon.webp`,
      FALLBACK_ICON,
    ])
  }

  const slug = tokens.join("-")
  const slugUnderscore = tokens.join("_")

  let swapped: string | null = null
  let swappedUnderscore: string | null = null
  if (tokens.length >= 2) {
    const swappedTokens = [...tokens.slice(1), tokens[0]]
    swapped = swappedTokens.join("-")
    swappedUnderscore = swappedTokens.join("_")
  }

  return uniquePreserveOrder([
    `/sprites/${slug}.png`,
    `/sprites/${slug}.webp`,
    `/sprites/${slugUnderscore}.png`,
    `/sprites/${slugUnderscore}.webp`,
    swapped ? `/sprites/${swapped}.png` : "",
    swapped ? `/sprites/${swapped}.webp` : "",
    swappedUnderscore ? `/sprites/${swappedUnderscore}.png` : "",
    swappedUnderscore ? `/sprites/${swappedUnderscore}.webp` : "",
    FALLBACK_ICON,
  ])
}

function extractTwoPlayersFromRawLog(rawLog: string): { p1: string; p2: string } {
  const lines = rawLog.split(/\r?\n/)
  const names: string[] = []

  for (const line of lines) {
    const m = line.match(/^(.+?) drew 7 cards for the opening hand\./i)
    if (!m) continue
    const nm = (m[1] ?? "").trim()
    if (!nm) continue
    if (!names.some((x) => normalizeLoose(x) === normalizeLoose(nm))) names.push(nm)
    if (names.length >= 2) break
  }

  return { p1: names[0] ?? "", p2: names[1] ?? "" }
}

function derivePrizeMapForPlayer(rawLog: string, playerName: string): string[] {
  if (!rawLog || !playerName) return []
  const playerNorm = normalizeLoose(playerName)
  if (!playerNorm) return []

  const lines = rawLog.split(/\r?\n/)
  const seq: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // "CShepS's Budew was Knocked Out!"
    // "capisz’s Frillish was Knocked Out!"
    let m = line.match(/^(.+?)['’]s\s+(.+?)\s+was Knocked Out!/i)
    if (!m) {
      const m2 = line.match(/^(.+?)\s+was Knocked Out!/i)
      if (!m2) continue
      m = ["", "", m2[1]]
    }

    const victimRaw = (m[2] ?? "").trim()
    if (!victimRaw) continue

    // Look ahead for "X took a Prize card."
    let prizeTakenByPlayer = false
    for (let j = i + 1; j < Math.min(lines.length, i + 12); j++) {
      const l2 = lines[j].trim()
      if (/^Turn\s+#/i.test(l2)) break

      const pm = l2.match(/^(.+?)\s+took a Prize card\./i)
      if (!pm) continue

      const taker = normalizeLoose(pm[1] ?? "")
      if (taker && taker === playerNorm) prizeTakenByPlayer = true
    }

    if (!prizeTakenByPlayer) continue

    const cleanVictim = stripOwnerPrefix(victimRaw)
    if (!cleanVictim) continue
    seq.push(cleanVictim)
  }

  return seq
}

/* ----------------- existing helpers ----------------- */

function getContrastColor(hexColor: string) {
  const r = Number.parseInt(hexColor.slice(1, 3), 16)
  const g = Number.parseInt(hexColor.slice(3, 5), 16)
  const b = Number.parseInt(hexColor.slice(5, 7), 16)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 128 ? "black" : "white"
}

// (kept for compatibility even if unused elsewhere)
function getLighterColor(color: string): string {
  return color === "black" ? "#333333" : "#FFFFFF"
}

// (kept for compatibility even if unused elsewhere)
function getBabyColor(tagText: string): string {
  const colors = ["#FFB7B2", "#FFDAC1", "#E2F0CB", "#B5EAD7", "#C7CEEA", "#FF9AA2"]
  const hash = tagText.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}
