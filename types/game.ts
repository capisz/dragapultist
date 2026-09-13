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
  winnerPrizePath?: string[]
  userArchetype?: string | null
  opponentArchetype?: string | null
  favorite?: boolean
  turnCount?: number
  notes?: Record<number, string>
  deckList?: string
  deckName?: string
  revision?: number
  schemaVersion?: number
  parserVersion?: number
  noteCount?: number
  hasDeck?: boolean
}

export interface GameTurn {
  turnNumber: number
  userActions: string[]
  opponentActions: string[]
}
