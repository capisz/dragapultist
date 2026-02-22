"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { DeckStat } from "./types"

interface CardStatisticsProps {
  deck: DeckStat
}

const panelClass =
  "rounded-2xl border border-slate-200/60 bg-white/50 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-slate-700/40 dark:bg-[#1b3048]/55 dark:shadow-[0_16px_38px_rgba(0,0,0,0.22)]"
const metricClass = "rounded-xl bg-white/70 px-3 py-2 dark:bg-[#243d58]/55"
const tableHeaderRowClass = "border-slate-200/70 dark:border-slate-600/45"
const tableHeadClass = "h-10 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700/90 dark:text-slate-200"
const tableRowClass = "border-slate-200/65 hover:bg-slate-100/65 dark:border-slate-600/40 dark:hover:bg-white/[0.05]"
const filterInputClass =
  "h-9 pl-8 bg-slate-100/90 text-gray-900 placeholder:text-slate-400 border border-slate-300 shadow-[0_0_22px_rgba(42,81,128,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/70 focus-visible:ring-offset-0 dark:bg-slate-500/70 dark:text-slate-100 dark:placeholder:text-slate-300/90 dark:border-slate-600 dark:shadow-[0_0_32px_rgba(56,189,248,0.1)] dark:focus-visible:ring-slate-300"

export function CardStatistics({ deck }: CardStatisticsProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredPokemon = useMemo(
    () =>
      deck.pokemonStats.filter((pokemon) =>
        pokemon.name.toLowerCase().includes(searchTerm.trim().toLowerCase()),
      ),
    [deck.pokemonStats, searchTerm],
  )

  return (
    <div className="space-y-4">
      <div className={panelClass}>
        <h3 className="text-lg font-semibold tracking-tight text-slate-700/90 dark:text-sky-100">{deck.label}</h3>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div className={metricClass}>
            <p className="text-xs uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300/75">Games</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{deck.games}</p>
          </div>
          <div className={metricClass}>
            <p className="text-xs uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300/75">Record</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
              {deck.wins}-{deck.losses}
            </p>
          </div>
          <div className={metricClass}>
            <p className="text-xs uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300/75">Win Rate</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{deck.winRate.toFixed(1)}%</p>
          </div>
          <div className={metricClass}>
            <p className="text-xs uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300/75">Avg Turns</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{deck.avgTurns.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <h4 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300/80">
          Matchup Data
        </h4>
        {deck.matchupStats.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300/80">No matchup data recorded for this deck yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className={tableHeaderRowClass}>
                <TableHead className={tableHeadClass}>Opponent Deck</TableHead>
                <TableHead className={`${tableHeadClass} text-right`}>Games</TableHead>
                <TableHead className={`${tableHeadClass} text-right`}>Record</TableHead>
                <TableHead className={`${tableHeadClass} text-right`}>WR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deck.matchupStats.map((matchup) => (
                <TableRow key={matchup.opponentArchetypeId ?? "unknown"} className={tableRowClass}>
                  <TableCell className="font-medium">{matchup.opponentLabel}</TableCell>
                  <TableCell className="text-right tabular-nums">{matchup.games}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {matchup.wins}-{matchup.losses}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{matchup.winRate.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className={panelClass}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300/80">
            Individual Pokemon Data
          </h4>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Filter pokemon..."
              className={filterInputClass}
            />
          </div>
        </div>

        {filteredPokemon.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300/80">
            {searchTerm ? "No pokemon matched your search." : "No pokemon usage data available for this deck."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className={tableHeaderRowClass}>
                <TableHead className={tableHeadClass}>Pokemon</TableHead>
                <TableHead className={`${tableHeadClass} text-right`}>Games</TableHead>
                <TableHead className={`${tableHeadClass} text-right`}>Record</TableHead>
                <TableHead className={`${tableHeadClass} text-right`}>WR</TableHead>
                <TableHead className={`${tableHeadClass} text-right`}>As Main</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPokemon.map((pokemon) => (
                <TableRow key={pokemon.name} className={tableRowClass}>
                  <TableCell className="font-medium">{pokemon.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{pokemon.games}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {pokemon.wins}-{pokemon.losses}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{pokemon.winRate.toFixed(1)}%</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {pokemon.mainGames} ({pokemon.mainWinRate.toFixed(1)}%)
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
