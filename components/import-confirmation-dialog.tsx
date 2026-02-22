// components/import-confirmation-dialog.tsx
"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ArrowLeftRight, Check } from "lucide-react"
import {
  ARCHETYPE_RULES,
  buildCustomArchetypeId,
  formatArchetypeLabel,
  formatPokemonSpriteLabel,
  isCustomArchetypeId,
  parseCustomArchetypeId,
} from "@/utils/archetype-mapping"

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
type Side = "user" | "opponent"

type PokemonSpriteOption = {
  id: string
  label: string
}

type CustomArchetypeBuilderState = {
  open: boolean
  firstQuery: string
  firstPokemonId: string | null
  includeSecondPokemon: boolean
  secondQuery: string
  secondPokemonId: string | null
}

const EMPTY_CUSTOM_BUILDER: CustomArchetypeBuilderState = {
  open: false,
  firstQuery: "",
  firstPokemonId: null,
  includeSecondPokemon: false,
  secondQuery: "",
  secondPokemonId: null,
}

function normalizeSearchQuery(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
}

function buildInitialCustomBuilderState(archetypeId?: string | null): CustomArchetypeBuilderState {
  const parsed = parseCustomArchetypeId(archetypeId)
  if (!parsed) return { ...EMPTY_CUSTOM_BUILDER }

  return {
    open: false,
    firstQuery: "",
    firstPokemonId: parsed.firstPokemonId,
    includeSecondPokemon: !!parsed.secondPokemonId,
    secondQuery: "",
    secondPokemonId: parsed.secondPokemonId ?? null,
  }
}

function PokemonSearchField({
  label,
  query,
  onQueryChange,
  selectedPokemonId,
  onSelectPokemon,
  excludedPokemonId,
}: {
  label: string
  query: string
  onQueryChange: (value: string) => void
  selectedPokemonId: string | null
  onSelectPokemon: (pokemonId: string) => void
  excludedPokemonId?: string | null
}) {
  const [suggestions, setSuggestions] = useState<PokemonSpriteOption[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const normalizedQuery = normalizeSearchQuery(query)

  useEffect(() => {
    if (!normalizedQuery) {
      setSuggestions([])
      setLoading(false)
      setLoadError(null)
      return
    }

    const abortController = new AbortController()
    const timer = window.setTimeout(() => {
      const load = async () => {
        setLoading(true)
        setLoadError(null)
        try {
          const params = new URLSearchParams()
          params.set("query", normalizedQuery)
          params.set("limit", "24")
          if (excludedPokemonId) params.set("exclude", excludedPokemonId)

          const response = await fetch(`/api/pokemon-sprites?${params.toString()}`, {
            signal: abortController.signal,
          })
          const payload = (await response.json().catch(() => null)) as { pokemon?: PokemonSpriteOption[] } | null
          if (!response.ok) throw new Error("Could not load pokemon list.")
          setSuggestions(Array.isArray(payload?.pokemon) ? payload!.pokemon : [])
        } catch (err) {
          if (abortController.signal.aborted) return
          setSuggestions([])
          setLoadError(err instanceof Error ? err.message : "Could not load pokemon list.")
        } finally {
          if (!abortController.signal.aborted) setLoading(false)
        }
      }

      void load()
    }, 180)

    return () => {
      window.clearTimeout(timer)
      abortController.abort()
    }
  }, [normalizedQuery, excludedPokemonId])

  const handleSelectSuggestion = (option: PokemonSpriteOption) => {
    onSelectPokemon(option.id)
    onQueryChange(option.label)
    setSuggestions([])
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <Input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || suggestions.length === 0) return
          event.preventDefault()
          handleSelectSuggestion(suggestions[0])
        }}
        placeholder="Search pokemon sprite..."
        className="h-9 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 border-slate-300 dark:border-slate-600"
      />

      <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white/90 dark:border-slate-700 dark:bg-slate-900/65">
        {loading ? (
          <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">Searching...</p>
        ) : loadError ? (
          <p className="px-3 py-2 text-xs text-rose-600 dark:text-rose-300">{loadError}</p>
        ) : !normalizedQuery ? (
          <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">Start typing to see autocomplete suggestions.</p>
        ) : suggestions.length === 0 ? (
          <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">No pokemon matched your search.</p>
        ) : (
          suggestions.map((option) => {
            const selected = selectedPokemonId === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelectSuggestion(option)}
                className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm transition-colors ${
                  selected
                    ? "bg-sky-100 text-sky-900 dark:bg-sky-900/35 dark:text-sky-100"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200"
                }`}
              >
                <img
                  src={`/sprites/${option.id}.png`}
                  alt={option.label}
                  className="h-5 w-5 rounded-sm object-contain"
                  onError={(event) => {
                    event.currentTarget.src = "/sprites/substitute.png"
                  }}
                />
                <span className="truncate">{option.label}</span>
                {selected ? <Check className="ml-auto h-3.5 w-3.5" /> : null}
              </button>
            )
          })
        )}
      </div>

      {selectedPokemonId ? (
        <p className="text-[11px] text-slate-600 dark:text-slate-300">
          Selected: <span className="font-semibold">{formatPokemonSpriteLabel(selectedPokemonId)}</span>
        </p>
      ) : null}
    </div>
  )
}

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
  const [userCustomBuilder, setUserCustomBuilder] = useState<CustomArchetypeBuilderState>({ ...EMPTY_CUSTOM_BUILDER })
  const [opponentCustomBuilder, setOpponentCustomBuilder] = useState<CustomArchetypeBuilderState>({
    ...EMPTY_CUSTOM_BUILDER,
  })

  useEffect(() => {
    if (!open) return
    setSwapPlayers(false)
    const nextUserArchetypeId = gameData.suggestedUserArchetype ?? UNKNOWN_ARCHETYPE
    const nextOpponentArchetypeId = gameData.suggestedOpponentArchetype ?? UNKNOWN_ARCHETYPE

    setUserArchetypeId(nextUserArchetypeId)
    setOpponentArchetypeId(nextOpponentArchetypeId)
    setUserCustomBuilder(
      buildInitialCustomBuilderState(nextUserArchetypeId === UNKNOWN_ARCHETYPE ? null : nextUserArchetypeId),
    )
    setOpponentCustomBuilder(
      buildInitialCustomBuilderState(nextOpponentArchetypeId === UNKNOWN_ARCHETYPE ? null : nextOpponentArchetypeId),
    )
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
    const userBuilder = userCustomBuilder
    const opponentBuilder = opponentCustomBuilder
    setUserArchetypeId(b)
    setOpponentArchetypeId(a)
    setUserCustomBuilder(opponentBuilder)
    setOpponentCustomBuilder(userBuilder)
  }

  const archetypeValueForSide = (side: Side): string => (side === "user" ? userArchetypeId : opponentArchetypeId)

  const setArchetypeValueForSide = (side: Side, value: string) => {
    if (side === "user") setUserArchetypeId(value)
    else setOpponentArchetypeId(value)
  }

  const customBuilderForSide = (side: Side): CustomArchetypeBuilderState =>
    side === "user" ? userCustomBuilder : opponentCustomBuilder

  const setCustomBuilderForSide = (
    side: Side,
    updater: (previous: CustomArchetypeBuilderState) => CustomArchetypeBuilderState,
  ) => {
    if (side === "user") {
      setUserCustomBuilder(updater)
    } else {
      setOpponentCustomBuilder(updater)
    }
  }

  const openCustomBuilder = (side: Side) => {
    const selectedArchetypeId = archetypeValueForSide(side)
    const parsed = parseCustomArchetypeId(selectedArchetypeId === UNKNOWN_ARCHETYPE ? null : selectedArchetypeId)

    setCustomBuilderForSide(side, (previous) => ({
      ...previous,
      open: true,
      firstPokemonId: parsed?.firstPokemonId ?? previous.firstPokemonId,
      includeSecondPokemon: parsed?.secondPokemonId ? true : previous.includeSecondPokemon,
      secondPokemonId: parsed?.secondPokemonId ?? previous.secondPokemonId,
    }))
  }

  const closeCustomBuilder = (side: Side) => {
    setCustomBuilderForSide(side, (previous) => ({ ...previous, open: false }))
  }

  const applyCustomBuilder = (side: Side) => {
    const builder = customBuilderForSide(side)
    const customId = buildCustomArchetypeId(
      builder.firstPokemonId ?? "",
      builder.includeSecondPokemon ? builder.secondPokemonId : null,
    )
    if (!customId) return

    setArchetypeValueForSide(side, customId)
    setCustomBuilderForSide(side, (previous) => ({
      ...previous,
      open: false,
      firstQuery: "",
      secondQuery: "",
    }))
  }

  const renderArchetypeControls = (side: Side, label: string) => {
    const value = archetypeValueForSide(side)
    const builder = customBuilderForSide(side)
    const isCustomSelected = isCustomArchetypeId(value === UNKNOWN_ARCHETYPE ? null : value)

    return (
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
        <Select
          value={value}
          onValueChange={(nextValue) => {
            setArchetypeValueForSide(side, nextValue)
            if (!isCustomArchetypeId(nextValue)) {
              closeCustomBuilder(side)
            }
          }}
        >
          <SelectTrigger className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 border-slate-300 dark:border-slate-600">
            <SelectValue placeholder="Select archetype" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNKNOWN_ARCHETYPE}>Not set / Unknown</SelectItem>
            {ARCHETYPE_RULES.map((rule) => (
              <SelectItem key={rule.id} value={rule.id}>
                {rule.label}
              </SelectItem>
            ))}
            {isCustomSelected ? (
              <SelectItem value={value}>Custom: {formatArchetypeLabel(value)}</SelectItem>
            ) : null}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => openCustomBuilder(side)}
            className="h-8 px-3 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-50 dark:border-slate-600"
          >
            {isCustomSelected ? "Edit custom archetype" : "Add custom archetype"}
          </Button>
          {isCustomSelected ? (
            <span className="text-[11px] text-slate-600 dark:text-slate-300">
              Using: <span className="font-semibold">{formatArchetypeLabel(value)}</span>
            </span>
          ) : null}
        </div>

        {builder.open ? (
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/65">
            <PokemonSearchField
              label="First pokemon"
              query={builder.firstQuery}
              onQueryChange={(nextQuery) =>
                setCustomBuilderForSide(side, (previous) => ({
                  ...previous,
                  firstQuery: nextQuery,
                }))
              }
              selectedPokemonId={builder.firstPokemonId}
              onSelectPokemon={(pokemonId) =>
                setCustomBuilderForSide(side, (previous) => ({
                  ...previous,
                  firstPokemonId: pokemonId,
                }))
              }
            />

            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setCustomBuilderForSide(side, (previous) => ({
                    ...previous,
                    includeSecondPokemon: !previous.includeSecondPokemon,
                    secondPokemonId: !previous.includeSecondPokemon ? previous.secondPokemonId : null,
                    secondQuery: !previous.includeSecondPokemon ? previous.secondQuery : "",
                  }))
                }
                className="h-8 px-3 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-50 dark:border-slate-600"
              >
                {builder.includeSecondPokemon ? "Remove second pokemon" : "Add second pokemon"}
              </Button>

              {builder.includeSecondPokemon ? (
                <PokemonSearchField
                  label="Second pokemon (optional)"
                  query={builder.secondQuery}
                  onQueryChange={(nextQuery) =>
                    setCustomBuilderForSide(side, (previous) => ({
                      ...previous,
                      secondQuery: nextQuery,
                    }))
                  }
                  selectedPokemonId={builder.secondPokemonId}
                  onSelectPokemon={(pokemonId) =>
                    setCustomBuilderForSide(side, (previous) => ({
                      ...previous,
                      secondPokemonId: pokemonId,
                    }))
                  }
                  excludedPokemonId={builder.firstPokemonId}
                />
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                type="button"
                onClick={() => applyCustomBuilder(side)}
                disabled={!builder.firstPokemonId}
                className="h-8 px-3 text-xs bg-[#5e82ab] text-slate-50 hover:bg-sky-800/50 dark:bg-[#b1cce8] dark:text-[#121212] dark:hover:bg-[#a1c2e4]"
              >
                Use custom archetype
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => closeCustomBuilder(side)}
                className="h-8 px-3 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-50 dark:border-slate-600"
              >
                Close builder
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    )
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
              {renderArchetypeControls("user", "Your deck archetype")}
              {renderArchetypeControls("opponent", "Opponent's archetype")}
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
