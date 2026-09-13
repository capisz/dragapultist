import { z } from "zod"

const count = z.number().int().nonnegative().finite()
const rate = z.number().min(0).max(100).finite()
const archetype = z.string().max(200).nullable()

export const publicDeckSummarySchema = z.object({ archetypeId: archetype, games: count, wins: count, winRate: rate }).strict()
export const publicPlayerSummarySchema = z.object({
  username: z.string().min(1).max(200),
  totalGames: count,
  wins: count,
  losses: count,
  winRate: rate,
  lastPlayed: z.string().max(100).nullable(),
  decks: z.array(z.string().max(200)).max(60).default([]),
  deckStats: z.array(publicDeckSummarySchema).max(60).default([]),
}).strict()
export const publicPlayerResultsSchema = z.object({ players: z.array(publicPlayerSummarySchema).max(25) }).strict()
export const publicDeckBreakdownSchema = z.object({
  archetypeId: archetype,
  games: count,
  wins: count,
  losses: count,
  winRate: rate,
  matchups: z.array(z.object({ opponentArchetypeId: archetype, games: count, wins: count, winRate: rate }).strict()).max(100),
}).strict()
export const publicDeckBreakdownResponseSchema = z.object({ breakdown: publicDeckBreakdownSchema.nullable() }).strict()

export type PublicPlayerSummary = z.infer<typeof publicPlayerSummarySchema>
export type PublicDeckBreakdown = z.infer<typeof publicDeckBreakdownSchema>

