// @vitest-environment jsdom
import { act, createElement, StrictMode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useGameHistory } from "@/hooks/use-game-history"
import type { GamePersistence } from "@/lib/game-persistence"
import type { GameSummary } from "@/types/game"

type GamePage = Awaited<ReturnType<GamePersistence["list"]>>
const game = (id: string) => ({ id, opponent: `Opponent ${id}` }) as GameSummary
const page = (ids: string[], nextCursor: string | null = null) => ({ games: ids.map(game), nextCursor }) as unknown as GamePage
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

let root: Root
let container: HTMLDivElement
let api: ReturnType<typeof useGameHistory>
let options: Parameters<typeof useGameHistory>[0]
let list: ReturnType<typeof vi.fn<GamePersistence["list"]>>

function Harness() {
  api = useGameHistory(options)
  return createElement("section", null,
    api.error && createElement("p", { role: "alert" }, api.error),
    api.loading ? createElement("p", { role: "status" }, "Loading matches")
      : createElement("ul", null, api.games.map(value => createElement("li", { key: value.id, "data-game": value.id }, value.opponent))),
  )
}
async function render(patch: Partial<typeof options> = {}) {
  options = { ...options, ...patch }
  await act(async () => { root.render(createElement(Harness)) })
}
async function event(type: string, target: EventTarget = window) {
  await act(async () => { target.dispatchEvent(new Event(type)) })
}

beforeEach(() => {
  vi.useFakeTimers()
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" })
  list = vi.fn<GamePersistence["list"]>().mockResolvedValue(page(["1"]))
  const persistence = { list } as unknown as GamePersistence
  options = { owner: "account:a", persistence, remote: true, paused: false }
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.useRealTimers()
})

describe("background match history refresh", () => {
  it("ignores a request abandoned by React's strict effect cleanup", async () => {
    const abandoned = deferred<GamePage>(), active = deferred<GamePage>()
    list.mockImplementationOnce(() => abandoned.promise).mockImplementationOnce(() => active.promise)
    await act(async () => { root.render(createElement(StrictMode, null, createElement(Harness))) })
    expect(list.mock.calls[0][0]?.signal?.aborted).toBe(true)
    await act(async () => active.resolve(page(["current"])))
    await act(async () => abandoned.resolve(page(["outdated"])))
    expect(api.games.map(value => value.id)).toEqual(["current"])
  })

  it("keeps the rendered matches mounted through a slow minute refresh and every page", async () => {
    await render()
    const original = container.querySelector('[data-game="1"]')
    const first = deferred<GamePage>(), second = deferred<GamePage>()
    list.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise)
    await act(async () => { vi.advanceTimersByTime(60000) })
    expect(list).toHaveBeenCalledTimes(2)
    expect(api.loading).toBe(false)
    expect(container.querySelector('[data-game="1"]')).toBe(original)
    expect(container.querySelector('[role="status"]')).toBeNull()
    await act(async () => first.resolve(page(["1"], "next")))
    expect(list.mock.lastCall?.[0]?.cursor).toBe("next")
    expect(container.querySelector('[data-game="1"]')).toBe(original)
    await act(async () => second.resolve(page(["2"])))
    expect(api.games.map(value => value.id)).toEqual(["1", "2"])
    expect(container.querySelector('[data-game="1"]')).toBe(original)
  })

  it("coalesces focus, visibility and online events without another loading cycle", async () => {
    await render()
    const refresh = deferred<GamePage>()
    list.mockImplementationOnce(() => refresh.promise)
    await act(async () => {
      window.dispatchEvent(new Event("focus"))
      document.dispatchEvent(new Event("visibilitychange"))
      window.dispatchEvent(new Event("online"))
    })
    await event("focus")
    expect(list).toHaveBeenCalledTimes(2)
    expect(api.loading).toBe(false)
    await act(async () => refresh.resolve(page(["1"])))
    expect(list).toHaveBeenCalledTimes(2)
  })

  it("keeps the last successful history when a refresh fails, including during retry", async () => {
    await render()
    list.mockRejectedValueOnce(new Error("Offline"))
    await event("online")
    expect(api.games.map(value => value.id)).toEqual(["1"])
    expect(api.loading).toBe(false)
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("still available")
    const retry = deferred<GamePage>()
    list.mockImplementationOnce(() => retry.promise)
    await act(async () => api.refresh())
    expect(container.querySelector('[data-game="1"]')).not.toBeNull()
    expect(api.loading).toBe(false)
    await act(async () => retry.resolve(page(["1", "2"])))
    expect(api.error).toBeNull()
  })

  it("performs one follow-up read for a desktop import that arrives during a refresh", async () => {
    await render()
    const refresh = deferred<GamePage>()
    list.mockImplementationOnce(() => refresh.promise).mockResolvedValueOnce(page(["1", "2"]))
    await event("focus")
    await event("dragapultist-games-changed")
    await event("dragapultist-games-changed")
    expect(list).toHaveBeenCalledTimes(2)
    await act(async () => refresh.resolve(page(["1"])))
    expect(list).toHaveBeenCalledTimes(3)
    expect(api.games.map(value => value.id)).toEqual(["1", "2"])
  })

  it("defers reads during review and resumes quietly after returning", async () => {
    await render()
    await render({ paused: true })
    await event("dragapultist-games-changed")
    await act(async () => { vi.advanceTimersByTime(120000) })
    expect(list).toHaveBeenCalledTimes(1)
    const refresh = deferred<GamePage>()
    list.mockImplementationOnce(() => refresh.promise)
    await render({ paused: false })
    expect(api.loading).toBe(false)
    expect(container.querySelector('[data-game="1"]')).not.toBeNull()
    await act(async () => refresh.resolve(page(["1", "2"])))
    expect(api.games).toHaveLength(2)
  })

  it("does not let an older read overwrite an acknowledged mutation", async () => {
    await render()
    const stale = deferred<GamePage>()
    list.mockImplementationOnce(() => stale.promise)
    await event("focus")
    const signal = list.mock.lastCall?.[0]?.signal
    await act(async () => api.cancelRefresh())
    await render({ paused: true })
    await act(async () => api.setGames([game("saved")]))
    await act(async () => stale.resolve(page(["1"])))
    expect(signal?.aborted).toBe(true)
    expect(api.games.map(value => value.id)).toEqual(["saved"])
  })

  it("clears another account's history and ignores its late response", async () => {
    await render()
    const stale = deferred<GamePage>(), other = deferred<GamePage>()
    list.mockImplementationOnce(() => stale.promise).mockImplementationOnce(() => other.promise)
    await event("focus")
    await render({ owner: "account:b" })
    expect(api.games).toEqual([])
    expect(api.loading).toBe(true)
    expect(container.querySelector('[data-game="1"]')).toBeNull()
    await act(async () => stale.resolve(page(["old-account"])))
    expect(api.games).toEqual([])
    await act(async () => other.resolve(page(["other-account"])))
    expect(api.games.map(value => value.id)).toEqual(["other-account"])
  })

  it("does not show initial loading again for a successfully loaded empty history", async () => {
    list.mockResolvedValueOnce(page([]))
    await render()
    const refresh = deferred<GamePage>()
    list.mockImplementationOnce(() => refresh.promise)
    await event("focus")
    expect(api.loading).toBe(false)
    expect(container.querySelector('[role="status"]')).toBeNull()
    await act(async () => refresh.resolve(page([])))
  })

  it("does not poll hidden windows or guest history", async () => {
    await render()
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" })
    await event("visibilitychange", document)
    await act(async () => { vi.advanceTimersByTime(60000) })
    expect(list).toHaveBeenCalledTimes(1)
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" })
    await render({ owner: "guest", remote: false })
    await event("focus")
    await act(async () => { vi.advanceTimersByTime(60000) })
    expect(list).toHaveBeenCalledTimes(2)
  })
})
