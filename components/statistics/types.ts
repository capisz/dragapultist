export interface MatchupStat {
  opponentArchetypeId: string | null
  opponentLabel: string
  games: number
  wins: number
  losses: number
  winRate: number
}

export interface PokemonStat {
  name: string
  games: number
  wins: number
  losses: number
  winRate: number
  mainGames: number
  mainWins: number
  mainWinRate: number
}

export interface DeckStat {
  key: string
  archetypeId: string | null
  label: string
  games: number
  wins: number
  losses: number
  winRate: number
  firstTurnWinRate: number
  avgTurns: number
  matchupStats: MatchupStat[]
  pokemonStats: PokemonStat[]
}

export interface OpponentStat {
  name: string
  games: number
  wins: number
  losses: number
  winRate: number
}

export interface OverallStatsModel {
  totalGames: number
  wins: number
  losses: number
  winRate: number
  firstTurnGames: number
  firstTurnWins: number
  firstTurnWinRate: number
  avgTurns: number
  avgDamageDealt: number
  avgUserPrizes: number
  avgOpponentPrizes: number
  mostPlayedDeck: string
  mostSuccessfulDeck: string
}

export interface NormalizedGame {
  id: string
  dateLabel: string
  timestamp: number
  opponent: string
  userWon: boolean
  wentFirst: boolean
  turns: number
  damageDealt: number
  userPrizeCardsTaken: number
  opponentPrizeCardsTaken: number
  userMainAttacker: string
  userOtherPokemon: string[]
  opponentMainAttacker: string
  opponentOtherPokemon: string[]
  userArchetypeId: string | null
  opponentArchetypeId: string | null
}

export interface StatisticsModel {
  games: NormalizedGame[]
  overall: OverallStatsModel
  decks: DeckStat[]
  overallMatchups: MatchupStat[]
  opponentStats: OpponentStat[]
  globalPokemonStats: PokemonStat[]
}
