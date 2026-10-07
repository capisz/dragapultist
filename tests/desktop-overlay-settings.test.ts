// @vitest-environment jsdom
import { act, createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DesktopCompanion, useDesktopSettings } from "@/components/desktop-companion"
import type { DesktopBridge, DesktopStatus, OverlayStatus } from "@/types/desktop"

vi.mock("@/components/auth/auth-dialog", () => ({ AuthDialog: () => null }))

let root: Root, container: HTMLDivElement
let status: DesktopStatus
let receive: (value: DesktopStatus) => void
let bridge: DesktopBridge
const overlay: OverlayStatus = { enabled: false, idleOpacity: 0.35, visibilityShortcut: "CommandOrControl+Shift+O", interactionShortcut: "CommandOrControl+Shift+I", selectedDeckKey: null, visible: false, interactive: false, hidden: false, error: null, statsError: null, shortcutErrors: [] }
function Harness() {
  const settings = useDesktopSettings()
  return createElement("button", { onClick: settings.openSettings }, "Open desktop settings")
}
function button(label: string) {
  const found = Array.from(document.querySelectorAll("button")).find(element => element.textContent === label)
  if (!found) throw Error(`Missing button: ${label}`)
  return found
}
async function mount() {
  await act(async () => { root.render(createElement(DesktopCompanion, null, createElement(Harness))) })
  await act(async () => button("Open desktop settings").click())
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  status = { version: 1, signedIn: true, accountId: "alice", enabled: true, username: "GamePlayer", notifications: true, launchAtLogin: false, queued: 0, state: "Synced", error: null, review: [], overlay: { ...overlay } }
  bridge = {
    version: 1,
    status: vi.fn(async () => status),
    configure: vi.fn(async () => status),
    configureOverlay: vi.fn(async value => ({ ...overlay, ...value })),
    refreshOverlay: vi.fn(async () => overlay),
    reportImport: vi.fn(async () => overlay),
    next: vi.fn(async () => null), submit: vi.fn(async () => ({ saved: true })),
    needsReview: vi.fn(async () => status), retry: vi.fn(async () => status), inspect: vi.fn(async () => ""),
    onStatus: callback => { receive = callback; return () => {} },
  }
  window.dragapultistDesktop = bridge
  container = document.createElement("div"); document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  delete window.dragapultistDesktop
})
describe("production desktop overlay integration", () => {
  it("keeps capture in account settings and saves invisibility only after explicit confirmation", async () => {
    await mount()
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Desktop settings")
    expect(document.getElementById("desktop-username")).not.toBeNull()
    const slider = document.getElementById("overlay-idle-opacity") as HTMLInputElement
    expect(slider.value).toBe("35")
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(slider, "0")
      slider.dispatchEvent(new Event("input", { bubbles: true }))
    })
    expect(bridge.configureOverlay).not.toHaveBeenCalled()
    await act(async () => button("Save opacity").click())
    expect(bridge.configureOverlay).toHaveBeenCalledWith({ idleOpacity: 0 })
    expect(slider.value).toBe("0")
    expect(document.body.textContent).toContain("Overlay preferences saved.")
  })
  it("routes acknowledged imports to the current account, clears sign-out routing, and tolerates an older binary", async () => {
    await mount()
    const imported = () => window.dispatchEvent(new CustomEvent("dragapultist-game-imported", { detail: { id: "saved-game", duplicate: true } }))
    await act(async () => { imported() })
    expect(bridge.reportImport).toHaveBeenLastCalledWith({ accountId: "alice", id: "saved-game", duplicate: true })
    await act(async () => receive({ ...status, accountId: "bob" }))
    await act(async () => { imported(); window.dispatchEvent(new Event("dragapultist-games-changed")) })
    expect(bridge.reportImport).toHaveBeenLastCalledWith({ accountId: "bob", id: "saved-game", duplicate: true })
    expect(bridge.refreshOverlay).toHaveBeenCalledTimes(1)
    await act(async () => receive({ ...status, accountId: null, signedIn: false, overlay: undefined }))
    await act(async () => { imported() })
    expect(bridge.reportImport).toHaveBeenCalledTimes(2)
    expect(document.getElementById("overlay-idle-opacity")).toBeNull()
    expect(document.body.textContent).toContain("Sign in inside the desktop app")
  })
})
