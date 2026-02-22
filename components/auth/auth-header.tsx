"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Montserrat } from "next/font/google"
import { HelpCircle, UserRound } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import { getUser, logout, loginAsGuest } from "@/app/actions"
import { LoginForm } from "@/components/auth/login-form"
import { SignUpForm } from "@/components/auth/signup-form"

const montserrat = Montserrat({ subsets: ["latin"] })

type HeaderUser =
  | { id: string; email?: string | null; username?: string | null; name?: string | null }
  | null

// Brand button colors:
// Light mode: darker blue
// Dark mode: lighter blue
const BRAND_BTN =
  "bg-[#5e82ab] text-slate-50 hover:bg-[#4f739d] active:bg-[#44678f] " +
  "dark:bg-[#b1cce8] dark:text-[#0b1220] dark:hover:bg-[#a1c2e4] dark:active:bg-[#93b7df] " +
  "border-none shadow-md hover:shadow-lg transition-all"

export function AuthHeader() {
  const router = useRouter()

  const { resolvedTheme, theme, setTheme } = useTheme()
  const isDarkMode = (resolvedTheme ?? theme) === "dark"
  const toggleDarkMode = () => setTheme(isDarkMode ? "light" : "dark")

  const [user, setUser] = useState<HeaderUser>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [authTab, setAuthTab] = useState<"login" | "signup">("login")

  useEffect(() => {
    getUser()
      .then((u: any) => setUser(u ?? null))
      .catch(() => setUser(null))
  }, [])

  const isGuest = useMemo(() => {
    const u = user as any
    return !u || u?.username === "Guest" || u?.id === "guest"
  }, [user])

  const displayName = useMemo(() => {
    const u = user as any
    return u?.username || u?.name || u?.email || "Account"
  }, [user])

  async function handleSignOut() {
    try {
      await logout()
    } finally {
      setUser(null)
      router.refresh()
      router.push("/")
    }
  }

  async function handleGuest() {
    const u = await loginAsGuest()
    setUser(u as any)
    setAuthOpen(false)
    router.refresh()
  }

  async function refreshUserAndClose() {
    const u = await getUser()
    setUser(u as any)
    setAuthOpen(false)
    router.refresh()
  }

  return (
    <div className={cn("text-foreground transition-colors h-8 bg-transparent", montserrat.className)}>
      <header className="container mx-auto px-0">
        <div className="flex items-center justify-between gap-3 py-1">
          {/* Left */}
          <div className="flex items-center gap-2">
            <img
              src="/dreepy-nobg.png"
              alt="Dragapultist character"
              className="h-8 w-10 md:h-16 md:w-14 object-contain drop-shadow-[0_0_22px_rgba(42,81,128,0.9)] dark:drop-shadow-[0_0_16px_rgba(186,230,253,0.25)] opacity-80"
            />
            <div className="flex flex-col">
              <h1 className="text-lg md:text-2xl font-semibold tracking-tight text-[#3b608c] dark:text-sky-200/90">
                Dragapultist
              </h1>
              <p className="text-[11px] md:text-xs text-gray-700 dark:text-gray-300/90">
                Pokémon TCGL database
              </p>
            </div>
          </div>

          {/* Right: Help -> Auth -> Theme */}
          <div className="flex items-center gap-2">
            {/* Help button (LEFT of Sign in) */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="
                    group flex items-center justify-center
                    h-12 w-12 rounded-full
                    bg-transparent border-none shadow-none
                    text-slate-600 hover:bg-transparent hover:text-sky-600
                    dark:text-sky-200/80 dark:hover:text-sky-200
                    focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0
                    transition-all duration-200 hover:scale-110 hover:-translate-y-0.5 active:scale-95
                  "
                >
                  <HelpCircle size={40} className="transition-transform duration-200" />
                </Button>
              </DialogTrigger>

              <DialogContent
                className={cn(
                  "max-h-[85dvh] max-w-2xl overflow-y-auto rounded-2xl p-6",
                  "border border-slate-200/70 bg-white/90 backdrop-blur-xl shadow-2xl",
                  "dark:border-slate-700/55 dark:bg-[#2c4a6a]/80",
                )}
              >
                <DialogHeader className="mb-4 space-y-2">
                  <DialogTitle className="text-xl font-semibold tracking-tight text-[#3b608c] dark:text-sky-100">
                    How Dragapultist works
                  </DialogTitle>
                  <DialogDescription className="text-sm text-slate-600 dark:text-slate-200/80">
                    Dragapultist helps you import your games, review what happened turn-by-turn, and track your results
                    over time.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200/75 bg-[#dce9f7]/55 px-4 py-3 dark:border-slate-600/50 dark:bg-[#355a7c]/45">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#3b608c] dark:text-sky-100">
                        Input
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">
                        Import logs manually or by clipboard
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300/85">
                        Desktop users can auto-detect copied logs. Browser users can paste logs in the Game Log tab and
                        import directly.
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200/75 bg-[#dce9f7]/55 px-4 py-3 dark:border-slate-600/50 dark:bg-[#355a7c]/45">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#3b608c] dark:text-sky-100">
                        Output
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">
                        Structured game and matchup analytics
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300/85">
                        Each import is parsed into turns, attackers, prize trades, archetypes, and searchable game history.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-4 dark:border-slate-600/55 dark:bg-[#24425f]/45">
                    <h3 className="text-sm font-semibold text-[#3b608c] dark:text-sky-100">Workflow</h3>
                    <ol className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-100">
                      <li className="flex gap-2">
                        <span className="mt-[1px] inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5e82ab] text-[11px] font-semibold text-white dark:bg-sky-100 dark:text-[#102134]">
                          1
                        </span>
                        <span>Copy a full PTCGL game log from coin flip through game end.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="mt-[1px] inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5e82ab] text-[11px] font-semibold text-white dark:bg-sky-100 dark:text-[#102134]">
                          2
                        </span>
                        <span>Import in the Game Log tab and confirm player orientation/archetypes if prompted.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="mt-[1px] inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5e82ab] text-[11px] font-semibold text-white dark:bg-sky-100 dark:text-[#102134]">
                          3
                        </span>
                        <span>Review full detail pages including turn actions, teams, prize map, and deck metadata.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="mt-[1px] inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5e82ab] text-[11px] font-semibold text-white dark:bg-sky-100 dark:text-[#102134]">
                          4
                        </span>
                        <span>Use Account Statistics for overview metrics, deck matchups, individual data, and history.</span>
                      </li>
                    </ol>
                  </div>

                  <div className="rounded-xl border border-dashed border-[#5e82ab]/35 bg-[#dce9f7]/35 px-4 py-3 dark:border-sky-100/25 dark:bg-[#355a7c]/35">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#3b608c] dark:text-sky-100">
                      Import quality tip
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300/90">
                      Truncated logs may not process correctly, and certain archetypes may need to be manually adjusted
                      during import.
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-200/60 dark:border-slate-700/50 pt-3">
                  <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-200/70">
                    Dragapultist is an unofficial fan-made tool and is not affiliated with or endorsed by The Pokémon
                    Company, Creatures Inc., GAME FREAK Inc., or Pokémon TCG Live.
                  </p>
                </div>
              </DialogContent>
            </Dialog>

            {/* Auth control */}
            {isGuest ? (
              <Dialog open={authOpen} onOpenChange={setAuthOpen}>
                <DialogTrigger asChild>
                  <Button type="button" className={cn("h-9 rounded-full px-3", BRAND_BTN)}>
                    <UserRound className="mr-2 h-4 w-4 opacity-90" />
                    Sign in
                  </Button>
                </DialogTrigger>

                <DialogContent
                  className={cn(
                    "max-w-md rounded-2xl p-6",
                    "border border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-2xl",
                    // lightened dark mode background (was #223a54/65)
                    "dark:border-slate-700/55 dark:bg-[#2c4a6a]/75",
                  )}
                >
                  <DialogHeader className="mb-4 space-y-2">
                    <DialogTitle className="text-xl font-semibold tracking-tight text-[#3b608c] dark:text-sky-100">
                      {authTab === "login" ? "Sign in" : "Create account"}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-600 dark:text-slate-200/80">
                      Save games to the database and unlock your account stats.
                    </DialogDescription>
                  </DialogHeader>

                  {/* Segmented tabs */}
                  <div className="mb-3 rounded-full p-1 border border-slate-200/70 bg-white/50 dark:border-slate-700/55 dark:bg-slate-900/20">
                    <div className="grid grid-cols-2 gap-1">
                      <Button
                        type="button"
                        onClick={() => setAuthTab("login")}
                        className={cn(
                          "h-10 rounded-full shadow-none",
                          authTab === "login"
                            ? BRAND_BTN
                            : "bg-transparent text-slate-700 hover:bg-white/60 dark:text-slate-100 dark:hover:bg-slate-50/10",
                        )}
                      >
                        Log in
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setAuthTab("signup")}
                        className={cn(
                          "h-10 rounded-full shadow-none",
                          authTab === "signup"
                            ? BRAND_BTN
                            : "bg-transparent text-slate-700 hover:bg-white/60 dark:text-slate-100 dark:hover:bg-slate-50/10",
                        )}
                      >
                        Create account
                      </Button>
                    </div>
                  </div>

                  {/* One Guest button (ONLY here) */}
                  <Button
                    type="button"
                    onClick={handleGuest}
                    className={cn("w-full h-11 rounded-full mb-4", BRAND_BTN)}
                  >
                    Continue as Guest
                  </Button>

                  {/* Forms */}
                  {authTab === "login" ? (
                    <LoginForm onSuccess={refreshUserAndClose} />
                  ) : (
                    <SignUpForm onSuccess={refreshUserAndClose} />
                  )}
                </DialogContent>
              </Dialog>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" className={cn("h-9 rounded-full px-3 max-w-[220px]", BRAND_BTN)}>
                    <UserRound className="mr-2 h-4 w-4 opacity-90" />
                    <span className="truncate">{displayName}</span>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className={cn(
                    "w-44 rounded-xl",
                    "bg-white/90 backdrop-blur-md border border-slate-200",
                    "dark:bg-slate-900/80 dark:border-slate-700",
                  )}
                >
                  <DropdownMenuItem onClick={() => router.push("/account")}>Account</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600 dark:text-red-400">
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="relative w-9 h-9 rounded-none transition-transform duration-200 hover:scale-105 hover:bg-transparent border-none shadow-none"
            >
              <img
                src={!isDarkMode ? "/Solrock.png" : "/Lunatone.png"}
                alt={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                className="w-full h-full object-contain bg-transparent hover:opacity-70 opacity-60 mascot-bob"
              />
            </Button>
          </div>
        </div>
      </header>
    </div>
  )
}
