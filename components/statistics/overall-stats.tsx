"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { DeckStat, MatchupStat, OpponentStat, OverallStatsModel } from "./types"

interface OverallStatsProps {
  stats: OverallStatsModel
  decks: DeckStat[]
  matchups: MatchupStat[]
  opponents: OpponentStat[]
}

const metricPanelClass =
  "rounded-2xl border border-slate-200/60 bg-white/50 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-slate-700/40 dark:bg-[#1b3048]/55 dark:shadow-[0_16px_38px_rgba(0,0,0,0.22)]"
const tablePanelClass =
  "rounded-2xl border border-slate-200/60 bg-white/50 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-slate-700/40 dark:bg-[#1b3048]/55 dark:shadow-[0_16px_38px_rgba(0,0,0,0.22)]"
const tableHeaderRowClass = "border-slate-200/70 dark:border-slate-600/45"
const tableHeadClass = "h-10 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700/90 dark:text-slate-200"
const tableRowClass = "border-slate-200/65 hover:bg-slate-100/65 dark:border-slate-600/40 dark:hover:bg-white/[0.05]"

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper?: string
}) {
  return (
    <Card className={metricPanelClass}>
      <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600/90 dark:text-slate-300/85">
            {label}
          </CardTitle>
        </CardHeader>
        <CardContent>
        <div className="text-2xl font-semibold text-slate-700/90 dark:text-sky-100">{value}</div>
        {helper ? <p className="mt-1 text-xs text-slate-600 dark:text-slate-300/80">{helper}</p> : null}
      </CardContent>
    </Card>
  )
}

export function OverallStats({ stats, decks, matchups, opponents }: OverallStatsProps) {
  const topDecks = decks.slice(0, 5)
  const topMatchups = matchups.slice(0, 8)
  const topOpponents = opponents.slice(0, 8)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Games" value={String(stats.totalGames)} />
        <MetricCard label="Overall Win Rate" value={`${stats.winRate.toFixed(1)}%`} helper={`${stats.wins}-${stats.losses}`} />
        <MetricCard
          label="First Turn Win Rate"
          value={`${stats.firstTurnWinRate.toFixed(1)}%`}
          helper={`${stats.firstTurnWins}/${stats.firstTurnGames} games`}
        />
        <MetricCard label="Average Turns" value={stats.avgTurns.toFixed(2)} />
        <MetricCard label="Avg Damage Dealt" value={stats.avgDamageDealt.toFixed(1)} />
        <MetricCard label="Avg Prizes Taken" value={stats.avgUserPrizes.toFixed(2)} />
        <MetricCard label="Avg Prizes Given" value={stats.avgOpponentPrizes.toFixed(2)} />
        <MetricCard label="Best Archetype (3+)" value={stats.mostSuccessfulDeck} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className={tablePanelClass}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-slate-700/85 dark:text-sky-100">Top Decks</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {topDecks.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300/80">No deck data yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className={tableHeaderRowClass}>
                    <TableHead className={tableHeadClass}>Deck</TableHead>
                    <TableHead className={`${tableHeadClass} text-right`}>Games</TableHead>
                    <TableHead className={`${tableHeadClass} text-right`}>WR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topDecks.map((deck) => (
                    <TableRow key={deck.key} className={tableRowClass}>
                      <TableCell className="font-medium">{deck.label}</TableCell>
                      <TableCell className="text-right tabular-nums">{deck.games}</TableCell>
                      <TableCell className="text-right tabular-nums">{deck.winRate.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className={tablePanelClass}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-slate-700/85 dark:text-sky-100">Top Matchups Faced</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {topMatchups.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300/80">No matchup data yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className={tableHeaderRowClass}>
                    <TableHead className={tableHeadClass}>Opponent Deck</TableHead>
                    <TableHead className={`${tableHeadClass} text-right`}>Games</TableHead>
                    <TableHead className={`${tableHeadClass} text-right`}>WR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topMatchups.map((matchup) => (
                    <TableRow key={matchup.opponentArchetypeId ?? "unknown"} className={tableRowClass}>
                      <TableCell className="font-medium">{matchup.opponentLabel}</TableCell>
                      <TableCell className="text-right tabular-nums">{matchup.games}</TableCell>
                      <TableCell className="text-right tabular-nums">{matchup.winRate.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className={tablePanelClass}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-slate-700/85 dark:text-sky-100">Most Frequent Opponents</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {topOpponents.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300/80">No opponent data yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className={tableHeaderRowClass}>
                    <TableHead className={tableHeadClass}>Opponent</TableHead>
                    <TableHead className={`${tableHeadClass} text-right`}>Games</TableHead>
                    <TableHead className={`${tableHeadClass} text-right`}>WR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topOpponents.map((opponent) => (
                    <TableRow key={opponent.name.toLowerCase()} className={tableRowClass}>
                      <TableCell className="font-medium">{opponent.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{opponent.games}</TableCell>
                      <TableCell className="text-right tabular-nums">{opponent.winRate.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
