"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { prepareDesktopImport } from "@/lib/desktop-import"
import type { DesktopSettings, DesktopStatus } from "@/types/desktop"
import { AuthDialog } from "./auth/auth-dialog"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { Input } from "./ui/input"

const DesktopContext = createContext({
  available: false,
  needsAttention: false,
  openSettings: () => {},
  setAuthDialogOpen: (_open: boolean) => {},
})

export const useDesktopSettings = () => useContext(DesktopContext)
const setupKey = (accountId: string) => `dragapultist-desktop-setup-seen:${accountId}`

async function boundedRequest<T>(request: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("The desktop app is taking too long to respond. Reopen settings to check its status before trying again.")), 20000)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

export function DesktopCompanion({ children }: { children: ReactNode }) {
  const [available, setAvailable] = useState(false)
  const [status, setStatus] = useState<DesktopStatus | null>(null)
  const [open, setOpen] = useState(false)
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [signInOpen, setSignInOpen] = useState(false)
  const [username, setUsername] = useState("")
  const [error, setError] = useState("")
  const [syncError, setSyncError] = useState("")
  const [notice, setNotice] = useState("")
  const [saving, setSaving] = useState(false)
  const [reviewLog, setReviewLog] = useState("")
  const usernameInput = useRef<HTMLInputElement>(null)
  const seenAccounts = useRef(new Set<string>())
  const currentAccount = useRef<string | null>(null)
  currentAccount.current = status?.accountId ?? null

  const refresh = useCallback(async () => {
    const api = window.dragapultistDesktop
    if (!api || api.version !== 1) return
    try {
      setStatus(await boundedRequest(api.status()))
      setSyncError("")
    } catch {
      setSyncError("Could not read desktop status. Quit and reopen Dragapultist, then try again.")
    }
  }, [])

  useEffect(() => {
    const api = window.dragapultistDesktop
    if (!api || api.version !== 1) return
    setAvailable(true)
    let busy = false, disposed = false
    const unsubscribe = api.onStatus(value => { if (!disposed) setStatus(value) })
    const drain = async () => {
      if (busy || disposed) return
      busy = true
      try {
        const item = await api.next()
        if (!item) return
        let game
        try {
          game = prepareDesktopImport(item)
        } catch (cause) {
          await api.needsReview(item.id, cause instanceof Error ? cause.message : "This log needs review.")
          return
        }
        const result = await api.submit(item.id, game)
        if (result.saved) {
          if (!disposed) setSyncError("")
          window.dispatchEvent(new Event("dragapultist-games-changed"))
        }
      } catch {
        if (!disposed) setSyncError("Desktop sync is unavailable. Queued logs are retained.")
      } finally {
        busy = false
      }
    }
    void refresh()
    const timer = setInterval(() => void drain(), 2000)
    window.addEventListener("dragapultist-auth-changed", refresh)
    window.addEventListener("online", refresh)
    return () => {
      disposed = true
      clearInterval(timer)
      unsubscribe()
      window.removeEventListener("dragapultist-auth-changed", refresh)
      window.removeEventListener("online", refresh)
    }
  }, [refresh])

  useEffect(() => {
    setUsername(status?.signedIn ? status.username : "")
    setReviewLog("")
  }, [status?.accountId, status?.signedIn, status?.username])

  useEffect(() => {
    setError("")
    setNotice("")
  }, [status?.accountId])

  useEffect(() => {
    if (!status?.signedIn || !status.accountId || status.state === "Starting" || authDialogOpen || signInOpen || open) return
    const key = setupKey(status.accountId)
    if (seenAccounts.current.has(key)) return
    try { if (window.localStorage.getItem(key)) return } catch { /* The in-memory dismissal still works. */ }
    seenAccounts.current.add(key)
    // Existing capture preferences already establish that setup was completed.
    if (status.username || status.enabled) return
    setOpen(true)
  }, [status, authDialogOpen, signInOpen, open])

  const closeSettings = useCallback(() => {
    if (currentAccount.current) {
      const key = setupKey(currentAccount.current)
      seenAccounts.current.add(key)
      try { window.localStorage.setItem(key, "true") } catch { /* Preserve access when browser storage is unavailable. */ }
    }
    setOpen(false)
    setReviewLog("")
  }, [])

  const openSettings = useCallback(() => {
    setError("")
    setNotice("")
    setOpen(true)
    void refresh()
  }, [refresh])

  const configure = async (value: DesktopSettings) => {
    const api = window.dragapultistDesktop
    if (!api || saving) return
    if (value.enabled && !username.trim()) {
      setError("Enter your Pokémon TCG Live username first.")
      usernameInput.current?.focus()
      return
    }
    const account = currentAccount.current
    setSaving(true)
    setError("")
    setNotice("")
    try {
      const updated = await boundedRequest(api.configure(value))
      if (currentAccount.current !== account) return
      setStatus(updated)
      setNotice(value.enabled === true ? "Capture is on. Copy a completed game log in Pokémon TCG Live to import it." : value.enabled === false ? "Capture paused." : "Preferences saved.")
    } catch (cause) {
      if (currentAccount.current === account) setError(cause instanceof Error ? cause.message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, "") : "Could not save capture settings. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const starting = !status || status.state === "Starting"
  const unavailable = starting || !!status?.error
  const needsAttention = !!(status?.error || syncError || status?.review.length)
  const context = useMemo(() => ({ available, needsAttention, openSettings, setAuthDialogOpen }), [available, needsAttention, openSettings])

  return <DesktopContext.Provider value={context}>
    {children}
    {available && <>
      <Dialog open={open} onOpenChange={next => { if (next) openSettings(); else closeSettings() }}>
        <DialogContent className="desktop-settings-dialog" onCloseAutoFocus={event => {
          event.preventDefault()
          document.getElementById("account-menu-trigger")?.focus()
        }}>
          <DialogHeader>
            <DialogTitle>Desktop settings</DialogTitle>
            <DialogDescription>Automatically import completed games when you copy their logs in Pokémon TCG Live.</DialogDescription>
          </DialogHeader>

          <div className="desktop-capture-state" role="status">
            <strong>{starting ? "Preparing capture…" : status?.enabled ? "Capture on" : "Capture paused"}</strong>
            <span>{status?.queued ? `${status.queued} queued` : "No queued logs"}</span>
          </div>

          {starting && <p className="desktop-hint">Waiting for secure storage and account status. This should only take a moment.</p>}
          {!starting && !status?.signedIn && <div className="desktop-sign-in">
            <p>Sign in inside the desktop app to enable capture. Your browser sign-in is separate.</p>
            <Button className="desktop-primary" onClick={() => { closeSettings(); setSignInOpen(true) }}>Sign in to enable capture</Button>
          </div>}

          {status?.signedIn && <form noValidate aria-busy={saving} onSubmit={event => { event.preventDefault(); void configure({ username: username.trim(), enabled: true }) }}>
            <div className="desktop-field">
              <label htmlFor="desktop-username">Pokémon TCG Live username</label>
              <Input ref={usernameInput} id="desktop-username" className="focus-visible:ring-0" autoComplete="off" value={username} maxLength={80} onChange={event => { setUsername(event.target.value); setError(""); setNotice("") }} disabled={saving || unavailable} aria-describedby="desktop-username-help" />
              <p id="desktop-username-help" className="desktop-hint">Use the exact name shown in your game logs so we can identify your side.</p>
            </div>
            <div className="desktop-actions">
              <Button type="submit" className="desktop-primary" disabled={saving || unavailable}>{saving ? "Saving…" : status.enabled ? "Save username" : "Save username & enable capture"}</Button>
              {status.enabled && <Button type="button" variant="outline" disabled={saving} onClick={() => void configure({ enabled: false })}>Pause capture</Button>}
            </div>
          </form>}

          {(status?.error || error || syncError) && <p className="desktop-error" role="alert">{status?.error || error || syncError}</p>}
          {notice && <p className="desktop-notice" role="status">{notice}</p>}

          <details className="desktop-preferences">
            <summary>Preferences</summary>
            <fieldset disabled={saving || unavailable}>
              <label><input type="checkbox" checked={status?.notifications ?? true} onChange={event => void configure({ notifications: event.target.checked })} /> Import notifications</label>
              <label><input type="checkbox" checked={status?.launchAtLogin ?? false} onChange={event => void configure({ launchAtLogin: event.target.checked })} /> Open Dragapultist when I sign in to this computer</label>
            </fieldset>
            <p className="desktop-hint">Copied game logs are stored securely on this computer. Other clipboard text is ignored. Closing the window keeps capture running; Quit stops it.</p>
          </details>

          {!!status?.review.length && <section className="desktop-review" aria-label="Logs needing review">
            <h3>Logs needing review</h3>
            {status.review.map(item => <div key={item.id}>
              <p>{new Date(item.capturedAt).toLocaleString()} — {item.reason}</p>
              <div className="desktop-actions">
                <Button variant="outline" onClick={() => { void window.dragapultistDesktop!.inspect(item.id).then(setReviewLog).catch(() => setError("Could not open queued log.")) }}>View log</Button>
                <Button variant="outline" disabled={saving || !username.trim()} onClick={() => { void window.dragapultistDesktop!.retry(item.id, username.trim()).then(setStatus).catch(() => setError("Check your username and sign-in before retrying.")) }}>Retry with this username</Button>
              </div>
            </div>)}
            {reviewLog && <textarea aria-label="Queued game log" value={reviewLog} readOnly rows={8} />}
          </section>}

          <div className="desktop-settings-footer">
            <p className="desktop-hint">Find these settings anytime in your account menu.</p>
            <Button type="button" variant="outline" onClick={closeSettings}>{status?.enabled ? "Done" : "Not now"}</Button>
          </div>
        </DialogContent>
      </Dialog>
      <AuthDialog open={signInOpen} onOpenChange={setSignInOpen} onSuccess={() => { setSignInOpen(false); void refresh() }} />
    </>}
  </DesktopContext.Provider>
}
