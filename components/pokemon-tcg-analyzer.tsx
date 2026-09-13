// components/pokemon-tcg-analyzer.tsx
"use client"

import { useState, useCallback, useEffect, useRef, useLayoutEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { matchesSearch } from "@/utils/match-presentation"
import { GameList } from "@/components/game-list"
import { GameDetail } from "@/components/game-detail"
import { ImportConfirmationDialog } from "@/components/import-confirmation-dialog"
import { analyzeGameLog, getGameDataForConfirmation } from "@/utils/game-analyzer"
import type { GameSummary } from "@/types/game"
import { getUser } from "@/app/actions"
import { PlayerDatabasePanel } from "@/components/player-database"
import { cn } from "@/lib/utils"
import { PrizeMapperPanel } from "@/components/prize-mapper-panel"
import { DeckLab } from "@/components/deck-lab"
import "./tool-workspace.css"
import {
  guestGamePersistence,
  PersistenceError,
  remoteGamePersistence,
  type GamePersistence,
} from "@/lib/game-persistence"
import { gameDraftSchema } from "@/lib/game-contract"
import type { PersistenceState } from "@/lib/api-contract"
import { mergeAcknowledgedGame } from "@/lib/game-list-state"

declare global {
  interface Window {
    dragapultist?: {
      onLogDetected?: (cb: (logText: string) => void) => () => void
    }
  }
}

export function PokemonTCGAnalyzer() {
  const [activeTab, setActiveTab] = useState<"games" | "players" | "prizeMapper" | "topDeckCalc">(
    "games",
  )

  const [gamesLoading, setGamesLoading] = useState(false)
  const [gamesError, setGamesError] = useState<string | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [loadRevision, setLoadRevision] = useState(0)
  const [games, setGames] = useState<GameSummary[]>([])
  const [searchResultIds, setSearchResultIds] = useState<Set<string> | null>(null)
  const [selectedGame, setSelectedGame] = useState<GameSummary | null>(null)
  const returnState = useRef<{ id: string | null; scrollY: number }>({ id: null, scrollY: 0 })
  const [manualInput, setManualInput] = useState<string>("")
  const [importOpen, setImportOpen] = useState(true)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [sortConfig, setSortConfig] = useState<{
    key: keyof GameSummary
    direction: "asc" | "desc"
  }>({ key: "date", direction: "desc" })
  const [user, setUser] = useState<{ id: string; username: string } | null>(null)
  const [validationStatus, setValidationStatus] = useState<"none" | "valid" | "invalid">("none")
  const [saveState, setSaveState] = useState<PersistenceState>("idle")
  const [retrySave, setRetrySave] = useState<{ game: GameSummary; idempotencyKey: string } | null>(null)
  const [retryUpdate, setRetryUpdate] = useState<GameSummary | null>(null)
  const [isButtonPressed, setIsButtonPressed] = useState(false)
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false)
  const [pendingGameData, setPendingGameData] = useState<any>(null)
  const [pendingGameLog, setPendingGameLog] = useState<string>("")
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const buttonTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [ptcglUsername, setPtcglUsername] = useState<string>("")

  const tabsBarRef = useRef<HTMLDivElement | null>(null)
  const tabRefs = useRef<
    Record<"games" | "players" | "prizeMapper" | "topDeckCalc", HTMLButtonElement | null>
  >({
    games: null,
    players: null,
    prizeMapper: null,
    topDeckCalc: null,
  })

  const [tabIndicator, setTabIndicator] = useState<{ x: number; y: number; w: number; show: boolean }>({
    x: 0,
    y: 0,
    w: 0,
    show: false,
  })

  const updateTabIndicator = useCallback(() => {
    const bar = tabsBarRef.current
    const btn = tabRefs.current[activeTab]
    if (!bar || !btn) return

    const barRect = bar.getBoundingClientRect()
    const btnRect = btn.getBoundingClientRect()
    const scale = barRect.width / bar.offsetWidth || 1

    setTabIndicator({
      x: (btnRect.left - barRect.left) / scale + bar.scrollLeft,
      y: (btnRect.bottom - barRect.top) / scale - 2,
      w: btnRect.width / scale,
      show: true,
    })
  }, [activeTab])

  useLayoutEffect(() => {
    updateTabIndicator()
  }, [updateTabIndicator])

  useEffect(() => {
    const onResize = () => updateTabIndicator()
    window.addEventListener("resize", onResize)
    const observer = new ResizeObserver(onResize)
    if (tabsBarRef.current) observer.observe(tabsBarRef.current)
    Object.values(tabRefs.current).forEach(tab => { if (tab) observer.observe(tab) })
    document.fonts.addEventListener("loadingdone", onResize)
    return () => { window.removeEventListener("resize", onResize); observer.disconnect(); document.fonts.removeEventListener("loadingdone", onResize) }
  }, [updateTabIndicator])

  useEffect(() => {
    const refreshUser = () => {
      setGames([])
      setSearchResultIds(null)
      setSelectedGame(null)
      setRetrySave(null)
      setSaveState("idle")
      getUser().then(setUser).catch(() => setUser(null))
    }
    refreshUser()
    window.addEventListener("dragapultist-auth-changed", refreshUser)
    return () => window.removeEventListener("dragapultist-auth-changed", refreshUser)
  }, [])

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ptcglUsername")
      if (stored) setPtcglUsername(stored)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setGamesError(null)
    const persistence: GamePersistence = !user || user.username === "Guest" ? guestGamePersistence : remoteGamePersistence
    setGames([])
    setGamesLoading(true)
    setSaveState("loading")
    const loadAllPages = async () => {
      const loaded: GameSummary[] = []
      let cursor: string | undefined
      do {
        const page = await persistence.list({ cursor, limit: 100, signal: controller.signal })
        loaded.push(...page.games as unknown as GameSummary[])
        cursor = page.nextCursor ?? undefined
      } while (cursor && !controller.signal.aborted)
      return loaded
    }
    loadAllPages()
      .then(data => {
        if (!controller.signal.aborted) {
          setGames(data)
          setSaveState("idle")
        }
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setGamesError("Your match history is unavailable. Please retry.")
          setSaveState(error instanceof PersistenceError ? error.status : "unavailable")
        }
      })
      .finally(() => { if (!controller.signal.aborted) setGamesLoading(false) })
    return () => controller.abort()
  }, [user, loadRevision])

  useEffect(() => {
    const query = searchTerm.trim()
    if (!query) {
      setSearchResultIds(null)
      setSearchError(null)
      return
    }
    setSearchResultIds(new Set())

    const controller = new AbortController()
    const persistence: GamePersistence = !user || user.username === "Guest" ? guestGamePersistence : remoteGamePersistence
    const timer = window.setTimeout(() => {
      void (async () => {
        const ids = new Set<string>()
        let cursor: string | undefined
        do {
          const page = await persistence.list({ cursor, limit: 100, query, signal: controller.signal })
          page.games.forEach(game => ids.add(game.id))
          cursor = page.nextCursor ?? undefined
        } while (cursor && !controller.signal.aborted)
        if (!controller.signal.aborted) {
          setSearchResultIds(ids)
          setSearchError(null)
        }
      })().catch(error => {
        if (!controller.signal.aborted) {
          setSearchError(error instanceof Error ? error.message : "Search is unavailable. Please retry.")
          setSearchResultIds(new Set())
        }
      })
    }, 200)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [searchTerm, user, loadRevision])

  useEffect(() => {
    if (activeTab !== "topDeckCalc") return
    const persistence = !user || user.username === "Guest" ? guestGamePersistence : remoteGamePersistence
    const controller = new AbortController()
    const targets = games.filter(game => game.hasDeck && !game.deckList)
    void (async () => {
      for (const target of targets) {
        if (controller.signal.aborted) return
        try {
          const detail = await persistence.get(target.id, controller.signal)
          setGames(current => current.map(game => game.id === target.id ? detail as unknown as GameSummary : game))
        } catch {
          // The Deck Lab keeps its existing text fallback when a saved deck cannot load.
        }
      }
    })()
    return () => controller.abort()
  }, [activeTab, games, user])

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
      if (buttonTimerRef.current) clearTimeout(buttonTimerRef.current)
    }
  }, [])

  const validateGameLog = useCallback((log: string) => {
    const normalized = log.replace(/\r/g, "").trim()
    if (!normalized) return false

    const openingHandCount = (normalized.match(/drew 7 cards for the opening hand\./gi) || []).length
    const hasTurnMarkers =
      /(?:^|\n)Turn #\s*\d+\s*-\s*.+?['’]s Turn/i.test(normalized) ||
      /(?:^|\n)\[[^\]]+\]['’]s Turn/i.test(normalized) ||
      /(?:^|\n)[^\n\[]+['’]s Turn/i.test(normalized)
    const hasCoreActions = /\b(played|used|attached|evolved|retreated|knocked out)\b/i.test(normalized)
    const hasResult = /\b(wins\.|conceded\.|took all of (?:their|your) Prize cards\.)/i.test(normalized)

    // Accept full logs like the standard "Setup + Turn # + result" format, while still
    // allowing ongoing logs that haven't reached a winner line yet.
    if (openingHandCount >= 1 && hasTurnMarkers && hasCoreActions) {
      return hasResult || /ended their turn\./i.test(normalized)
    }

    return false
  }, [])

  const saveImportedGame = useCallback(async (game: GameSummary, idempotencyKey: string) => {
    const persistence = !user || user.username === "Guest" ? guestGamePersistence : remoteGamePersistence
    setSaveState("saving")
    try {
      const draft = gameDraftSchema.parse(game)
      const saved = await persistence.create(draft, idempotencyKey)
      const canonical = saved.game as unknown as GameSummary
      setGames(current => mergeAcknowledgedGame(current, game.id, canonical))
      setSelectedGame(current => current?.id === game.id ? canonical : current)
      setRetrySave(null)
      setSaveState("saved")
      setValidationStatus("valid")
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
      fadeTimerRef.current = setTimeout(() => setValidationStatus("none"), 5000)
      setManualInput("")
      setPendingGameData(null)
      setPendingGameLog("")
    } catch (error) {
      setRetrySave({ game, idempotencyKey })
      setSaveState(error instanceof PersistenceError ? error.status : "retryable_failure")
      throw error
    }
  }, [user])

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
           ptcglUsername || undefined,
        )
      const idempotencyKey = crypto.randomUUID()
      void saveImportedGame(gameSummary, idempotencyKey).catch(() => undefined)

    },
    [ptcglUsername, saveImportedGame],
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
        const gameData = getGameDataForConfirmation(log, ptcglUsername || undefined)
        setPendingGameData(gameData)
        setPendingGameLog(log)
        setShowConfirmationDialog(true)
      } catch {
        setValidationStatus("invalid")
        fadeTimerRef.current = setTimeout(() => setValidationStatus("none"), 5000)
      }
    },
    [validateGameLog, ptcglUsername],
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
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [addGame, validateGameLog])

  const handleConfirmImport = useCallback(
    (swapPlayers: boolean, userArchetypeId?: string | null, opponentArchetypeId?: string | null) => {
      setShowConfirmationDialog(false)
      addGame(pendingGameLog, { swapPlayers, userArchetypeId, opponentArchetypeId })
    },
    [addGame, pendingGameLog],
  )

  const handleCancelImport = useCallback(() => {
    setShowConfirmationDialog(false)
    setPendingGameData(null)
    setPendingGameLog("")
  }, [])

  const handleDeleteGame = useCallback(
    async (id: string) => {
      const persistence = !user || user.username === "Guest" ? guestGamePersistence : remoteGamePersistence
      const current = games.find(game => game.id === id)
      setSaveState("saving")
      try {
        await persistence.remove(id, current?.revision)
      } catch (error) {
        setSaveState(error instanceof PersistenceError ? error.status : "retryable_failure")
        return
      }
      setGames((prevGames) => {
        const newGames = prevGames.filter((game) => game.id !== id)
        return newGames
      })
      if (selectedGame && selectedGame.id === id) setSelectedGame(null)
      setSaveState("saved")
    },
    [games, selectedGame, user],
  )

  const handleUpdateGame = useCallback(
    async (updatedGame: GameSummary) => {
      const newGames = games.map((game) => game.id === updatedGame.id ? updatedGame : game)
      setGames(newGames)
      setSelectedGame((previous) => previous?.id === updatedGame.id ? updatedGame : previous)
      const persistence = !user || user.username === "Guest" ? guestGamePersistence : remoteGamePersistence
      setSaveState("saving")
      try {
        const saved = await persistence.update(updatedGame.id, {
          favorite: updatedGame.favorite,
          userMainAttacker: updatedGame.userMainAttacker,
          opponentMainAttacker: updatedGame.opponentMainAttacker,
          notes: updatedGame.notes ?? {},
          tags: updatedGame.tags,
          deckList: updatedGame.deckList ?? "",
          deckName: updatedGame.deckName ?? "",
          perspective: {
            username: updatedGame.username,
            userArchetype: updatedGame.userArchetype,
            opponentArchetype: updatedGame.opponentArchetype,
          },
        }, updatedGame.revision ?? 1)
        const canonical = saved.game as unknown as GameSummary
        setGames(current => current.map(game => game.id === canonical.id ? canonical : game))
        setSelectedGame(current => current?.id === canonical.id ? canonical : current)
        setRetryUpdate(null)
        setSaveState("saved")
        return true
      } catch (error) {
        setRetryUpdate(updatedGame)
        setSaveState(error instanceof PersistenceError ? error.status : "retryable_failure")
        return false
      }
    },
    [games, user],
  )

  const handleSort = useCallback((key: keyof GameSummary) => {
    setSortConfig((prevConfig) => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === "asc" ? "desc" : "asc",
    }))
  }, [])

  const sortedGames = [...games].sort((a, b) => {
    const left = a[sortConfig.key]
    const right = b[sortConfig.key]
    if (left == null && right == null) return 0
    if (left == null) return sortConfig.direction === "asc" ? -1 : 1
    if (right == null) return sortConfig.direction === "asc" ? 1 : -1
    if (left < right) return sortConfig.direction === "asc" ? -1 : 1
    if (left > right) return sortConfig.direction === "asc" ? 1 : -1
    return 0
  })

  const normalizedSearch = searchTerm.trim()
  const filteredGames = normalizedSearch
    ? sortedGames.filter(game => searchResultIds?.has(game.id) || matchesSearch(game, normalizedSearch))
    : sortedGames

  const setSelectedGameSafely = useCallback(
    async (game: GameSummary | null) => {
      if (game === null) {
        setSelectedGame(null)
        requestAnimationFrame(() => window.scrollTo({ top: returnState.current.scrollY, behavior: "instant" }))
        return
      }
      if (!games.some(current => current.id === game.id)) return
      returnState.current = { id: game.id, scrollY: window.scrollY }
      try {
        const persistence = !user || user.username === "Guest" ? guestGamePersistence : remoteGamePersistence
        const detail = await persistence.get(game.id)
        setSelectedGame(detail as unknown as GameSummary)
        requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" }))
      } catch (error) {
        setGamesError(error instanceof Error ? error.message : "This match is unavailable.")
      }
    },
    [games, user],
  )

  const buttonStyles = {
    transform: isButtonPressed ? "scale(0.95)" : "scale(1)",
    transition: "transform 0.1s ease-in-out",
  }

  return (
    <div className="studio flex min-h-screen flex-col">
      <main className="flex-1 w-full px-4 pb-10 pt-4 md:px-6 md:pt-6">
        <div className="studio-inner mx-auto w-full max-w-6xl">
          {/* Tabs bar */}
          <div
            ref={tabsBarRef}
            className="studio-nav relative mb-4 flex items-end"
            role="navigation"
            aria-label="Primary navigation"
          >
            <div className="flex items-end gap-2">
              <button
                ref={(el) => {
                  tabRefs.current.games = el
                }}
                type="button"
                aria-current={activeTab === "games" ? "page" : undefined}
                onClick={() => setActiveTab("games")}
                className={cn(
                  "px-3 py-2 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60 dark:focus-visible:ring-sky-100/40",
                  activeTab === "games"
                    ? "text-[#5e82ab] dark:text-sky-100"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                )}
              >
                Games
              </button>
            </div>

            <div className="flex items-end gap-1">
              <button
                ref={(el) => {
                  tabRefs.current.players = el
                }}
                type="button"
                aria-current={activeTab === "players" ? "page" : undefined}
                onClick={() => setActiveTab("players")}
                className={cn(
                  "px-3 py-2 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60 dark:focus-visible:ring-sky-100/40",
                  activeTab === "players"
                    ? "text-[#5e82ab] dark:text-sky-100"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                )}
              >
                Players
              </button>

              <button
                ref={(el) => {
                  tabRefs.current.prizeMapper = el
                }}
                type="button"
                aria-current={activeTab === "prizeMapper" ? "page" : undefined}
                onClick={() => setActiveTab("prizeMapper")}
                className={cn(
                  "px-3 py-2 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60 dark:focus-visible:ring-sky-100/40",
                  activeTab === "prizeMapper"
                    ? "text-[#5e82ab] dark:text-sky-100"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                )}
              >
                Prize Mapper
              </button>

              <button
                ref={(el) => {
                  tabRefs.current.topDeckCalc = el
                }}
                type="button"
                aria-current={activeTab === "topDeckCalc" ? "page" : undefined}
                onClick={() => setActiveTab("topDeckCalc")}
                className={cn(
                  "px-3 py-2 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60 dark:focus-visible:ring-sky-100/40",
                  activeTab === "topDeckCalc"
                    ? "text-[#5e82ab] dark:text-sky-100"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                )}
              >
                Deck Lab
              </button>
            </div>

            <span
              aria-hidden
              className={cn(
                "absolute left-0 h-[2px] rounded-full",
                "bg-[#5e82ab] dark:bg-sky-100",
                "transition-[transform,width,opacity] duration-300 ease-out",
              )}
              style={{
                width: tabIndicator.w,
                top: tabIndicator.y,
                transform: `translateX(${tabIndicator.x}px)`,
                opacity: tabIndicator.show ? 1 : 0,
              }}
            />
          </div>

          {activeTab === "games" ? (
            <>

              {selectedGame ? (
                <GameDetail
                  game={selectedGame}
                  onBack={() => setSelectedGameSafely(null)}
                  allGames={games}
                  onUpdateGame={handleUpdateGame}
                  saveState={saveState}
                  onRetrySave={() => { if (retryUpdate) void handleUpdateGame(retryUpdate) }}
                />
              ) : (
                <div>


                  {(gamesError || searchError) && <div role="alert" className="studio-state"><p>{gamesError || searchError}</p><Button onClick={() => setLoadRevision(value => value + 1)}>Retry</Button></div>}
                  {(
                    <GameList
                      toolbar={<>                  <div className="games-search mb-4 relative">
                    <Input
                      type="text"
                      aria-label="Search matches by opponent, Pokémon, result, date, tag, or note"
                      placeholder="Search matches…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={cn(
                        "w-full min-h-12",
                        "bg-slate-100/90 text-gray-900 placeholder:text-slate-400",
                        "border border-slate-300 shadow-[0_0_22px_rgba(42,81,128,0.15)]",
                        "focus-visible:outline-none",
                        "focus-visible:ring-2 focus-visible:ring-slate-400/70 focus-visible:ring-offset-0",
                        "dark:bg-slate-500/70 dark:text-slate-100 dark:placeholder:text-slate-300/90",
                        "dark:border-slate-600 dark:shadow-[0_0_32px_rgba(56,189,248,0.1)]",
                        "dark:focus-visible:ring-slate-300",
                      )}
                    />
                  </div><div className="games-intro">

                  <details className="capture-tray" open={importOpen} onToggle={event => setImportOpen(event.currentTarget.open)}><summary>{importOpen ? "Minimize import" : "Import a game"}</summary>
                    <label htmlFor="match-log" className="sr-only">Game log</label>
                    <div className="capture-composer">

                  <Textarea
                    id="match-log"
                    placeholder="Paste your game log here..."
                    value={manualInput}
                    onChange={(e) => {
                      setManualInput(e.target.value)
                      if (e.target.value.trim() === "") setValidationStatus("none")
                    }}
                    className={cn(
                      "w-full h-24 rounded-2xl",
                      "bg-slate-100/90 text-gray-900 placeholder:text-slate-400",
                      "border border-slate-300 shadow-[0_0_22px_rgba(42,81,128,0.1)]",
                      "ring-offset-0 focus:ring-offset-0 focus-visible:ring-offset-0",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300",
                      "dark:bg-slate-500/50 dark:text-white dark:placeholder:text-slate-200/90",
                      "dark:border-[rgba(78,70,74,0.8)] dark:shadow-[0_0_32px_rgba(56,189,248,0.1)]",
                      "dark:focus-visible:ring-slate-300/70",
                      "px-5 py-4",
                    )}
                  />

                  <div className="flex items-center gap-3">
                    <div className="custom-button-container">
                      <Button
                        onClick={handleManualSubmit}
                        className={cn(
                          "rounded-md px-5 h-9 text-sm",
                          "bg-[#5e82ab] text-slate-50 hover:bg-sky-800/50",
                          "dark:bg-[#b1cce8] dark:text-[#121212] dark:hover:bg-[#a1c2e4]",
                          isButtonPressed ? "scale-95" : "scale-100",
                        )}
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
                        className="text-red-600 dark:text-[#eb9e9e] text-sm font-medium"
                        style={{ animation: "fadeInOut 3s forwards", opacity: 1 }}
                      >
                        Improper import format
                      </span>
                    )}
                    {saveState === "saving" && <span role="status" className="text-sm font-medium">Saving…</span>}
                    {saveState === "saved" && validationStatus !== "valid" && <span role="status" className="text-sm font-medium">Saved</span>}
                    {["unavailable", "retryable_failure", "conflict", "expired", "unauthorized"].includes(saveState) && (
                      <span role="alert" className="text-red-600 dark:text-[#eb9e9e] text-sm font-medium">
                        {saveState === "conflict" ? "Changed elsewhere. Reload before retrying." : saveState === "expired" || saveState === "unauthorized" ? "Sign in again to save." : "Save failed. Your draft is retained."}
                        {retrySave && <Button type="button" variant="ghost" onClick={() => void saveImportedGame(retrySave.game, retrySave.idempotencyKey).catch(() => undefined)}>Retry</Button>}
                      </span>
                    )}
                  </div>
                    </div>
                  </details>
                </div></>}
                      games={filteredGames}
                      restoreMatchId={returnState.current.id}
                      hasHistory={games.length > 0}
                      onSelectGame={setSelectedGameSafely}
                      onDeleteGame={handleDeleteGame}
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      showTags={false}
                    />
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
          ) : activeTab === "prizeMapper" ? (
            <PrizeMapperPanel ptcglUsername={ptcglUsername} games={games} loading={gamesLoading} error={gamesError} onRetry={() => setLoadRevision(value => value + 1)} onImport={() => { setActiveTab("games"); requestAnimationFrame(() => { const tray = document.querySelector<HTMLDetailsElement>(".capture-tray"); if (tray) tray.open = true; document.getElementById("match-log")?.focus() }) }} isGuest={!user || user.username === "Guest"} />
          ) : (
            <DeckLab games={games} currentGameId={selectedGame?.id} />
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
