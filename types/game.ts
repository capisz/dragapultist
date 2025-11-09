export interface GameSummary {
  id: string
  date: string
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
}

export interface GameTurn {
  turnNumber: number
  userActions: string[]
  opponentActions: string[]
}
