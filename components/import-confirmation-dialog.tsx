// components/import-confirmation-dialog.tsx
"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeftRight } from "lucide-react"
import { ARCHETYPE_RULES } from "@/utils/archetype-mapping"

interface ImportConfirmationDialogProps {
  open: boolean
  onConfirm: (
    swapPlayers: boolean,
    userArchetypeId?: string | null,
    opponentArchetypeId?: string | null,
  ) => void
  onCancel: () => void
  gameData: {
    username: string
    opponent: string
    suggestedUserArchetype?: string | null
    suggestedOpponentArchetype?: string | null
  }

  // Optional overrides (so GameDetail can reuse the same UI)
  title?: string
  confirmLabel?: string
  description?: string
}

const UNKNOWN_ARCHETYPE = "__unknown__"

export function ImportConfirmationDialog({
  open,
  onConfirm,
  onCancel,
  gameData,
  title = "Confirm Players & Deck Archetypes",
  confirmLabel = "Import game",
  description = "We detected the players below from the log. If needed, you can swap them and assign deck archetypes for this game.",
}: ImportConfirmationDialogProps) {
  const [swapPlayers, setSwapPlayers] = useState(false)
  const [userArchetypeId, setUserArchetypeId] = useState<string>(UNKNOWN_ARCHETYPE)
  const [opponentArchetypeId, setOpponentArchetypeId] = useState<string>(UNKNOWN_ARCHETYPE)

  useEffect(() => {
    if (!open) return
    setSwapPlayers(false)
    setUserArchetypeId(gameData.suggestedUserArchetype ?? UNKNOWN_ARCHETYPE)
    setOpponentArchetypeId(gameData.suggestedOpponentArchetype ?? UNKNOWN_ARCHETYPE)
  }, [open, gameData])

  const handleConfirm = () => {
    onConfirm(
      swapPlayers,
      userArchetypeId === UNKNOWN_ARCHETYPE ? null : userArchetypeId,
      opponentArchetypeId === UNKNOWN_ARCHETYPE ? null : opponentArchetypeId,
    )
    setSwapPlayers(false)
  }

  const handleCancel = () => {
    onCancel()
    setSwapPlayers(false)
  }

  const displayUsername = swapPlayers ? gameData.opponent : gameData.username
  const displayOpponentName = swapPlayers ? gameData.username : gameData.opponent

  const handleSwapPlayers = () => {
    setSwapPlayers((prev) => !prev)
    // swap current dropdown selections (do NOT reset to suggestions)
    const a = userArchetypeId
    const b = opponentArchetypeId
    setUserArchetypeId(b)
    setOpponentArchetypeId(a)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleCancel()
      }}
    >
      <DialogContent className="sm:max-w-[520px] bg-white dark:bg-slate-900">
        <DialogHeader>
  <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-50">
    {title}
  </DialogTitle>
  <DialogDescription className="text-sm text-slate-700 dark:text-slate-300">
    {description}
  </DialogDescription>
</DialogHeader>

        <div className="space-y-6">

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60 p-4 space-y-4">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-sm">
  {/* Left: You */}
  <div>
    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      You
    </div>
    <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-50">
      {displayUsername || "Unknown"}
    </div>
  </div>

  {/* Center: Swap */}
  <div className="flex justify-center">
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleSwapPlayers}
      className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-50 dark:border-slate-600"
    >
      <ArrowLeftRight className="h-4 w-4" />
      Swap players
    </Button>
  </div>

  {/* Right: Opponent */}
  <div className="text-right">
    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      Opponent
    </div>
    <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-50">
      {displayOpponentName || "Unknown"}
    </div>
  </div>
</div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-700 mt-3">
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Your deck archetype
                </div>
                <Select value={userArchetypeId} onValueChange={(value) => setUserArchetypeId(value)}>
                  <SelectTrigger className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 border-slate-300 dark:border-slate-600">
                    <SelectValue placeholder="Select your archetype" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNKNOWN_ARCHETYPE}>Not set / Unknown</SelectItem>
                    {ARCHETYPE_RULES.map((rule) => (
                      <SelectItem key={rule.id} value={rule.id}>
                        {rule.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Opponent&apos;s archetype
                </div>
                <Select value={opponentArchetypeId} onValueChange={(value) => setOpponentArchetypeId(value)}>
                  <SelectTrigger className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 border-slate-300 dark:border-slate-600">
                    <SelectValue placeholder="Select opponent archetype" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNKNOWN_ARCHETYPE}>Not set / Unknown</SelectItem>
                    {ARCHETYPE_RULES.map((rule) => (
                      <SelectItem key={rule.id} value={rule.id}>
                        {rule.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {swapPlayers && (
            <div className="rounded-lg border border-sky-300/70 bg-sky-50 dark:bg-sky-900/20 dark:border-sky-600/60 px-3 py-2">
              <p className="text-xs text-sky-900 dark:text-sky-100">
                Players will be swapped when saved.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-50"
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} className="bg-sky-500 hover:bg-sky-600 text-white">
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
