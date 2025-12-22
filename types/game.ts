export interface GameSummary {
  id: string
  date: string
  username: string
  opponent: string
  userMainAttacker: string
  opponentMainAttacker: string
  userOtherPokemon: string[]
  opponentOtherPokemon: string[]
  turns: number
  userWon: boolean
  damageDealt: number
  userPrizeCardsTaken: number
  opponentPrizeCardsTaken: number
  rawLog: string
  wentFirst: boolean
  userConceded: boolean
  opponentConceded: boolean
  tags?: { text: string; color: string }[]
  userAceSpecs?: string[]
  opponentAceSpecs?: string[]
  highDamageAttackCount: number
  benchKnockouts: number
  totalBenchedPokemon: number
  weaknessBonus: boolean
  actionPackedTurns: { user: number; opponent: number }
  winnerPrizePath?: string[]            // e.g. ["Wellspring Mask Ogerpon ex", "Mew ex", ...]
  userArchetype?: string | null         // archetype id (e.g. "raging-bolt-ogerpon")
  opponentArchetype?: string | null     // archetype id
}
