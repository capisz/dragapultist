import {
  publicDeckBreakdownResponseSchema,
  publicPlayerResultsSchema,
  type PublicDeckBreakdown,
  type PublicPlayerSummary,
} from "@/lib/player-contract"

// Compatibility exports for the existing presentation. These strict schemas
// reject any accidental private fields instead of silently rendering them.
export const playerResults = publicPlayerResultsSchema
export const playerBreakdown = publicDeckBreakdownResponseSchema
export type PublicPlayer = PublicPlayerSummary
export type PublicBreakdown = PublicDeckBreakdown
