"use client"

import { apiErrorSchema, type ApiErrorCode, type PersistenceState } from "@/lib/api-contract"
import {
  gameDetailSchema,
  gameDetailResponseSchema,
  gameListResponseSchema,
  gameMutationResponseSchema,
  type GameDraftContract,
  type GameMutationContract,
  type GameSummaryContract,
  type GameDetailContract,
} from "@/lib/game-contract"
import { analyzeGameLog } from "@/utils/game-analyzer"

export type GamePage = { games: GameSummaryContract[]; nextCursor: string | null }
export type SavedGame = { game: GameDetailContract; revision: number; saveState: "saved"; duplicate?: boolean }

export class PersistenceError extends Error {
  constructor(
    message: string,
    readonly code: ApiErrorCode,
    readonly retryable: boolean,
    readonly status: PersistenceState,
  ) {
    super(message)
  }
}

export interface GamePersistence {
  list(options?: { cursor?: string; limit?: number; query?: string; signal?: AbortSignal }): Promise<GamePage>
  get(id: string, signal?: AbortSignal): Promise<GameDetailContract>
  create(game: GameDraftContract, idempotencyKey: string, signal?: AbortSignal): Promise<SavedGame>
  update(id: string, changes: GameMutationContract, expectedRevision: number, signal?: AbortSignal): Promise<SavedGame>
  remove(id: string, expectedRevision?: number, signal?: AbortSignal): Promise<void>
}

function stateFor(code: ApiErrorCode): PersistenceState {
  if (code === "VALIDATION_ERROR") return "validation_error"
  if (code === "UNAUTHORIZED") return "unauthorized"
  if (code === "SESSION_EXPIRED") return "expired"
  if (code === "REVISION_CONFLICT") return "conflict"
  if (code === "UNAVAILABLE" || code === "RATE_LIMITED") return "unavailable"
  return "retryable_failure"
}

async function csrfToken(signal?: AbortSignal) {
  const response = await fetch("/api/auth/session", { cache: "no-store", signal })
  const payload = await response.json().catch(() => null)
  if (!response.ok || typeof payload?.csrfToken !== "string") {
    throw new PersistenceError("Could not start a secure request.", "UNAVAILABLE", true, "unavailable")
  }
  return payload.csrfToken as string
}

async function checkedJson(response: Response) {
  const payload = await response.json().catch(() => null)
  if (response.ok) return payload
  const parsed = apiErrorSchema.safeParse(payload)
  if (parsed.success) {
    throw new PersistenceError(parsed.data.error.message, parsed.data.error.code, parsed.data.error.retryable, stateFor(parsed.data.error.code))
  }
  throw new PersistenceError("The request could not be completed.", "INTERNAL_ERROR", response.status >= 500, response.status >= 500 ? "retryable_failure" : "validation_error")
}

async function mutation(path: string, method: "POST" | "PATCH" | "DELETE", body: unknown, signal?: AbortSignal) {
  const token = await csrfToken(signal)
  return fetch(path, {
    method,
    signal,
    headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
    body: JSON.stringify(body),
  })
}

export const remoteGamePersistence: GamePersistence = {
  async list(options = {}) {
    const query = new URLSearchParams()
    if (options.cursor) query.set("cursor", options.cursor)
    if (options.limit) query.set("limit", String(options.limit))
    if (options.query) query.set("q", options.query)
    const response = await fetch(`/api/games?${query}`, { cache: "no-store", signal: options.signal })
    return gameListResponseSchema.parse(await checkedJson(response))
  },
  async get(id, signal) {
    const response = await fetch(`/api/games/${encodeURIComponent(id)}`, { cache: "no-store", signal })
    return gameDetailResponseSchema.parse(await checkedJson(response)).game
  },
  async create(game, idempotencyKey, signal) {
    return gameMutationResponseSchema.parse(await checkedJson(await mutation("/api/games", "POST", { game, idempotencyKey }, signal)))
  },
  async update(id, changes, expectedRevision, signal) {
    return gameMutationResponseSchema.parse(await checkedJson(await mutation(`/api/games/${encodeURIComponent(id)}`, "PATCH", { changes, expectedRevision }, signal)))
  },
  async remove(id, expectedRevision, signal) {
    await checkedJson(await mutation(`/api/games/${encodeURIComponent(id)}`, "DELETE", { expectedRevision }, signal))
  },
}

const GUEST_KEY = "guestGames"

function guestGames(): GameDetailContract[] {
  const parsed = JSON.parse(localStorage.getItem(GUEST_KEY) ?? "[]") as unknown
  if (!Array.isArray(parsed)) return []
  return parsed.flatMap(value => {
    const result = gameDetailSchema.safeParse({
      ...(value && typeof value === "object" ? value : {}),
      rawLog: typeof (value as { rawLog?: unknown })?.rawLog === "string" && (value as { rawLog: string }).rawLog.length >= 10
        ? (value as { rawLog: string }).rawLog
        : "Legacy local game log unavailable.",
      revision: (value as { revision?: unknown })?.revision ?? 1,
      schemaVersion: (value as { schemaVersion?: unknown })?.schemaVersion ?? 2,
      parserVersion: (value as { parserVersion?: unknown })?.parserVersion ?? 1,
      notes: (value as { notes?: unknown })?.notes ?? {},
      deckList: (value as { deckList?: unknown })?.deckList ?? "",
      deckName: (value as { deckName?: unknown })?.deckName ?? "",
    })
    return result.success ? [result.data] : []
  })
}

function saveGuestGames(games: GameDetailContract[]) {
  localStorage.setItem(GUEST_KEY, JSON.stringify(games))
}

export const guestGamePersistence: GamePersistence = {
  async list(options = {}) {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 100)
    const start = options.cursor ? Math.max(Number.parseInt(options.cursor, 10) || 0, 0) : 0
    const normalizedQuery = options.query?.trim().toLocaleLowerCase()
    const all = guestGames().filter(game => !normalizedQuery || [
      game.username,
      game.opponent,
      game.userMainAttacker,
      game.opponentMainAttacker,
      ...(game.tags?.map(tag => tag.text) ?? []),
      ...Object.values(game.notes),
    ].some(value => value.toLocaleLowerCase().includes(normalizedQuery)))
    const page = all.slice(start, start + limit)
    return {
      games: page.map(({ rawLog: _rawLog, notes, deckList: _deckList, deckName: _deckName, contentHash: _contentHash, ...summary }) => ({
        ...summary,
        noteCount: Object.values(notes).filter(note => note.trim()).length,
        hasDeck: Boolean(_deckList.trim()),
      })),
      nextCursor: start + limit < all.length ? String(start + limit) : null,
    }
  },
  async get(id) {
    const game = guestGames().find(value => value.id === id)
    if (!game) throw new PersistenceError("Game not found.", "NOT_FOUND", false, "validation_error")
    return game
  },
  async create(game) {
    const games = guestGames()
    const duplicate = games.find(value => value.id === game.id || value.rawLog.replace(/\r\n/g, "\n").trim() === game.rawLog.replace(/\r\n/g, "\n").trim())
    if (duplicate) return { game: duplicate, revision: duplicate.revision, saveState: "saved", duplicate: true }
    const saved = gameDetailSchema.parse({ ...game, revision: 1, schemaVersion: 2, parserVersion: 1 })
    saveGuestGames([...games, saved])
    return { game: saved, revision: saved.revision, saveState: "saved", duplicate: false }
  },
  async update(id, changes, expectedRevision) {
    const games = guestGames()
    const index = games.findIndex(value => value.id === id)
    if (index < 0) throw new PersistenceError("Game not found.", "NOT_FOUND", false, "validation_error")
    if (games[index].revision !== expectedRevision) {
      throw new PersistenceError("This game changed. Reload before saving again.", "REVISION_CONFLICT", false, "conflict")
    }
    const { perspective, ...editableChanges } = changes
    const recalculated: Partial<ReturnType<typeof analyzeGameLog>> = perspective
      ? analyzeGameLog(
          games[index].rawLog,
          false,
          undefined,
          undefined,
          perspective.userArchetype,
          perspective.opponentArchetype,
          perspective.username,
        )
      : {}
    const saved = gameDetailSchema.parse({
      ...games[index],
      ...recalculated,
      ...editableChanges,
      id: games[index].id,
      date: games[index].date,
      username: recalculated.username?.trim() || perspective?.username || games[index].username,
      opponent: recalculated.opponent?.trim() || games[index].opponent,
      userMainAttacker: recalculated.userMainAttacker?.trim() || games[index].userMainAttacker,
      opponentMainAttacker: recalculated.opponentMainAttacker?.trim() || games[index].opponentMainAttacker,
      rawLog: games[index].rawLog,
      tags: editableChanges.tags ?? games[index].tags,
      notes: editableChanges.notes ?? games[index].notes,
      deckList: editableChanges.deckList ?? games[index].deckList,
      deckName: editableChanges.deckName ?? games[index].deckName,
      favorite: editableChanges.favorite ?? games[index].favorite,
      revision: expectedRevision + 1,
      schemaVersion: games[index].schemaVersion,
      parserVersion: games[index].parserVersion,
      updatedAt: new Date().toISOString(),
    })
    games[index] = saved
    saveGuestGames(games)
    return { game: saved, revision: saved.revision, saveState: "saved" }
  },
  async remove(id, expectedRevision) {
    const games = guestGames()
    const current = games.find(value => value.id === id)
    if (current && expectedRevision !== undefined && current.revision !== expectedRevision) {
      throw new PersistenceError("This game changed. Reload before deleting it.", "REVISION_CONFLICT", false, "conflict")
    }
    saveGuestGames(games.filter(value => value.id !== id))
  },
}
