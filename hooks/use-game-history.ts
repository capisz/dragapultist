"use client"

import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react"
import type { GamePersistence } from "@/lib/game-persistence"
import type { GameSummary } from "@/types/game"

type History = { owner: string; games: GameSummary[]; loaded: boolean; error: string | null }
type Options = { owner: string; persistence: GamePersistence; remote: boolean; paused: boolean }

export function useGameHistory({ owner, persistence, remote, paused }: Options) {
  const [history, setHistory] = useState<History>({ owner, games: [], loaded: false, error: null })
  const [revision, setRevision] = useState(0)
  const request = useRef<AbortController | null>(null)
  const queued = useRef(false)
  const changedDuringRequest = useRef(false)

  // Never display another account's cached history, even before effects run.
  const current = history.owner === owner ? history : { owner, games: [], loaded: false, error: null }

  const cancelRefresh = useCallback(() => {
    request.current?.abort()
    request.current = null
    queued.current = false
  }, [])

  const refresh = useCallback((event?: Event) => {
    if (paused || document.visibilityState !== "visible") return
    if (request.current || queued.current) {
      // Focus/visibility events often arrive together. Only an actual new import
      // needs another read after the current request finishes.
      if (event?.type === "dragapultist-games-changed") changedDuringRequest.current = true
      return
    }
    queued.current = true
    setRevision(value => value + 1)
  }, [paused])

  useEffect(() => {
    if (paused) return
    const controller = new AbortController()
    request.current = controller
    queued.current = false
    changedDuringRequest.current = false
    setHistory(previous => previous.owner === owner
      ? { ...previous, error: null }
      : { owner, games: [], loaded: false, error: null })

    const load = async () => {
      const games: GameSummary[] = []
      let cursor: string | undefined
      do {
        const page = await persistence.list({ cursor, limit: 100, signal: controller.signal })
        if (controller.signal.aborted) return
        games.push(...page.games as unknown as GameSummary[])
        cursor = page.nextCursor ?? undefined
      } while (cursor)
      // Replace the collection only once every page has arrived. Until then,
      // keep the existing list, metrics, filters and other views mounted.
      setHistory({ owner, games, loaded: true, error: null })
    }

    void load().catch(() => {
      if (controller.signal.aborted) return
      setHistory(previous => ({ ...previous,
        error: previous.loaded
          ? "Could not refresh your match history. Your displayed matches are still available. Please retry."
          : "Your match history is unavailable. Please retry.",
      }))
    }).finally(() => {
      if (controller.signal.aborted || request.current !== controller) return
      request.current = null
      if (changedDuringRequest.current && document.visibilityState === "visible") {
        changedDuringRequest.current = false
        queued.current = true
        setRevision(value => value + 1)
      }
    })
    return () => {
      controller.abort()
      if (request.current === controller) request.current = null
      queued.current = false
    }
  }, [owner, persistence, revision, paused])

  useEffect(() => {
    if (!remote) return
    document.addEventListener("visibilitychange", refresh)
    window.addEventListener("focus", refresh)
    window.addEventListener("online", refresh)
    window.addEventListener("dragapultist-games-changed", refresh)
    const timer = window.setInterval(refresh, 60000)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", refresh)
      window.removeEventListener("focus", refresh)
      window.removeEventListener("online", refresh)
      window.removeEventListener("dragapultist-games-changed", refresh)
    }
  }, [remote, refresh])

  const setGames = useCallback((value: SetStateAction<GameSummary[]>) => {
    setHistory(previous => {
      const games = previous.owner === owner ? previous.games : []
      return { owner, games: typeof value === "function" ? value(games) : value, loaded: true, error: null }
    })
  }, [owner])

  const setError = useCallback((error: string | null) => {
    setHistory(previous => previous.owner === owner ? { ...previous, error } : previous)
  }, [owner])

  return { games: current.games, loading: !current.loaded && !current.error, error: current.error,
    setGames, setError, revision, refresh, cancelRefresh }
}
