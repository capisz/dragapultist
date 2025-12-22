// components/game-detail.tsx
"use client"

import { useMemo, useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Book, FileText, ArrowLeftRight } from "lucide-react"
import { highlightAceSpecCards, analyzeGameLog } from "@/utils/game-analyzer"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { CheckIcon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { GameSummary } from "@/types/game"
import { ARCHETYPE_RULES } from "@/utils/archetype-mapping"

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
const UNKNOWN_ARCHETYPE = "__unknown__"

export function GameDetail({ game, onBack, allGames, onUpdateGame }: GameDetailProps) {
  const pillBtn = (pressed: boolean, extra?: string) =>
    cn(
      "rounded-full px-5 h-9 text-sm whitespace-nowrap transition-transform duration-150",
      "bg-[#5e82ab] text-slate-50 hover:bg-sky-800/50",
      "dark:bg-[#b1cce8] dark:text-[#121212] dark:hover:bg-[#a1c2e4]",
      pressed ? "scale-95" : "scale-100",
      extra,
    )

  const [tags, setTags] = useState<{ text: string; color: string }[]>(game.tags || [])
  const [newTag, setNewTag] = useState("")
  const [newTagColor, setNewTagColor] = useState("#FF9999")
  const [isAddingTag, setIsAddingTag] = useState(false)
  const [turnNotes, setTurnNotes] = useState<{ [key: number]: string }>(game.notes || {})
  const [selectedPokemon, setSelectedPokemon] = useState<string | null>(null)

  const [isBackButtonPressed, setIsBackButtonPressed] = useState(false)
  const [isCancelTagButtonPressed, setIsCancelTagButtonPressed] = useState(false)
  const [isAddButtonPressed, setIsAddButtonPressed] = useState(false)

  const [isDeckButtonPressed, setIsDeckButtonPressed] = useState(false)
  const [isSetPlayersButtonPressed, setIsSetPlayersButtonPressed] = useState(false)
  const [isApplyPlayersPressed, setIsApplyPlayersPressed] = useState(false)
  const [isSaveDeckPressed, setIsSaveDeckPressed] = useState(false)

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
  }>({
    pokemon: 0,
    trainer: 0,
    energy: 0,
    total: 0,
  })

  const [existingDecks, setExistingDecks] = useState<DeckInfo[]>([])
  const [isNewDeck, setIsNewDeck] = useState(true)
  const [showNewDeckInput, setShowNewDeckInput] = useState(false)
  const [newDeckName, setNewDeckName] = useState("")

  const [prizePopoverOpen, setPrizePopoverOpen] = useState(false)

  // --- Set Players dialog ---
  const [showSetPlayersDialog, setShowSetPlayersDialog] = useState(false)
  const [swapPlayers, setSwapPlayers] = useState(false)
  const [userArchetypeId, setUserArchetypeId] = useState<string>((game as any).userArchetype ?? UNKNOWN_ARCHETYPE)
  const [opponentArchetypeId, setOpponentArchetypeId] = useState<string>(
    (game as any).opponentArchetype ?? UNKNOWN_ARCHETYPE,
  )

  // Sync local state when switching games
  useEffect(() => {
    setTags(game.tags || [])
    setTurnNotes(game.notes || {})
    setDeckList(game.deckList || "")
    setDeckName(game.deckName || "")
    setSelectedPokemon(null)
    setFlippedTurns(new Set())
    setSwapPlayers(false)
    setUserArchetypeId((game as any).userArchetype ?? UNKNOWN_ARCHETYPE)
    setOpponentArchetypeId((game as any).opponentArchetype ?? UNKNOWN_ARCHETYPE)
  }, [game.id])

  // Reset Set Players dialog state when opened
  useEffect(() => {
    if (!showSetPlayersDialog) return
    setSwapPlayers(false)
    setUserArchetypeId((game as any).userArchetype ?? UNKNOWN_ARCHETYPE)
    setOpponentArchetypeId((game as any).opponentArchetype ?? UNKNOWN_ARCHETYPE)
  }, [showSetPlayersDialog, game.id])

  // Load existing decks from localStorage
  useEffect(() => {
    const storedDecks = localStorage.getItem("pokemonDecks")
    if (storedDecks) setExistingDecks(JSON.parse(storedDecks))
  }, [])

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

  useEffect(() => {
    if (showDeckListDialog && deckList) validateDeckList(deckList)
  }, [showDeckListDialog, deckList])

  useEffect(() => {
    if (showDeckListDialog) {
      const matchesExisting =
        !!deckList &&
        existingDecks.some(
          (deck) =>
            deck.list.replace(/\s+/g, " ").toLowerCase().trim() === deckList.replace(/\s+/g, " ").toLowerCase().trim(),
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
    const storedUser = (((game as any).username ?? "") as string).trim()
    const storedOpp = (game.opponent ?? "").trim()

    let user = storedUser
    let opp = storedOpp

    if (fromLog.p1 && fromLog.p2) {
      if (!opp || opp === "-") {
        if (storedUser && normalizeLoose(storedUser) === normalizeLoose(fromLog.p1)) {
          opp = fromLog.p2
          user = storedUser
        } else if (storedUser && normalizeLoose(storedUser) === normalizeLoose(fromLog.p2)) {
          opp = fromLog.p1
          user = storedUser
        } else {
          user = user || fromLog.p1
          opp = opp || fromLog.p2
        }
      } else {
        const oppNorm = normalizeLoose(opp)
        if (oppNorm === normalizeLoose(fromLog.p1)) user = user || fromLog.p2
        else if (oppNorm === normalizeLoose(fromLog.p2)) user = user || fromLog.p1
        else user = user || fromLog.p1
      }
    }

    return { user: user || fromLog.p1 || "", opp: opp || fromLog.p2 || "" }
  }, [game.rawLog, (game as any).username, game.opponent])

  const previewPlayers = useMemo(() => {
    if (!players.user || !players.opp) return { you: players.user || "unknown", opp: players.opp || "unknown" }
    return swapPlayers ? { you: players.opp, opp: players.user } : { you: players.user, opp: players.opp }
  }, [players.user, players.opp, swapPlayers])

  // Turn log with perspective
  const turns = useMemo(() => {
    return parseTurnsWithPerspective(game.rawLog, previewPlayers.you, previewPlayers.opp)
  }, [game.rawLog, previewPlayers.you, previewPlayers.opp])

const userPrizeMap = useMemo(() => {
  if (!previewPlayers.you) return []
  return derivePrizeMapForPlayer(game.rawLog, previewPlayers.you)
}, [game.rawLog, previewPlayers.you])

const oppPrizeMap = useMemo(() => {
  if (!previewPlayers.opp) return []
  return derivePrizeMapForPlayer(game.rawLog, previewPlayers.opp)
}, [game.rawLog, previewPlayers.opp])

  // Calculate turn statistics from game log (unchanged)
  useEffect(() => {
    const calculateTurnStats = () => {
      const lines = game.rawLog.split("\n")
      const stats: any = {}
      let userDeckSize = 60
      let opponentDeckSize = 60
      let currentTurn = 0
      let setupComplete = false

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

          if (line.includes("attached") && line.includes("Energy")) {
            if (line.startsWith(username)) stats[currentTurn].userEnergyAttached += 1
            else if (line.startsWith(opponent)) stats[currentTurn].opponentEnergyAttached += 1
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

  const removeTag = (tagText: string) => setTags((prev) => prev.filter((tag) => tag.text !== tagText))

  const cleanName = useCallback((name: string) => name.replace(/^.*'s\s/, ""), [])



  const TEAM_STOPWORDS = new Set([
  "it",
  "them",
  "they",
  "you",
  "your",
  "yours",
  "me",
  "my",
  "mine",
  "we",
  "us",
  "our",
  "ours",
  "he",
  "she",
  "his",
  "her",
  "hers",
  "their",
  "theirs",
  "its",
])
const formatPokemonList = (mainAttacker: string, otherPokemon: string[], isUser: boolean) => {
  const sanitize = (raw: string | undefined | null) => {
    const v = (raw ?? "").trim()
    if (!v) return null

    // remove owner's prefix like "capisz's X"
    const cleaned = cleanName(stripOwnerPrefix(v)).trim()
    if (!cleaned) return null

    const norm = normalizeLoose(cleaned)
    if (!norm) return null

    // filter log artifacts / pronouns
    if (TEAM_STOPWORDS.has(norm)) return null

    // common junk that sometimes leaks through parsing
    if (norm === "pokemon" || norm === "active" || norm === "benched") return null

    // ultra-short noise
    if (cleaned.length <= 2) return null

    return cleaned
  }

  const all = [sanitize(mainAttacker), ...(otherPokemon ?? []).map(sanitize)]
    .filter(Boolean) as string[]

  const uniquePokemon = uniquePreserveOrder(all)

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

  const MAX_VISIBLE = 4
  const visible = uniquePokemon.slice(0, MAX_VISIBLE)
  const hidden = uniquePokemon.slice(MAX_VISIBLE)

  const Row = ({ name, isMain }: { name: string; isMain?: boolean }) => (
  <button
    type="button"
    onClick={() => handlePokemonClick(name)}
    className={cn(
      "w-full flex items-center gap-3 py-0 text-left",
      "rounded-lg transition-colors",
      "hover:bg-slate-900/[0.03] dark:hover:bg-white/[0.05]",
      selectedPokemon === name && "bg-sky-500/10",
    )}
  >
    <CandidateSprite
      candidates={buildPrizeSpriteCandidates(name)}
      alt={name}
      title={stripOwnerPrefix(name)}
      size={23}
    />

    <div className="flex items-baseline gap-2 min-w-0">
      <span className={cn("truncate", isMain ? "text-base font-semibold" : "text-sm font-medium")}>
        {name}
      </span>

      
    </div>
  </button>
)

  if (!uniquePokemon.length) {
    return <div className="text-xs text-slate-500 dark:text-slate-400">No Pokémon detected.</div>
  }

  return (
   <div className="space-y-1">
      <div className="space-y-2">
        {visible.map((p, idx) => (
          <Row key={`${p}-${idx}`} name={p} isMain={idx === 0} />
        ))}

        {hidden.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="text-left text-sm font-semibold text-slate-600 dark:text-slate-200/80 underline decoration-dotted underline-offset-4"
              >
                +{hidden.length} more
              </button>
            </PopoverTrigger>

            <PopoverContent className="w-[320px] z-[60] p-3 rounded-2xl" sideOffset={8} collisionPadding={20}>
              <div className="space-y-2">
                {hidden.map((p, idx) => (
                  <Row key={`${p}-hidden-${idx}`} name={p} />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  )
}

  const handleBackClick = () => {
    setIsBackButtonPressed(true)
    setTimeout(() => {
      setIsBackButtonPressed(false)
      onUpdateGame({ ...game, tags, notes: turnNotes, deckList, deckName })
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

    setDeckListStats({ pokemon: pokemonCount, trainer: trainerCount, energy: energyCount, total: totalCards })

    if (totalCards !== 60) {
      setDeckListError(`Deck must contain exactly 60 cards. Current count: ${totalCards}`)
      setIsDeckListValid(false)
    } else {
      setIsDeckListValid(true)
    }
  }

  const handleSaveDeckList = () => {
    if (isNewDeck && newDeckName.trim()) {
      const newDeck: DeckInfo = { name: newDeckName.trim(), list: deckList }
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

  const handleSwapPlayers = () => {
    setSwapPlayers((prev) => !prev)
    // also swap archetype selections so it behaves like the import dialog
    const a = userArchetypeId
    const b = opponentArchetypeId
    setUserArchetypeId(b)
    setOpponentArchetypeId(a)
  }

  const applyPlayers = () => {
    const recalculated = analyzeGameLog(
      game.rawLog,
      swapPlayers,
      undefined,
      undefined,
      userArchetypeId === UNKNOWN_ARCHETYPE ? null : userArchetypeId,
      opponentArchetypeId === UNKNOWN_ARCHETYPE ? null : opponentArchetypeId,
    )

    const merged: GameSummary = {
      ...(recalculated as any),
      id: game.id,
      date: game.date,
      rawLog: game.rawLog,
      tags,
      notes: turnNotes,
      deckList,
      deckName,
    }

    onUpdateGame(merged)
    setShowSetPlayersDialog(false)

    
  }

  const SummaryPills = () => (
  <div className="flex flex-wrap gap-2 text-xs">
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 font-semibold",
        game.userWon
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-700/40 dark:text-emerald-200"
          : "bg-rose-100 text-rose-800 dark:bg-rose-800/40 dark:text-rose-200",
      )}
    >
      Result: {game.userWon ? "Won" : "Lost"}
    </span>

    <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 font-medium text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
      Prize cards: {game.userPrizeCardsTaken} – {game.opponentPrizeCardsTaken}
    </span>

    <span className="inline-flex items-center rounded-full bg-stone-300 px-3 py-1 font-medium text-slate-700 dark:bg-stone-500/60 dark:text-slate-100">
      Damage: {game.damageDealt}
    </span>

    <span className="inline-flex items-center rounded-full bg-slate-300 px-3 py-1 font-medium text-slate-700 dark:bg-slate-500/60 dark:text-slate-100">
      Turns: {game.turns}
    </span>
  </div>
)

  // ---------- RENDER ----------
return (
  <div
    className={cn(
      "max-w-4xl mx-auto px-4 pb-16",
      "text-slate-900 dark:text-slate-50",

      // Surface color (slightly different than page bg)
      "bg-slate-200/60 dark:bg-[#162234]/60",

      // Depth + separation
      "backdrop-blur-md",
      "border border-slate-200/70 dark:border-slate-700/60",
      "shadow-[0_10px_30px_rgba(2,6,23,0.10)] dark:shadow-[0_14px_40px_rgba(0,0,0,0.35)]",

      // Subtle inner ring
      "ring-1 ring-slate-900/5 dark:ring-white/5",

      // Rounded corners
      "rounded-2xl",
    )}
  >

      {/* Back + summary row */}
      <div className="flex items-center justify-between gap-4 pt-4">
        <Button onClick={handleBackClick} className={pillBtn(isBackButtonPressed)}>
          &larr; Back to list
        </Button>

      </div>

      {/* GAME DETAILS + TAGS */}
     <section
  className={cn(
    "mt-4 space-y-4",
    "rounded-2xl p-4",
    "bg-slate-50/60 dark:bg-slate-900/40",
    "border border-slate-200/60 dark:border-slate-700/50",
  )}
>

        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold tracking-tight">Game Details</h2>
        </div>

       <div className="grid gap-6 md:grid-cols-2 items-start">
  {/* LEFT COLUMN */}
  <div className="space-y-4">
    <dl className="space-y-2 text-sm">

      <SummaryPills />
      <div className="flex gap-2">
        <dt className="w-28 text-slate-500 dark:text-slate-200/80">Date</dt>
        <dd className="font-medium">{game.date}</dd>
      </div>

      <div className="flex gap-2">
        <dt className="w-28 text-slate-500 dark:text-slate-200/80">Opponent</dt>
        <dd className="font-medium break-all">{game.opponent}</dd>
      </div>

      <div className="flex gap-2">
        <dt className="w-28 text-slate-500 dark:text-slate-200/80">Went first</dt>
        <dd className="font-medium">{game.wentFirst ? "Yes" : "No"}</dd>
      </div>
    </dl>

    {/* Add deck + Set Players moved to the left column */}
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={() => {
          setIsDeckButtonPressed(true)
          setTimeout(() => setIsDeckButtonPressed(false), 150)
          setShowDeckListDialog(true)
        }}
        className={pillBtn(isDeckButtonPressed, "inline-flex items-center gap-2")}
      >
        <FileText className="h-4 w-4" />
        {game.deckList || deckList ? "Deck list" : "Add deck"}
      </Button>

      <Button
        onClick={() => {
          setIsSetPlayersButtonPressed(true)
          setTimeout(() => setIsSetPlayersButtonPressed(false), 150)
          setShowSetPlayersDialog(true)
        }}
        className={pillBtn(isSetPlayersButtonPressed, "inline-flex items-center gap-2")}
      >
        <Pencil className="h-4 w-4" />
        Set Players
      </Button>
    </div>
  </div>
{/* RIGHT COLUMN */}
<div className="space-y-3">
  {/* Match turn log sizing */}
  <div className="grid gap-3 sm:grid-cols-2 text-sm">
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-200/70">
        Your team
      </p>
      {formatPokemonList(game.userMainAttacker, game.userOtherPokemon, true)}
    </div>

    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-200/70">
        Opponent&apos;s team
      </p>
      {formatPokemonList(game.opponentMainAttacker, game.opponentOtherPokemon, false)}
    </div>
  </div>
</div>
  </div>
        {/* TAGS */}
       <div className="pt-3 border-t border-slate-600/80 dark:border-slate-300">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    {/* LEFT: tags */}
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tags</span>

      {tags.map((tag) => (
        <button key={tag.text} type="button" onClick={() => removeTag(tag.text)} className="group">
          <Badge
            className="text-[11px] font-medium rounded-full px-3 py-1 border-0 shadow-sm group-hover:opacity-80 group-active:scale-95 transition"
            style={{ backgroundColor: tag.color, color: getContrastColor(tag.color) }}
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
      value={newTag}
      onChange={(e) => setNewTag(e.target.value)}
      placeholder="Tag name"
      className="h-7 w-36 text-xs bg-white/60 dark:bg-slate-950/20"
      onKeyDown={(e) => {
        if (e.key === "Enter") addTag(newTag.trim(), newTagColor)
        if (e.key === "Escape") {
          setIsAddingTag(false)
          setNewTag("")
          setNewTagColor("#FF9999")
        }
      }}
    />

    <input
      type="color"
      value={newTagColor}
      onChange={(e) => setNewTagColor(e.target.value)}
      className="h-7 w-10 rounded-md border border-slate-300/70 dark:border-white/15 bg-transparent"
      aria-label="Tag color"
    />

    <Button
      type="button"
      size="sm"
      onClick={() => addTag(newTag.trim(), newTagColor)}
      disabled={!newTag.trim()}
      className={cn(
        "h-7 px-3 text-xs",
        "bg-slate-800 text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-100",
        isAddButtonPressed && "scale-95",
      )}
    >
      Add
    </Button>

    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        setIsCancelTagButtonPressed(true)
        setTimeout(() => setIsCancelTagButtonPressed(false), 120)
        setIsAddingTag(false)
        setNewTag("")
        setNewTagColor("#FF9999")
      }}
      className={cn("h-7 px-3 text-xs", isCancelTagButtonPressed && "scale-95")}
    >
      Cancel
    </Button>
  </div>
)}
    </div>

   {/* RIGHT: prize map button (bottom-right) */}
<div className="flex justify-end shrink-0">
  <Popover open={prizePopoverOpen} onOpenChange={setPrizePopoverOpen}>
    <PopoverTrigger asChild>
      <button
        type="button"
        onMouseEnter={() => setPrizePopoverOpen(true)}
        onMouseLeave={() => setPrizePopoverOpen(false)}
        className={cn(
          "inline-flex items-center gap-2 text-xs font-medium",
          "text-slate-600 hover:text-slate-900 dark:text-slate-200/90 dark:hover:text-slate-50",
          "rounded-full px-3 py-1 border border-slate-300/70 dark:border-white/15",
          "bg-white/60 dark:bg-slate-950/20 hover:bg-white/80 dark:hover:bg-slate-950/30",
          "transition-colors",
        )}
        aria-label="View prize map"
      >
            View prize map
          </button>
    </PopoverTrigger>

    <PopoverContent
      side="top"
      align="end"
      sideOffset={10}
      collisionPadding={20}
      onMouseEnter={() => setPrizePopoverOpen(true)}
      onMouseLeave={() => setPrizePopoverOpen(false)}
      className="w-[520px] max-w-[90vw] z-[70] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-700/80 backdrop-blur shadow-xl"
    >
      <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Prize Map</div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400">
        Here is the order in which prize cards were taken.
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 mb-2">
            You ({previewPlayers.you || "unknown"})
          </div>
          {userPrizeMap.length ? (
            <PrizeMapStrip sequence={userPrizeMap} />
          ) : (
            <div className="text-xs text-slate-500 dark:text-slate-400">No prize KOs detected.</div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300 mb-2">
            Opponent ({previewPlayers.opp || "unknown"})
          </div>
          {oppPrizeMap.length ? (
            <PrizeMapStrip sequence={oppPrizeMap} />
          ) : (
            <div className="text-xs text-slate-500 dark:text-slate-400">No prize KOs detected.</div>
          )}
        </div>
      </div>
    </PopoverContent>
  </Popover>
    </div>
  </div>
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
className={cn(
  "py-4 px-3 text-sm leading-relaxed cursor-pointer",
  "rounded-2xl transition-colors",

  // match the Game details surface
  "bg-slate-50/60 dark:bg-slate-900/40",
  "border border-slate-200/60 dark:border-slate-700/50",

  // optional depth so it doesn’t look flat
  "shadow-[0_8px_22px_rgba(2,6,23,0.06)] dark:shadow-[0_10px_26px_rgba(0,0,0,0.28)]",
  "ring-1 ring-slate-900/5 dark:ring-white/5",

  // preserve hover effects (overlay)
  "hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.05]",

  isFlipped && "bg-slate-900/[0.06] dark:bg-white/[0.06]"

)}
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
                            onChange={(e) => setTurnNotes({ ...turnNotes, [turn.turnNumber]: e.target.value })}
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
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                        You ({previewPlayers.you})
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
                            dangerouslySetInnerHTML={{ __html: formatActionHtml(action) }}
                          />
                        ))}
                      </ul>
                    </div>

                    <div className="md:border-l md:border-slate-500/70 md:pl-4 dark:md:border-slate-500">
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300">
                        Opponent ({previewPlayers.opp || "unknown"})
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
                            dangerouslySetInnerHTML={{ __html: formatActionHtml(action) }}
                          />
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
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

      {/* SET PLAYERS DIALOG (Import-style) */}
      <Dialog
        open={showSetPlayersDialog}
        onOpenChange={(next) => {
          setShowSetPlayersDialog(next)
        }}
      >
        <DialogContent className="sm:max-w-[520px] bg-white dark:bg-slate-900 rounded-2xl">
          <DialogHeader>
  <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-50">
    Confirm Players & Deck Archetypes
  </DialogTitle>
  <DialogDescription className="text-sm text-slate-700 dark:text-slate-300">
    If needed, you can swap players and assign deck archetypes for this game.
  </DialogDescription>
</DialogHeader>
          <div className="space-y-6">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              If needed, you can swap players and assign deck archetypes for this game.
            </p>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60 p-4 space-y-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-sm">
  <div>
    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      You
    </div>
    <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-50">
      {previewPlayers.you || "Unknown"}
    </div>
  </div>

  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={handleSwapPlayers}
    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-50 dark:border-slate-600"
  >
    <ArrowLeftRight className="h-4 w-4" />
    Swap players
  </Button>

  <div className="text-right">
    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      Opponent
    </div>
    <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-50">
      {previewPlayers.opp || "Unknown"}
    </div>
  </div>
</div>


              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-700 mt-3">
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Your deck archetype
                  </div>
                  <Select value={userArchetypeId} onValueChange={(v) => setUserArchetypeId(v)}>
                    <SelectTrigger className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 border-slate-300 dark:border-slate-600">
                      <SelectValue placeholder="Select your archetype" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNKNOWN_ARCHETYPE}>Not set / Unknown</SelectItem>
                      {ARCHETYPE_RULES.map((rule) => (
                        <SelectItem key={rule.id} value={rule.id}>
                          {rule.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Opponent&apos;s archetype
                  </div>
                  <Select value={opponentArchetypeId} onValueChange={(v) => setOpponentArchetypeId(v)}>
                    <SelectTrigger className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 border-slate-300 dark:border-slate-600">
                      <SelectValue placeholder="Select opponent archetype" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNKNOWN_ARCHETYPE}>Not set / Unknown</SelectItem>
                      {ARCHETYPE_RULES.map((rule) => (
                        <SelectItem key={rule.id} value={rule.id}>
                          {rule.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {swapPlayers && (
              <div className="rounded-lg border border-sky-300/70 bg-sky-50 dark:bg-sky-900/20 dark:border-sky-600/60 px-3 py-2">
                <p className="text-xs text-sky-900 dark:text-sky-100">
                  Players will be swapped for this game.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSetPlayersDialog(false)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIsApplyPlayersPressed(true)
                setTimeout(() => {
                  setIsApplyPlayersPressed(false)
                  applyPlayers()
                }, 150)
              }}
              className={pillBtn(isApplyPlayersPressed)}
            >
              Set Players
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DECK LIST DIALOG (your existing block stays) */}
     {/* DECK LIST DIALOG */}
<Dialog open={showDeckListDialog} onOpenChange={setShowDeckListDialog}>
  <DialogContent
    className={cn(
      "sm:max-w-[560px] md:max-w-[600px]",           // smaller than 680
      "rounded-2xl p-0 overflow-hidden",
      "bg-white text-slate-900",
      "dark:bg-slate-900 dark:text-slate-50",
"border border-slate-200/70 dark:border-slate-700/70",
      "shadow-[0_18px_60px_rgba(2,6,23,0.22)] dark:shadow-[0_18px_60px_rgba(0,0,0,0.55)]",
    )}
  >
    {/* Header */}
    <div className="px-5 pt-5 pb-3 border-b border-slate-200/70 dark:border-slate-700/70"
>
      <DialogHeader className="space-y-1">
        <DialogTitle className="text-lg font-semibold tracking-tight">
          {game.deckList ? "View / Edit Deck List" : "Add Deck List"}
        </DialogTitle>
        <DialogDescription className="text-sm text-slate-600 dark:text-slate-300">
          Paste your list, then save it to reuse later.
        </DialogDescription>
      </DialogHeader>
    </div>

    {/* Body */}
    <div className="px-5 pb-5 pt-4 space-y-4">
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300 mb-2">
          Deck name
        </label>

        <div className="space-y-2">
          <Select value={isNewDeck ? "new" : deckName} onValueChange={handleDeckSelection}>
            <SelectTrigger
              className={cn(
                "w-full rounded-xl h-9",
                "bg-white border-slate-200 text-slate-900",
                "dark:bg-slate-800/70 dark:border-slate-700 dark:text-slate-50",
              )}
            >
              <SelectValue placeholder="Select a deck or create new" />
            </SelectTrigger>

<SelectContent className="dark:bg-slate-800 dark:border-slate-700">
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
              placeholder="Enter a name for your new deck"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              className={cn(
                "rounded-xl h-9",
                "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400",
"dark:bg-slate-800/70 dark:border-slate-700 dark:text-slate-50 dark:placeholder:text-slate-400",
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
          "min-h-[240px] md:min-h-[260px]", // smaller textarea
          "rounded-2xl font-mono text-sm leading-relaxed",
          "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400",
"dark:bg-slate-800/70 dark:border-slate-700 dark:text-slate-50 dark:placeholder:text-slate-400",
          "focus-visible:ring-2 focus-visible:ring-sky-500/40",
        )}
      />

      {deckListStats.total > 0 && (
        <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
          <span>Pokémon: {deckListStats.pokemon}</span>
          <span>Trainer: {deckListStats.trainer}</span>
          <span>Energy: {deckListStats.energy}</span>
          <span className={cn("font-semibold", deckListStats.total === 60 ? "text-emerald-600" : "text-rose-600")}>
            Total: {deckListStats.total}/60
          </span>
        </div>
      )}

      {deckListError && <p className="text-sm text-rose-600">{deckListError}</p>}

      <div className="pt-2 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => setShowDeckListDialog(false)} className="rounded-xl">
          Cancel
        </Button>
        <Button
          onClick={() => {
            setIsSaveDeckPressed(true)
            setTimeout(() => {
              setIsSaveDeckPressed(false)
              handleSaveDeckList()
            }, 150)
          }}
          disabled={isNewDeck && !newDeckName.trim()}
          className={cn(pillBtn(isSaveDeckPressed), "rounded-xl")}
        >
          Save
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
    </div>
  )
}

/* ---------------- helpers ---------------- */

function formatActionHtml(action: string) {
  if (action.includes("drew") || action.includes("drawn")) {
    return `<strong><em>${highlightAceSpecCards(action)}</em></strong>`
  }
  if (action.includes("damage")) {
    return `<strong>${
      action.includes("Knocked Out") ? `<u>${highlightAceSpecCards(action)}</u>` : highlightAceSpecCards(action)
    }</strong>`
  }
  if (action.includes("Knocked Out")) return `<strong><u>${highlightAceSpecCards(action)}</u></strong>`
  if (action.includes("conceded the game")) return `<strong style="color: #dc2626;">${highlightAceSpecCards(action)}</strong>`
  return highlightAceSpecCards(action)
}

function parseTurnsWithPerspective(rawLog: string, youName: string, oppName: string) {
  const lines = rawLog.split(/\r?\n/)

  const turns: { turnNumber: number; userActions: string[]; opponentActions: string[] }[] = []
  let currentTurn = 0
  let current = { turnNumber: 0, userActions: [] as string[], opponentActions: [] as string[] }

  const you = youName?.trim()
  const opp = oppName?.trim()

  const pushCurrent = () => {
    if (current.userActions.length || current.opponentActions.length || current.turnNumber === 0) turns.push(current)
  }

  const stripPrefix = (line: string, name: string) => {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    return line
      .replace(new RegExp(`^${esc}\\s+`, "i"), "")
      .replace(new RegExp(`^${esc}['’]s\\s+`, "i"), "")
      .trim()
  }

  const isFor = (line: string, name: string) => {
    if (!name) return false
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    return new RegExp(`^${esc}(\\s|['’]s\\s)`, "i").test(line)
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    if (/^Turn\s*#\s*\d+/i.test(line)) {
      const n = Number.parseInt(line.split("#")[1], 10)
      const gameTurn = Number.isFinite(n) ? Math.ceil(n / 2) : currentTurn + 1

      if (gameTurn !== currentTurn) {
        pushCurrent()
        currentTurn = gameTurn
        current = { turnNumber: currentTurn, userActions: [], opponentActions: [] }
      }
      continue
    }

    if (you && isFor(line, you)) current.userActions.push(stripPrefix(line, you))
    else if (opp && isFor(line, opp)) current.opponentActions.push(stripPrefix(line, opp))
    else current.userActions.push(line)
  }

  pushCurrent()
  return turns
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
  const takerNorm = normalizeLoose(playerName)
  if (!takerNorm) return []

  const lines = rawLog.split(/\r?\n/)

  // FIFO-ish queue of KOs we’ve seen but not yet paired to a prize-take line.
  const pendingKOs: { ownerNorm: string; victim: string }[] = []
  const seq: string[] = []

  const parsePrizeCount = (line: string): number => {
    // "took a Prize card." => 1
    // "took 2 Prize cards." => 2
    const m = line.match(/\btook\s+(\d+)\s+Prize cards?\./i)
    if (m?.[1]) {
      const n = Number.parseInt(m[1], 10)
      return Number.isFinite(n) && n > 0 ? n : 1
    }
    return /\btook\s+a\s+Prize card\./i.test(line) ? 1 : 0
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    // KO lines:
    // "capisz's Dusknoir was Knocked Out!"
    // "brunolugon’s Munkidori was Knocked Out."
    // "Munkidori was Knocked Out!"
    const ownedKO = line.match(/^(.+?)['’]s\s+(.+?)\s+was Knocked Out[!.]/i)
    if (ownedKO) {
      const owner = normalizeLoose((ownedKO[1] ?? "").trim())
      const victim = stripOwnerPrefix((ownedKO[2] ?? "").trim())
      if (victim) pendingKOs.push({ ownerNorm: owner, victim })
      continue
    }

    const bareKO = line.match(/^(.+?)\s+was Knocked Out[!.]/i)
    if (bareKO) {
      const victim = stripOwnerPrefix((bareKO[1] ?? "").trim())
      if (victim) pendingKOs.push({ ownerNorm: "", victim })
      continue
    }

    // Prize lines:
    // "capisz took a Prize card." / "capisz took 2 Prize cards."
    const pm = line.match(/^(.+?)\s+took\s+(?:a|an|\d+)\s+Prize card(?:s)?\./i)
    if (!pm) continue

    const taker = normalizeLoose((pm[1] ?? "").trim())
    if (!taker) continue

    // Pair this prize-take with the most recent KO from the OTHER side.
    // This is the critical bit that fixes self-KO attribution.
    let idx = -1
    for (let i = pendingKOs.length - 1; i >= 0; i--) {
      const ko = pendingKOs[i]
      if (!ko.ownerNorm || ko.ownerNorm !== taker) {
        idx = i
        break
      }
    }
    if (idx < 0) continue

    const [{ victim }] = pendingKOs.splice(idx, 1)

    // If this prize-taker is the player we’re building the map for, record it.
    if (taker === takerNorm) {
      const count = parsePrizeCount(line) || 1
      for (let k = 0; k < count; k++) seq.push(victim)
    }
  }

  return seq
}

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

function getContrastColor(hexColor: string) {
  const r = Number.parseInt(hexColor.slice(1, 3), 16)
  const g = Number.parseInt(hexColor.slice(3, 5), 16)
  const b = Number.parseInt(hexColor.slice(5, 7), 16)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 128 ? "black" : "white"
}
