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
                  "max-w-xl rounded-2xl p-6",
                  "border border-slate-200/70 bg-white/90 backdrop-blur-xl shadow-2xl",
                  // lightened dark mode background (was #223a54/70)
                  "dark:border-slate-700/55 dark:bg-[#2c4a6a]/80",
                )}
              >
                <DialogHeader className="mb-3 space-y-2">
                  <DialogTitle className="text-xl font-semibold tracking-tight text-[#3b608c] dark:text-sky-100">
                    How Dragapultist works
                  </DialogTitle>
                  <DialogDescription className="text-sm text-slate-600 dark:text-slate-200/80">
                    Quick guide for importing logs and using Prize Mapper.
                  </DialogDescription>
                </DialogHeader>

                <ol className="space-y-3 text-sm leading-relaxed">
                  <li className="text-slate-700 dark:text-slate-100">
                    1) In Pokémon TCG Live, open a game log and copy the full text.
                  </li>
                  <li className="text-slate-700 dark:text-slate-100">
                    2) Paste into <span className="font-semibold">Game log</span> and click{" "}
                    <span className="font-semibold">Import</span>.
                  </li>
                  <li className="text-slate-700 dark:text-slate-100">
                    3) Dragapultist parses the log into structured stats and saves it.
                  </li>
                  <li className="text-slate-700 dark:text-slate-100">
                    4) Use <span className="font-semibold">Prize Mapper</span> to analyze matchups and prize paths.
                  </li>
                  <li className="text-slate-700 dark:text-slate-100">
                    5) Use <span className="font-semibold">Player Database</span> to explore decks and matchup breakdowns.
                  </li>
                </ol>

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
