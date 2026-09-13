export function keepGamesUntilImportAcknowledged<T extends { id: string }>(games: T[]): T[] {
  return games
}

export function mergeAcknowledgedGame<T extends { id: string }>(games: T[], attemptedId: string, canonical: T): T[] {
  return [...games.filter(game => game.id !== attemptedId && game.id !== canonical.id), canonical]
}
