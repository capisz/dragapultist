"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Montserrat } from "next/font/google"
import { HelpCircle } from "lucide-react"

const montserrat = Montserrat({ subsets: ["latin"] })

export function AuthHeader() {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const isDarkMode = localStorage.getItem("darkMode") === "true"
    setDarkMode(isDarkMode)
    if (isDarkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [])

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev
      if (next) {
        document.documentElement.classList.add("dark")
        localStorage.setItem("darkMode", "true")
      } else {
        document.documentElement.classList.remove("dark")
        localStorage.setItem("darkMode", "false")
      }
      return next
    })
  }

  return (
    <div className={`text-foreground transition-colors h-8 bg-transparent ${montserrat.className}`}>
      <header className="container mx-auto px-0">
        <div className="flex items-center justify-between gap-3 py-1">
          {/* Left: mascot + title + tagline */}
          <div className="flex items-center gap-2">
            <img
              src="/dreepy-nobg.png"
              alt="Dragapultist character"
              className="h-8 w-10 md:h-16 md:w-14 object-contain drop-shadow-[0_0_22px_rgba(42,81,128,0.9)] dark:drop-shadow-[0_0_16px_rgba(186,230,253,0.5)] opacity-80"
            />
            <div className="flex flex-col">
              <h1 className="text-lg md:text-2xl font-semibold tracking-tight text-[#3b608c] dark:text-sky-200/90">
                Dragapultist
              </h1>
              <p className=" text-[11px] md:text-xs text-gray-700 dark:text-gray-300/90">
                Pokémon TCGL database
              </p>
            </div>
          </div>

          {/* Right: help dialog + theme toggle */}
          <div className="flex items-center gap-2">
            {/* ? help button */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  // NOTE: no size="icon" here
                  className="
                    group flex items-center justify-center
                    h-12 w-12
                    rounded-full
                    bg-transparent
                    border-none shadow-none
                    text-slate-600
                    hover:bg-transparent
                    hover:text-sky-600
                    dark:text-sky-200/80
                    dark:hover:text-sky-200
                    focus:outline-none
                    focus-visible:outline-none
                    focus-visible:ring-0
                    focus-visible:ring-offset-0
                    transition-all duration-200
                    hover:scale-110 hover:-translate-y-0.5
                    active:scale-95
                  "
                >
                  {/* Force the icon size via the `size` prop */}
                  <HelpCircle
                    size={40}
                    className="
                      transition-transform duration-200
                      group-hover:scale-120
                      border-transparent
                      hover: border-transparent
                      dark:hover: border-transparent
                      onclick: border-transparent
                      
                    "
                  />
                </Button>
              </DialogTrigger>

            <DialogContent
  className="
    max-w-xl rounded-2xl
    border border-sky-200/70 bg-gradient-to-b from-white/85 via-white/75 to-sky-50/60
    p-6 shadow-2xl backdrop-blur-xl
    dark:border-sky-300/15 dark:from-slate-400/40 dark:via-slate-500/70 dark:to-slate-500/60
  "
>
  <DialogHeader className="mb-3 space-y-2">
    <DialogTitle className="text-xl font-semibold tracking-tight text-[#3b608c] dark:text-sky-100">
      How Dragapultist works
    </DialogTitle>

    <DialogDescription className="text-xs uppercase tracking-wide">
      <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800 dark:bg-sky-900/60 dark:text-sky-100">
        Quick guide
      </span>
    </DialogDescription>
  </DialogHeader>

  <div className="space-y-3 text-sm leading-relaxed">
    <ol className="space-y-3">
      <li className="flex gap-2">
        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-[11px] font-semibold text-sky-800 dark:bg-sky-900/70 dark:text-sky-100">
          1
        </span>
        <p className="text-slate-700 dark:text-slate-100">
          In <span className="font-semibold">Pokémon TCG Live</span>, open a game log and copy the full text export.
        </p>
      </li>

      <li className="flex gap-2">
        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-[11px] font-semibold text-sky-800 dark:bg-sky-900/70 dark:text-sky-100">
          2
        </span>
        <p className="text-slate-700 dark:text-slate-100">
          Paste it into <span className="font-semibold">Game log</span> and click{" "}
          <span className="font-semibold text-sky-700 dark:text-sky-200">Import</span>.
          If the desktop helper is running, logs can be detected automatically.
        </p>
      </li>

      <li className="flex gap-2">
        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-[11px] font-semibold text-sky-800 dark:bg-sky-900/70 dark:text-sky-100">
          3
        </span>
        <p className="text-slate-700 dark:text-slate-100">
          Dragapultist parses the log into structured stats (attackers, prizes, turns, damage, win/loss) and stores it.
        </p>
      </li>

      <li className="flex gap-2">
        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-[11px] font-semibold text-sky-800 dark:bg-sky-900/70 dark:text-sky-100">
          4
        </span>
        <p className="text-slate-700 dark:text-slate-100">
          Use <span className="font-semibold">Prize mapper</span> to select a deck archetype and see matchup performance.
        </p>
      </li>

      <li className="flex gap-2">
        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-[11px] font-semibold text-sky-800 dark:bg-sky-900/70 dark:text-sky-100">
          5
        </span>
        <p className="text-slate-700 dark:text-slate-100">
          Use <span className="font-semibold">Player database</span> to search a username, view their most-played decks,
          and expand a deck to see matchup breakdowns.
        </p>
      </li>
    </ol>

    <div className="mt-4 border-t border-sky-200/60 dark:border-slate-700/50 pt-3">
      <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
        Dragapultist is an unofficial fan-made tool and is not affiliated with or endorsed by The Pokémon Company,
        Creatures Inc., GAME FREAK Inc., or Pokémon TCG Live.
      </p>
    </div>
  </div>
</DialogContent>


            </Dialog>

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="relative w-10 h-10 rounded-none transition-transform duration-200 hover:scale-110 hover:bg-transparent border-none shadow-none"
            >
              <img
                src={!darkMode ? "/Solrock.png" : "/Lunatone.png"}
                alt={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                className="w-full h-full object-contain bg-transparent hover:opacity-70 hover:border-transparent opacity-60 mascot-bob"
              />
            </Button>
          </div>
        </div>
      </header>
    </div>
    
  )
}
