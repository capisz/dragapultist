"use client"

import { useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { getArchetypeIconCandidatePaths } from "@/utils/archetype-mapping"
import type { DeckStat } from "./types"

const FALLBACK_ICON = "/sprites/substitute.png"

function CandidateSprite({
  candidates,
  alt,
  size = 22,
}: {
  candidates: string[]
  alt: string
  size?: number
}) {
  const [idx, setIdx] = useState(0)
  const src = candidates[Math.min(idx, candidates.length - 1)] ?? FALLBACK_ICON

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="rounded-full border border-slate-200 bg-white/80 object-cover dark:border-slate-600 dark:bg-slate-900/70"
      onError={() => setIdx((prev) => (prev < candidates.length - 1 ? prev + 1 : prev))}
      unoptimized
    />
  )
}

function ArchetypeIconPair({ archetypeId }: { archetypeId: string | null }) {
  const slots = getArchetypeIconCandidatePaths(archetypeId)
  const slotA = slots?.[0]?.length ? slots[0] : [FALLBACK_ICON]
  const slotB = slots?.[1]?.length ? slots[1] : []

  return (
    <span className="inline-flex items-center">
      <CandidateSprite candidates={slotA} alt="Deck icon A" />
      {slotB.length > 0 ? (
        <span className="-ml-1.5">
          <CandidateSprite candidates={slotB} alt="Deck icon B" />
        </span>
      ) : null}
    </span>
  )
}

interface DeckListProps {
  decks: DeckStat[]
  selectedDeckKey: string | null
  onSelectDeck: (deckKey: string) => void
}

export function DeckList({ decks, selectedDeckKey, onSelectDeck }: DeckListProps) {
  if (decks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300/80 bg-white/45 px-4 py-10 text-center text-sm text-slate-600 dark:border-slate-600/55 dark:bg-[#1b3048]/45 dark:text-slate-300/85">
        No deck archetypes found for your saved games yet.
      </div>
    )
  }

  return (
    <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
      {decks.map((deck, index) => {
        const selected = selectedDeckKey === deck.key
        return (
          <button
            key={deck.key}
            type="button"
            onClick={() => onSelectDeck(deck.key)}
            className={cn(
              "w-full rounded-2xl border px-3 py-3 text-left transition-colors",
              selected
                ? "border-[#5e82ab]/45 bg-[#dce9f7]/80 text-[#2b486b] dark:border-sky-100/45 dark:bg-[#355273]/70 dark:text-sky-100"
                : cn(
                    "border-slate-200/70 text-slate-800 hover:bg-slate-100/70 dark:border-slate-600/40 dark:text-slate-200 dark:hover:bg-[#213851]/60",
                    index % 2 === 0 ? "bg-white/50 dark:bg-[#1b3048]/45" : "bg-slate-50/65 dark:bg-[#213851]/60",
                  ),
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <ArchetypeIconPair archetypeId={deck.archetypeId} />
                <span className="truncate text-sm font-semibold">{deck.label}</span>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                  deck.winRate >= 50
                    ? "bg-sky-100 text-sky-700 dark:bg-sky-900/45 dark:text-sky-100"
                    : "bg-slate-200/90 text-slate-700 dark:bg-slate-600/75 dark:text-slate-200",
                )}
              >
                {deck.winRate.toFixed(1)}%
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300/80">
              <span className="tabular-nums">
                {deck.wins}-{deck.losses}
              </span>
              <span className="tabular-nums">{deck.games} games</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
