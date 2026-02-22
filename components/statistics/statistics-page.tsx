"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, RefreshCcw } from "lucide-react"
import type { User } from "@/types/auth"
import { UserProfile } from "./user-profile"
import { DeckList } from "./deck-list"
import { CardStatistics } from "./card-statistics"
import { GameList } from "@/components/game-list"
import { GameDetail } from "@/components/game-detail"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OverallStats } from "./overall-stats"
import { buildStatistics } from "./statistics-utils"
import type { StatisticsModel } from "./types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { GameSummary } from "@/types/game"

interface StatisticsPageProps {
  user: User
}

type HistoryGame = GameSummary & { __createdAtMs: number }

type HistorySortConfig = {
  key: keyof GameSummary
  direction: "asc" | "desc"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function readString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

function readNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function readBoolean(value: unknown): boolean {
  if (value === true) return true
  if (typeof value === "number") return value === 1
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    return normalized === "true" || normalized === "1" || normalized === "yes"
  }
  return false
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0)
}

function readTags(value: unknown): { text: string; color: string }[] | undefined {
  if (!Array.isArray(value)) return undefined

  const tags = value
    .map((entry) => {
      if (!isRecord(entry)) return null
      const text = readString(entry.text)
      const color = readString(entry.color) || "#5e82ab"
      if (!text) return null
      return { text, color }
    })
    .filter((entry): entry is { text: string; color: string } => entry !== null)

  return tags.length ? tags : undefined
}

function readActionPackedTurns(value: unknown): { user: number; opponent: number } {
  if (!isRecord(value)) return { user: 0, opponent: 0 }
  return {
    user: readNumber(value.user),
    opponent: readNumber(value.opponent),
  }
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return null
}

function formatDateLabel(date: Date | null): string {
  if (!date) return "Unknown date"
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function toHistoryGame(rawGame: unknown): HistoryGame | null {
  if (!isRecord(rawGame)) return null
  const summary = isRecord(rawGame.gameSummary) ? rawGame.gameSummary : null

  const id = readString(summary?.id, rawGame.id, summary?.gameId, rawGame.gameId, rawGame._id)
  if (!id) return null

  const parsedDate = parseDate(summary?.createdAt ?? rawGame.createdAt ?? summary?.date ?? rawGame.date)
  const date = readString(summary?.date, rawGame.date) || formatDateLabel(parsedDate)

  const tags = readTags(summary?.tags ?? rawGame.tags)
  const userAceSpecs = readStringArray(summary?.userAceSpecs ?? rawGame.userAceSpecs)
  const opponentAceSpecs = readStringArray(summary?.opponentAceSpecs ?? rawGame.opponentAceSpecs)
  const winnerPrizePath = readStringArray(summary?.winnerPrizePath ?? rawGame.winnerPrizePath)

  const historyGame: HistoryGame = {
    id,
    date,
    username: readString(summary?.username, rawGame.username, summary?.user, rawGame.user, "Unknown"),
    opponent: readString(summary?.opponent, rawGame.opponent, "Unknown Opponent"),
    userMainAttacker: readString(summary?.userMainAttacker, rawGame.userMainAttacker, "Unknown"),
    opponentMainAttacker: readString(summary?.opponentMainAttacker, rawGame.opponentMainAttacker, "Unknown"),
    userOtherPokemon: readStringArray(summary?.userOtherPokemon ?? rawGame.userOtherPokemon),
    opponentOtherPokemon: readStringArray(summary?.opponentOtherPokemon ?? rawGame.opponentOtherPokemon),
    turns: readNumber(summary?.turns ?? rawGame.turns),
    userWon: readBoolean(summary?.userWon ?? rawGame.userWon),
    damageDealt: readNumber(summary?.damageDealt ?? rawGame.damageDealt),
    userPrizeCardsTaken: readNumber(summary?.userPrizeCardsTaken ?? rawGame.userPrizeCardsTaken),
    opponentPrizeCardsTaken: readNumber(summary?.opponentPrizeCardsTaken ?? rawGame.opponentPrizeCardsTaken),
    rawLog: readString(summary?.rawLog, rawGame.rawLog),
    wentFirst: readBoolean(summary?.wentFirst ?? rawGame.wentFirst),
    userConceded: readBoolean(summary?.userConceded ?? rawGame.userConceded),
    opponentConceded: readBoolean(summary?.opponentConceded ?? rawGame.opponentConceded),
    highDamageAttackCount: readNumber(summary?.highDamageAttackCount ?? rawGame.highDamageAttackCount),
    benchKnockouts: readNumber(summary?.benchKnockouts ?? rawGame.benchKnockouts),
    totalBenchedPokemon: readNumber(summary?.totalBenchedPokemon ?? rawGame.totalBenchedPokemon),
    weaknessBonus: readBoolean(summary?.weaknessBonus ?? rawGame.weaknessBonus),
    actionPackedTurns: readActionPackedTurns(summary?.actionPackedTurns ?? rawGame.actionPackedTurns),
    userArchetype: readString(summary?.userArchetype, rawGame.userArchetype, summary?.deckName, rawGame.deckName) || null,
    opponentArchetype:
      readString(summary?.opponentArchetype, rawGame.opponentArchetype, summary?.opponentDeckName, rawGame.opponentDeckName) ||
      null,
    __createdAtMs: parsedDate?.getTime() ?? 0,
  }

  if (tags?.length) historyGame.tags = tags
  if (userAceSpecs.length) historyGame.userAceSpecs = userAceSpecs
  if (opponentAceSpecs.length) historyGame.opponentAceSpecs = opponentAceSpecs
  if (winnerPrizePath.length) historyGame.winnerPrizePath = winnerPrizePath

  return historyGame
}

function toSortableValue(value: unknown): number | string {
  if (typeof value === "number") return value
  if (typeof value === "boolean") return value ? 1 : 0
  return String(value ?? "").toLowerCase()
}

const EMPTY_MODEL: StatisticsModel = {
  games: [],
  overall: {
    totalGames: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    firstTurnGames: 0,
    firstTurnWins: 0,
    firstTurnWinRate: 0,
    avgTurns: 0,
    avgDamageDealt: 0,
    avgUserPrizes: 0,
    avgOpponentPrizes: 0,
    mostPlayedDeck: "None",
    mostSuccessfulDeck: "None",
  },
  decks: [],
  overallMatchups: [],
  opponentStats: [],
  globalPokemonStats: [],
}

export function StatisticsPage({ user }: StatisticsPageProps) {
  const router = useRouter()
  const [model, setModel] = useState<StatisticsModel>(EMPTY_MODEL)
  const [selectedDeckKey, setSelectedDeckKey] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pokemonSearch, setPokemonSearch] = useState("")
  const [opponentSearch, setOpponentSearch] = useState("")
  const [historySearch, setHistorySearch] = useState("")
  const [historyGames, setHistoryGames] = useState<HistoryGame[]>([])
  const [selectedHistoryGame, setSelectedHistoryGame] = useState<HistoryGame | null>(null)
  const [historySortConfig, setHistorySortConfig] = useState<HistorySortConfig>({
    key: "date",
    direction: "desc",
  })

  const brandButtonClass =
    "h-9 rounded-full border-none px-5 text-sm bg-[#5e82ab] text-slate-50 hover:bg-[#4f739d] active:bg-[#44678f] dark:bg-[#b1cce8] dark:text-[#0b1220] dark:hover:bg-[#a1c2e4] dark:active:bg-[#93b7df]"
  const backArrowClass =
    "h-9 w-9 rounded-full border-none bg-[#5e82ab]/14 text-[#5e82ab] shadow-none transition-all duration-200 ease-out hover:scale-110 hover:bg-[#5e82ab]/24 hover:shadow-[0_0_18px_rgba(94,130,171,0.32)] dark:bg-[#b1cce8]/16 dark:text-[#b1cce8] dark:hover:bg-[#b1cce8]/26 dark:hover:shadow-[0_0_18px_rgba(177,204,232,0.30)]"
  const panelClass =
    "rounded-3xl border border-slate-200/55 bg-white/35 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-slate-700/35 dark:bg-[#162638]/55 dark:shadow-[0_18px_45px_rgba(0,0,0,0.25)]"
  const subPanelClass =
    "rounded-2xl border border-slate-200/60 bg-white/50 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-slate-700/40 dark:bg-[#1b3048]/55 dark:shadow-[0_16px_38px_rgba(0,0,0,0.22)]"
  const tableHeaderRowClass = "border-slate-200/70 dark:border-slate-600/45"
  const tableHeadClass = "h-10 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700/90 dark:text-slate-200"
  const tableBodyRowClass = "border-slate-200/65 hover:bg-slate-100/65 dark:border-slate-600/40 dark:hover:bg-white/[0.05]"
  const filterInputClass =
    "h-9 w-full max-w-xs bg-slate-100/90 text-gray-900 placeholder:text-slate-400 border border-slate-300 shadow-[0_0_22px_rgba(42,81,128,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/70 focus-visible:ring-offset-0 dark:bg-slate-500/70 dark:text-slate-100 dark:placeholder:text-slate-300/90 dark:border-slate-600 dark:shadow-[0_0_32px_rgba(56,189,248,0.1)] dark:focus-visible:ring-slate-300"
  const historySearchInputClass =
    "h-10 w-full sm:w-72 rounded-xl bg-slate-100/90 text-slate-900 placeholder:text-slate-400 border border-slate-200/60 shadow-[0_0_22px_rgba(42,81,128,0.1)] focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-0 dark:bg-slate-500/60 dark:text-slate-100 dark:placeholder:text-slate-200/70 dark:border-slate-900/35 dark:shadow-[0_0_32px_rgba(56,189,248,0.10)] dark:focus-visible:ring-slate-400"

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/games?limit=5000")
      if (!response.ok) throw new Error(`Failed to load games (${response.status})`)

      const payload = (await response.json()) as { games?: unknown[] }
      const rawGames = Array.isArray(payload.games) ? payload.games : []
      const parsed = buildStatistics(rawGames)
      const parsedHistoryGames = rawGames
        .map(toHistoryGame)
        .filter((game): game is HistoryGame => game !== null)
        .sort((a, b) => b.__createdAtMs - a.__createdAtMs || b.id.localeCompare(a.id))
      setModel(parsed)
      setHistoryGames(parsedHistoryGames)
    } catch (err) {
      console.error("Failed to load statistics", err)
      setModel(EMPTY_MODEL)
      setHistoryGames([])
      setError("Could not load your statistics right now.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  useEffect(() => {
    if (!model.decks.length) {
      setSelectedDeckKey(null)
      return
    }
    if (!selectedDeckKey || !model.decks.some((deck) => deck.key === selectedDeckKey)) {
      setSelectedDeckKey(model.decks[0].key)
    }
  }, [model.decks, selectedDeckKey])

  const selectedDeck = useMemo(
    () => model.decks.find((deck) => deck.key === selectedDeckKey) ?? null,
    [model.decks, selectedDeckKey],
  )

  const filteredGlobalPokemon = useMemo(
    () =>
      model.globalPokemonStats.filter((pokemon) =>
        pokemon.name.toLowerCase().includes(pokemonSearch.trim().toLowerCase()),
      ),
    [model.globalPokemonStats, pokemonSearch],
  )

  const filteredOpponents = useMemo(
    () =>
      model.opponentStats.filter((opponent) =>
        opponent.name.toLowerCase().includes(opponentSearch.trim().toLowerCase()),
      ),
    [model.opponentStats, opponentSearch],
  )

  const filteredHistoryGames = useMemo(() => {
    const sortedGames = [...historyGames].sort((a, b) => {
      const aValue = toSortableValue(a[historySortConfig.key])
      const bValue = toSortableValue(b[historySortConfig.key])

      if (aValue < bValue) return historySortConfig.direction === "asc" ? -1 : 1
      if (aValue > bValue) return historySortConfig.direction === "asc" ? 1 : -1

      return b.__createdAtMs - a.__createdAtMs
    })

    const searchLower = historySearch.trim().toLowerCase()
    if (!searchLower) return sortedGames

    return sortedGames.filter((game) => {
      return (
        game.userMainAttacker.toLowerCase().includes(searchLower) ||
        game.opponentMainAttacker.toLowerCase().includes(searchLower) ||
        game.opponent.toLowerCase().includes(searchLower) ||
        game.userOtherPokemon.some((pokemon) => pokemon.toLowerCase().includes(searchLower)) ||
        game.opponentOtherPokemon.some((pokemon) => pokemon.toLowerCase().includes(searchLower)) ||
        game.tags?.some((tag) => tag.text.toLowerCase().includes(searchLower)) ||
        game.rawLog.toLowerCase().includes(searchLower)
      )
    })
  }, [historyGames, historySearch, historySortConfig])

  const handleHistorySort = useCallback((key: keyof GameSummary) => {
    setHistorySortConfig((previous) => ({
      key,
      direction: previous.key === key && previous.direction === "asc" ? "desc" : "asc",
    }))
  }, [])

  const handleHistoryUpdate = useCallback((updatedGame: GameSummary) => {
    setHistoryGames((previous) =>
      previous.map((game) => (game.id === updatedGame.id ? ({ ...game, ...updatedGame } as HistoryGame) : game)),
    )
    setSelectedHistoryGame((previous) =>
      previous?.id === updatedGame.id ? ({ ...previous, ...updatedGame } as HistoryGame) : previous,
    )
  }, [])

  const handleHistoryDelete = useCallback((gameId: string) => {
    setHistoryGames((previous) => previous.filter((game) => game.id !== gameId))
    setSelectedHistoryGame((previous) => (previous?.id === gameId ? null : previous))
  }, [])

  useEffect(() => {
    if (!selectedHistoryGame) return
    const refreshedGame = historyGames.find((game) => game.id === selectedHistoryGame.id) ?? null
    if (!refreshedGame) {
      setSelectedHistoryGame(null)
      return
    }
    if (refreshedGame !== selectedHistoryGame) {
      setSelectedHistoryGame(refreshedGame)
    }
  }, [historyGames, selectedHistoryGame])

  const lastPlayedLabel = model.games[0]?.dateLabel ?? "No games yet"

  return (
    <div className="w-full space-y-5">
      <div className="w-full border-b border-[#bccddf] dark:border-[#686e73]" aria-hidden />

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button
            type="button"
            variant="outline"
            className={backArrowClass}
            onClick={() => router.push("/")}
            aria-label="Back to analyzer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-700/90 dark:text-sky-100 sm:text-3xl">
              Account Statistics
            </h1>
            <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Live metrics from your saved games, including matchup and individual performance.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void loadStats()}
          disabled={loading}
          className={brandButtonClass}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <UserProfile user={user} stats={model.overall} deckCount={model.decks.length} lastPlayedLabel={lastPlayedLabel} />

        <div className={`${panelClass} p-4 sm:p-5`}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList
              className="
                mb-4 flex h-auto w-full justify-start gap-2 rounded-none border-b border-[#bccddf] bg-transparent p-0
                dark:border-[#686e73]
              "
            >
              <TabsTrigger
                value="overview"
                className="
                  -mb-px rounded-none border-b-2 border-transparent bg-transparent px-3 py-2 text-sm font-medium shadow-none
                  text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200
                  data-[state=active]:border-[#5e82ab] data-[state=active]:bg-transparent data-[state=active]:text-[#5e82ab] data-[state=active]:shadow-none
                  dark:data-[state=active]:border-sky-100 dark:data-[state=active]:text-sky-100
                "
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="deck-stats"
                className="
                  -mb-px rounded-none border-b-2 border-transparent bg-transparent px-3 py-2 text-sm font-medium shadow-none
                  text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200
                  data-[state=active]:border-[#5e82ab] data-[state=active]:bg-transparent data-[state=active]:text-[#5e82ab] data-[state=active]:shadow-none
                  dark:data-[state=active]:border-sky-100 dark:data-[state=active]:text-sky-100
                "
              >
                Deck Matchups
              </TabsTrigger>
              <TabsTrigger
                value="individual"
                className="
                  -mb-px rounded-none border-b-2 border-transparent bg-transparent px-3 py-2 text-sm font-medium shadow-none
                  text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200
                  data-[state=active]:border-[#5e82ab] data-[state=active]:bg-transparent data-[state=active]:text-[#5e82ab] data-[state=active]:shadow-none
                  dark:data-[state=active]:border-sky-100 dark:data-[state=active]:text-sky-100
                "
              >
                Individual Data
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="
                  -mb-px rounded-none border-b-2 border-transparent bg-transparent px-3 py-2 text-sm font-medium shadow-none
                  text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200
                  data-[state=active]:border-[#5e82ab] data-[state=active]:bg-transparent data-[state=active]:text-[#5e82ab] data-[state=active]:shadow-none
                  dark:data-[state=active]:border-sky-100 dark:data-[state=active]:text-sky-100
                "
              >
                Game History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              {loading ? (
                <div className="flex h-56 items-center justify-center text-slate-700 dark:text-slate-200/85">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading statistics...
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/60 dark:bg-rose-950/30 dark:text-rose-200">
                  {error}
                </div>
              ) : (
                <OverallStats
                  stats={model.overall}
                  decks={model.decks}
                  matchups={model.overallMatchups}
                  opponents={model.opponentStats}
                />
              )}
            </TabsContent>

            <TabsContent value="deck-stats" className="mt-4">
              {loading ? (
                <div className="flex h-56 items-center justify-center text-slate-700 dark:text-slate-200/85">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading deck data...
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                  <Card className={subPanelClass}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-slate-700/85 dark:text-sky-100">Your Deck Archetypes</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <DeckList decks={model.decks} selectedDeckKey={selectedDeckKey} onSelectDeck={setSelectedDeckKey} />
                    </CardContent>
                  </Card>

                  <Card className={subPanelClass}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-slate-700/85 dark:text-sky-100">Deck Details</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {selectedDeck ? (
                        <CardStatistics deck={selectedDeck} />
                      ) : (
                        <p className="text-sm text-slate-700 dark:text-slate-200/80">
                          Select a deck archetype to view matchup and individual data.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="individual" className="mt-4 space-y-4">
              {loading ? (
                <div className="flex h-56 items-center justify-center text-slate-700 dark:text-slate-200/85">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading individual data...
                </div>
              ) : (
                <>
                  <Card className={subPanelClass}>
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <CardTitle className="text-base text-slate-700/85 dark:text-sky-100">Global Pokemon Performance</CardTitle>
                        <Input
                          value={pokemonSearch}
                          onChange={(event) => setPokemonSearch(event.target.value)}
                          placeholder="Filter pokemon..."
                          className={filterInputClass}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {filteredGlobalPokemon.length === 0 ? (
                        <p className="text-sm text-slate-600 dark:text-slate-300">No pokemon data found.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className={tableHeaderRowClass}>
                              <TableHead className={tableHeadClass}>Pokemon</TableHead>
                              <TableHead className={`${tableHeadClass} text-right`}>Games</TableHead>
                              <TableHead className={`${tableHeadClass} text-right`}>Record</TableHead>
                              <TableHead className={`${tableHeadClass} text-right`}>WR</TableHead>
                              <TableHead className={`${tableHeadClass} text-right`}>As Main</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredGlobalPokemon.slice(0, 50).map((pokemon) => (
                              <TableRow key={pokemon.name} className={tableBodyRowClass}>
                                <TableCell className="font-medium">{pokemon.name}</TableCell>
                                <TableCell className="text-right tabular-nums">{pokemon.games}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {pokemon.wins}-{pokemon.losses}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">{pokemon.winRate.toFixed(1)}%</TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {pokemon.mainGames} ({pokemon.mainWinRate.toFixed(1)}%)
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>

                  <Card className={subPanelClass}>
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <CardTitle className="text-base text-slate-700/85 dark:text-sky-100">Opponent Performance</CardTitle>
                        <Input
                          value={opponentSearch}
                          onChange={(event) => setOpponentSearch(event.target.value)}
                          placeholder="Filter opponents..."
                          className={filterInputClass}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {filteredOpponents.length === 0 ? (
                        <p className="text-sm text-slate-600 dark:text-slate-300">No opponent data found.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className={tableHeaderRowClass}>
                              <TableHead className={tableHeadClass}>Opponent</TableHead>
                              <TableHead className={`${tableHeadClass} text-right`}>Games</TableHead>
                              <TableHead className={`${tableHeadClass} text-right`}>Record</TableHead>
                              <TableHead className={`${tableHeadClass} text-right`}>WR</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredOpponents.slice(0, 50).map((opponent) => (
                              <TableRow key={opponent.name.toLowerCase()} className={tableBodyRowClass}>
                                <TableCell className="font-medium">{opponent.name}</TableCell>
                                <TableCell className="text-right tabular-nums">{opponent.games}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {opponent.wins}-{opponent.losses}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">{opponent.winRate.toFixed(1)}%</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              {loading ? (
                <div className="flex h-56 items-center justify-center text-slate-700 dark:text-slate-200/85">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading game history...
                </div>
              ) : selectedHistoryGame ? (
                <GameDetail
                  game={selectedHistoryGame}
                  onBack={() => setSelectedHistoryGame(null)}
                  allGames={historyGames}
                  onUpdateGame={handleHistoryUpdate}
                />
              ) : (
                <div className="space-y-4">
                  <Input
                    type="text"
                    placeholder="Search imported game history..."
                    value={historySearch}
                    onChange={(event) => setHistorySearch(event.target.value)}
                    className={historySearchInputClass}
                  />

                  {filteredHistoryGames.length > 0 ? (
                    <GameList
                      games={filteredHistoryGames}
                      onSelectGame={(game) => setSelectedHistoryGame(game as HistoryGame)}
                      onDeleteGame={handleHistoryDelete}
                      sortConfig={historySortConfig}
                      onSort={handleHistorySort}
                      showTags={false}
                    />
                  ) : (
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {historySearch.trim() ? "No games found matching your search." : "No imported game history yet."}
                    </p>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
